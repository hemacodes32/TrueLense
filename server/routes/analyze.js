const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { analyzeMedia } = require('../services/detector');
const db = require('../services/db');
const { authenticateToken } = require('../middleware/auth');

const { extractMetadata } = require('../services/metadata');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Store under a generated id, never the original filename - detection
    // and history keys never depend on what the user named the file.
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
});

// Require user authentication for media analysis
router.use(authenticateToken);

router.post('/', upload.single('media'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Attach a file under the "media" field.' });
  }

  const filePath = req.file.path;
  const mimeType = req.file.mimetype;
  const originalName = req.file.originalname;
  const mediaId = path.parse(req.file.filename).name;
  const fileSize = req.file.size;

  try {
    const result = await analyzeMedia(filePath, mimeType, mediaId, originalName);
    const metadata = result.metadata || (await extractMetadata(filePath, originalName, mimeType));

    const userSettings = req.user.settings || {};
    const storeMedia = userSettings.storeMedia !== false; // default true
    const saveHistory = userSettings.saveHistory !== false; // default true

    // Data permission: if storeMedia is OFF, purge media immediately after analysis
    if (!storeMedia) {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (_) {}

      try {
        const frameDir = path.join(UPLOAD_DIR, `frames_${mediaId}`);
        if (fs.existsSync(frameDir)) fs.rmSync(frameDir, { recursive: true, force: true });
      } catch (_) {}
    }

    const analyzedAt = new Date().toISOString();
    const storedFileName = storeMedia ? req.file.filename : null;

    if (saveHistory) {
      // Data permission: save history record connected to logged-in user
      const entry = db.createAnalysis({
        id: mediaId,
        userId: req.user.id,
        originalName,
        storedFile: storedFileName,
        mimeType,
        mediaType: result.mediaType,
        label: result.label,
        confidencePct: result.confidencePct,
        aiProbabilityPct: result.aiProbabilityPct,
        realProbabilityPct: result.realProbabilityPct,
        framesAnalyzed: result.framesAnalyzed,
        frameBreakdown: result.frameBreakdown,
        fileSize,
        metadata,
        analyzedAt,
      });

      return res.json(entry);
    } else {
      // Data permission: Save Analysis History OFF -> return analysis verdict without persisting
      return res.json({
        id: mediaId,
        userId: req.user.id,
        originalName,
        storedFile: storedFileName,
        fileUrl: storedFileName ? `/media/${storedFileName}` : null,
        mimeType,
        mediaType: result.mediaType,
        label: result.label,
        confidencePct: result.confidencePct,
        aiProbabilityPct: result.aiProbabilityPct,
        realProbabilityPct: result.realProbabilityPct,
        framesAnalyzed: result.framesAnalyzed,
        frameBreakdown: result.frameBreakdown,
        fileSize,
        metadata,
        analyzedAt,
        historySaved: false,
      });
    }

  } catch (err) {
    // Clean up the uploaded file (and any partially-extracted frames) if analysis failed
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
    try {
      const frameDir = path.join(UPLOAD_DIR, `frames_${mediaId}`);
      if (fs.existsSync(frameDir)) fs.rmSync(frameDir, { recursive: true, force: true });
    } catch (_) {}

    const status = err.code === 'MISSING_CREDENTIALS' ? 503
      : err.code === 'UNSUPPORTED_TYPE' ? 415
      : 502;

    return res.status(status).json({ error: err.message, code: err.code || 'ANALYSIS_FAILED' });
  }
});

module.exports = router;
