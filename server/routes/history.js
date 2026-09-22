const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../services/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

router.use(authenticateToken);

// GET /api/history - user-specific history
router.get('/', (req, res) => {
  try {
    const items = db.getAnalysesByUserId(req.user.id);
    return res.json(items);
  } catch (err) {
    console.error('Fetch history error:', err);
    return res.status(500).json({ error: 'Failed to retrieve analysis history.' });
  }
});

// DELETE /api/history/:id - verified user ownership
router.delete('/:id', (req, res) => {
  try {
    const removed = db.deleteAnalysis(req.params.id, req.user.id);
    if (!removed) {
      return res.status(404).json({ error: 'History item not found or unauthorized.' });
    }

    if (removed.storedFile) {
      const filePath = path.join(UPLOAD_DIR, removed.storedFile);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (_) {}
    }

    if (removed.mediaType === 'video') {
      const frameDir = path.join(UPLOAD_DIR, `frames_${removed.id}`);
      try {
        if (fs.existsSync(frameDir)) fs.rmSync(frameDir, { recursive: true, force: true });
      } catch (_) {}
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Delete history item error:', err);
    return res.status(500).json({ error: 'Failed to delete history item.' });
  }
});

module.exports = router;
