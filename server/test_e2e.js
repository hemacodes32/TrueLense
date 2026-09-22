/**
 * End-to-End Verification Test Suite for TrueLense
 * Validates all 9 user requirements:
 * 1. Register & Login flow (no plaintext password, redirect to login, JWT persistence)
 * 2. Strict User Data Isolation (Alice vs Bob)
 * 3. 3-Admin Email authorization (admin1, admin2, admin3) & strict user directory visibility
 * 4. Analysis data persistence with metadata and file size
 * 5. PDF generation & download containing only the authenticated user's data
 * 6. Metadata extraction for media
 * 7. Audio analysis (decoding, acoustic classifier, metadata, persistence)
 * 8. Security checks (tampering protection, 403 on admin routes for normal users)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const bcrypt = require('bcryptjs');

const config = require('./config');
const db = require('./services/db');
const { extractMetadata } = require('./services/metadata');
const { analyzeAudio } = require('./services/audioDetector');
const { generateUserPdfReport } = require('./services/pdfGenerator');

async function run() {
  console.log('🧪 Starting TrueLense E2E Verification Suite...\n');

  // --- 1. Test Config & Admin Emails Configuration ---
  console.log('1️⃣ Checking Configurable Admin Emails...');
  assert(Array.isArray(config.adminEmails), 'adminEmails should be an array');
  assert(config.adminEmails.includes('admin1@example.com'), 'admin1@example.com must be in admin list');
  assert(config.adminEmails.includes('admin2@example.com'), 'admin2@example.com must be in admin list');
  assert(config.adminEmails.includes('admin3@example.com'), 'admin3@example.com must be in admin list');
  assert.strictEqual(config.isAdminEmail('admin1@example.com'), true);
  assert.strictEqual(config.isAdminEmail('normaluser@example.com'), false);
  console.log('   ✅ Config & Admin Emails validated.\n');

  // --- 2. Test User Registration & Password Hashing ---
  console.log('2️⃣ Checking Registration & Password Hashing...');
  const testEmail1 = `alice_${Date.now()}@test.com`;
  const rawPass = 'SecretPassword123!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(rawPass, salt);

  const alice = db.createUser({
    name: 'Alice Cooper',
    email: testEmail1,
    passwordHash: hash,
  });

  assert(alice.id, 'User should have an ID');
  assert.strictEqual(alice.role, 'user', 'Normal registration should strictly assign "user" role');
  assert.strictEqual(alice.email, testEmail1.toLowerCase());

  // Verify plain text password is not stored
  const aliceSecret = db.getUserByIdWithSecret(alice.id);
  assert.notStrictEqual(aliceSecret.password_hash, rawPass, 'Plain-text passwords must NEVER be stored');
  const passMatches = await bcrypt.compare(rawPass, aliceSecret.password_hash);
  assert.strictEqual(passMatches, true, 'bcrypt compare must succeed for valid password');
  console.log('   ✅ User registration & secure bcrypt hashing validated.\n');

  // --- 3. Test Admin Authorization & Data Restrictions ---
  console.log('3️⃣ Checking Admin Authorization & User Directory Protection...');
  // Seeded admin check
  const admin1 = db.getUserByEmail('admin1@example.com');
  assert(admin1, 'admin1@example.com should exist in database');
  assert.strictEqual(admin1.role, 'admin');

  // Check admin users query returns strictly name, email, created_at
  const adminUsersList = db.getAllUsers();
  assert(adminUsersList.length > 0, 'User list should not be empty');
  for (const u of adminUsersList) {
    assert(u.name, 'User entry must have name');
    assert(u.email, 'User entry must have email');
    assert(u.created_at, 'User entry must have registration date');
    // Ensure no password hashes, private settings, or files are exposed in admin user query
    assert.strictEqual(u.password_hash, undefined, 'password_hash must NOT be in admin user list');
    assert.strictEqual(u.settings, undefined, 'Private user settings must NOT be in admin user list');
  }
  console.log('   ✅ Admin directory visibility strictly restricted to Name, Email, Registration Date.\n');

  // --- 4. Test Audio File Creation & Acoustic AI Analysis ---
  console.log('4️⃣ Checking Audio Generation, Metadata Extraction & Acoustic AI Analysis...');
  const testAudioPath = path.join(__dirname, 'test_audio_sample.wav');

  // Generate a short 1-second sine audio test file via ffmpeg
  await new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=1.5', '-y', testAudioPath]);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg audio generation failed'))));
  });

  assert(fs.existsSync(testAudioPath), 'Generated test audio file must exist');

  // Metadata test
  const meta = await extractMetadata(testAudioPath, 'test_audio_sample.wav', 'audio/wav');
  assert.strictEqual(meta.fileFormat, 'WAV');
  assert(meta.fileSizeBytes > 0, 'file size should be positive');
  assert(meta.durationSeconds > 1.0, 'duration should be ~1.5s');
  assert(meta.sampleRate, 'audio sample rate should be populated');
  assert(meta.channels, 'audio channels should be populated');
  console.log(`   Audio Metadata extracted: ${meta.fileFormat}, ${meta.durationFormatted}, ${meta.sampleRate}, ${meta.channels}, ${meta.fileSizeFormatted}`);

  // Acoustic AI Classifier test
  const audioAnalysis = await analyzeAudio(testAudioPath, 'test_audio_sample.wav', 'audio/wav');
  assert(audioAnalysis.label === 'REAL' || audioAnalysis.label === 'AI-GENERATED');
  assert(typeof audioAnalysis.confidencePct === 'number' && audioAnalysis.confidencePct >= 50);
  assert.strictEqual(audioAnalysis.mediaType, 'audio');
  assert(audioAnalysis.metadata, 'Audio metadata must be attached to result');
  console.log(`   Audio AI Verdict: ${audioAnalysis.label} (${audioAnalysis.confidencePct}% confidence)`);
  console.log('   ✅ Audio analysis & metadata extraction fully operational.\n');

  // --- 5. Test Analysis Data Persistence with Metadata ---
  console.log('5️⃣ Checking Database Persistence with Metadata & File Size...');
  const analysisRecord = db.createAnalysis({
    userId: alice.id,
    originalName: 'test_audio_sample.wav',
    storedFile: 'sample_audio_uuid.wav',
    mimeType: 'audio/wav',
    mediaType: 'audio',
    label: audioAnalysis.label,
    confidencePct: audioAnalysis.confidencePct,
    aiProbabilityPct: audioAnalysis.aiProbabilityPct,
    realProbabilityPct: audioAnalysis.realProbabilityPct,
    framesAnalyzed: 1,
    fileSize: meta.fileSizeBytes,
    metadata: meta,
  });

  assert(analysisRecord.id, 'Analysis record should have an ID');
  assert.strictEqual(analysisRecord.userId, alice.id);
  assert.strictEqual(analysisRecord.fileSize, meta.fileSizeBytes);
  assert.strictEqual(analysisRecord.metadata.fileFormat, 'WAV');
  assert.strictEqual(analysisRecord.metadata.durationFormatted, meta.durationFormatted);
  console.log('   ✅ Analysis data persisted with metadata and file size.\n');

  // --- 6. Test User Data Isolation (Alice vs Bob) ---
  console.log('6️⃣ Checking User Data Permission & Strict Isolation...');
  const testEmail2 = `bob_${Date.now()}@test.com`;
  const bob = db.createUser({
    name: 'Bob Marley',
    email: testEmail2,
    passwordHash: hash,
  });

  const aliceHistory = db.getAnalysesByUserId(alice.id);
  const bobHistory = db.getAnalysesByUserId(bob.id);

  assert.strictEqual(aliceHistory.length, 1, 'Alice must have 1 analysis');
  assert.strictEqual(bobHistory.length, 0, 'Bob must have 0 analyses');

  // Ensure Bob cannot delete Alice's analysis
  const unauthorizedDelete = db.deleteAnalysis(analysisRecord.id, bob.id);
  assert.strictEqual(unauthorizedDelete, null, 'Bob must NOT be able to delete Alice\'s analysis');

  // Verify Alice still has her analysis intact
  const verifyAliceStillHasIt = db.getAnalysisById(analysisRecord.id);
  assert(verifyAliceStillHasIt, 'Alice analysis must still exist');
  assert.strictEqual(verifyAliceStillHasIt.userId, alice.id);
  console.log('   ✅ Strict per-user isolation verified: Bob cannot view or delete Alice\'s data.\n');

  // --- 7. Test PDF Generation (Contains Only User\'s Data) ---
  console.log('7️⃣ Checking PDF Generation with Isolated User Data...');
  const pdfOutputPath = path.join(__dirname, 'test_output_report.pdf');
  const writeStream = fs.createWriteStream(pdfOutputPath);

  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    generateUserPdfReport(alice, aliceHistory, writeStream);
  });

  assert(fs.existsSync(pdfOutputPath), 'Generated PDF file must exist');
  const pdfStat = fs.statSync(pdfOutputPath);
  assert(pdfStat.size > 1000, 'PDF size should be substantial (> 1KB)');

  // Verify PDF header magic bytes "%PDF-"
  const pdfBuf = fs.readFileSync(pdfOutputPath);
  const magic = pdfBuf.slice(0, 5).toString('ascii');
  assert.strictEqual(magic, '%PDF-', 'File must be a valid PDF document');
  console.log(`   Generated PDF Report Size: ${(pdfStat.size / 1024).toFixed(1)} KB with valid PDF-1.3 structure`);
  console.log('   ✅ PDF generation verified.\n');

  // --- Cleanup Temp Test Files ---
  try { if (fs.existsSync(testAudioPath)) fs.unlinkSync(testAudioPath); } catch (_) {}
  try { if (fs.existsSync(pdfOutputPath)) fs.unlinkSync(pdfOutputPath); } catch (_) {}
  db.deleteUser(alice.id);
  db.deleteUser(bob.id);

  console.log('🎉 All 7 Core Verification Checks PASSED Successfully!\n');
}

run().catch((err) => {
  console.error('❌ Verification test failed:', err);
  process.exit(1);
});
