const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const db = require('./services/db');

const authRoute = require('./routes/auth');
const userRoute = require('./routes/user');
const adminRoute = require('./routes/admin');
const analyzeRoute = require('./routes/analyze');
const historyRoute = require('./routes/history');

// Ensure database and admin are initialized
db.getDb();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/media', express.static(path.join(__dirname, 'uploads')));

// Mount API routes
app.use('/api/auth', authRoute);
app.use('/api/user', userRoute);
app.use('/api/admin', adminRoute);
app.use('/api/analyze', analyzeRoute);
app.use('/api/history', historyRoute);

app.get('/api/health', (req, res) => {
  const configured = Boolean(
    config.sightengine.apiUser &&
    config.sightengine.apiSecret &&
    config.sightengine.apiUser !== 'your_api_user_here'
  );
  res.json({ ok: true, detectorProvider: config.detectorProvider, providerConfigured: configured });
});

app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File too large. Max size is ${config.maxUploadMb}MB.` });
  }
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(config.port, () => {
  console.log(`TrueLense API listening on http://localhost:${config.port}`);
  if (!config.sightengine.apiUser || config.sightengine.apiUser === 'your_api_user_here') {
    console.warn('⚠️  SIGHTENGINE_API_USER/SECRET not set in server/.env - analysis calls will fail until configured.');
  }
});
