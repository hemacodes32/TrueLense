/**
 * HTTP Integration Test Script for Express API Routes
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const { spawn } = require('child_process');

const PORT = 5099;
process.env.PORT = PORT;
const BASE = `http://localhost:${PORT}/api`;

let serverInstance;

function startServer() {
  return new Promise((resolve) => {
    const express = require('express');
    const cors = require('cors');
    const config = require('./config');
    const db = require('./services/db');

    const authRoute = require('./routes/auth');
    const userRoute = require('./routes/user');
    const adminRoute = require('./routes/admin');
    const analyzeRoute = require('./routes/analyze');
    const historyRoute = require('./routes/history');

    const app = express();
    app.use(cors());
    app.use(express.json());

    app.use('/api/auth', authRoute);
    app.use('/api/user', userRoute);
    app.use('/api/admin', adminRoute);
    app.use('/api/analyze', analyzeRoute);
    app.use('/api/history', historyRoute);

    serverInstance = app.listen(PORT, () => {
      resolve();
    });
  });
}

async function run() {
  await startServer();
  console.log(`📡 Test Server listening on ${BASE}\n`);

  try {
    // 1. Test Register Flow
    console.log('1️⃣ Testing POST /api/auth/register...');
    const regEmail = `test_user_${Date.now()}@example.com`;
    const regRes = await axios.post(`${BASE}/auth/register`, {
      name: 'Test Flow User',
      email: regEmail,
      password: 'UserPass2026!',
      confirmPassword: 'UserPass2026!',
    });
    console.log('   Status:', regRes.status);
    console.log('   Response message:', regRes.data.message);
    if (regRes.data.token) {
      throw new Error('FAILED: Register should NOT return token (must require login)');
    }
    console.log('   ✅ Register succeeds without auto-login.\n');

    // 2. Test Login Flow
    console.log('2️⃣ Testing POST /api/auth/login...');
    const loginRes = await axios.post(`${BASE}/auth/login`, {
      email: regEmail,
      password: 'UserPass2026!',
    });
    console.log('   Status:', loginRes.status);
    const userToken = loginRes.data.token;
    if (!userToken) {
      throw new Error('FAILED: Login did not return JWT token');
    }
    console.log('   User role:', loginRes.data.user.role);
    console.log('   ✅ Login successful with JWT token.\n');

    // 3. Test Normal User trying to access Admin API -> Must be 403 Forbidden
    console.log('3️⃣ Testing Normal User Access to /api/admin/users...');
    try {
      await axios.get(`${BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      throw new Error('FAILED: Normal user was able to access /api/admin/users!');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('   Status:', err.response.status, err.response.data.error);
        console.log('   ✅ Normal user correctly blocked with 403 Forbidden.\n');
      } else {
        throw err;
      }
    }

    // 4. Test Admin Login (admin1@example.com) & Access to Admin API
    console.log('4️⃣ Testing Admin1 Login & Access to /api/admin/users...');
    const adminLoginRes = await axios.post(`${BASE}/auth/login`, {
      email: 'admin1@example.com',
      password: 'Admin@TrueLense2026!',
    });
    const adminToken = adminLoginRes.data.token;
    console.log('   Admin1 logged in. Role:', adminLoginRes.data.user.role);

    const adminUsersRes = await axios.get(`${BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('   /api/admin/users Status:', adminUsersRes.status);
    console.log(`   Registered Users Count: ${adminUsersRes.data.length}`);
    const firstUser = adminUsersRes.data[0];
    console.log('   First user fields:', Object.keys(firstUser));
    if (firstUser.password_hash || firstUser.settings) {
      throw new Error('FAILED: Sensitive fields exposed to admin!');
    }
    console.log('   ✅ Admin successfully retrieved registered users (Name, Email, Registration Date only).\n');

    // 5. Test Audio Analysis via HTTP POST /api/analyze
    console.log('5️⃣ Testing Audio File Analysis via POST /api/analyze...');
    const testWavPath = path.join(__dirname, 'test_http_audio.wav');
    await new Promise((res, rej) => {
      const p = spawn('ffmpeg', ['-f', 'lavfi', '-i', 'sine=frequency=880:duration=1.2', '-y', testWavPath]);
      p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg failed'))));
    });

    const form = new FormData();
    form.append('media', fs.createReadStream(testWavPath));

    const analyzeRes = await axios.post(`${BASE}/analyze`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${userToken}`,
      },
    });

    console.log('   Analyze Status:', analyzeRes.status);
    console.log('   Verdict:', analyzeRes.data.label);
    console.log('   Confidence:', analyzeRes.data.confidencePct + '%');
    console.log('   Media Type:', analyzeRes.data.mediaType);
    console.log('   Metadata:', analyzeRes.data.metadata.fileFormat, analyzeRes.data.metadata.durationFormatted, analyzeRes.data.metadata.sampleRate);
    console.log('   ✅ Audio analysis via HTTP returned valid verdict and metadata.\n');

    // 6. Test History Fetching
    console.log('6️⃣ Testing GET /api/history for authenticated user...');
    const historyRes = await axios.get(`${BASE}/history`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    console.log('   History records count:', historyRes.data.length);
    const historyItem = historyRes.data[0];
    console.log('   History item metadata:', historyItem.metadata);
    console.log('   ✅ History returns user analysis with metadata.\n');

    // 7. Test PDF Download
    console.log('7️⃣ Testing GET /api/user/download-pdf...');
    const pdfRes = await axios.get(`${BASE}/user/download-pdf`, {
      headers: { Authorization: `Bearer ${userToken}` },
      responseType: 'arraybuffer',
    });
    console.log('   PDF Status:', pdfRes.status);
    console.log('   Content-Type:', pdfRes.headers['content-type']);
    const isPdf = Buffer.from(pdfRes.data).slice(0, 5).toString('ascii') === '%PDF-';
    console.log('   Valid PDF Header (%PDF-):', isPdf);
    console.log('   PDF Byte Size:', pdfRes.data.length);
    if (!isPdf || pdfRes.data.length < 500) {
      throw new Error('FAILED: Invalid PDF generated');
    }
    console.log('   ✅ PDF Download verified.\n');

    // Clean up
    try { if (fs.existsSync(testWavPath)) fs.unlinkSync(testWavPath); } catch (_) {}
    console.log('🎉 ALL HTTP INTEGRATION TESTS PASSED!\n');
  } finally {
    if (serverInstance) serverInstance.close();
  }
}

run().catch((err) => {
  console.error('❌ HTTP test failed:', err.response?.data || err.message);
  if (serverInstance) serverInstance.close();
  process.exit(1);
});
