const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('../services/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

router.use(authenticateToken);

function deleteMediaFiles(items) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (item.storedFile) {
      try {
        const filePath = path.join(UPLOAD_DIR, item.storedFile);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (_) {}
    }
    if (item.mediaType === 'video' || item.id) {
      try {
        const frameDir = path.join(UPLOAD_DIR, `frames_${item.id}`);
        if (fs.existsSync(frameDir)) fs.rmSync(frameDir, { recursive: true, force: true });
      } catch (_) {}
    }
  }
}

// PUT /api/user/profile
router.put('/profile', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty.' });
    }

    if (email && email.trim().toLowerCase() !== req.user.email) {
      const cleanEmail = email.trim().toLowerCase();
      const existing = db.getUserByEmail(cleanEmail);
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ error: 'This email is already registered to another account.' });
      }
    }

    const updated = db.updateUserProfile(req.user.id, { name, email });
    return res.json({ message: 'Profile updated successfully.', user: updated });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// PUT /api/user/password
router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Please enter both current and new password.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'New passwords do not match.' });
    }

    const userWithSecret = db.getUserByIdWithSecret(req.user.id);
    if (!userWithSecret) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userWithSecret.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    db.updateUserPassword(req.user.id, newHash);

    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Update password error:', err);
    return res.status(500).json({ error: 'Failed to change password.' });
  }
});

// PUT /api/user/settings
router.put('/settings', (req, res) => {
  try {
    const { saveHistory, storeMedia, darkMode } = req.body;
    const settingsUpdate = {};

    if (typeof saveHistory === 'boolean') settingsUpdate.saveHistory = saveHistory;
    if (typeof storeMedia === 'boolean') settingsUpdate.storeMedia = storeMedia;
    if (typeof darkMode === 'boolean') settingsUpdate.darkMode = darkMode;

    const updatedUser = db.updateUserSettings(req.user.id, settingsUpdate);
    return res.json({ message: 'Settings saved.', user: updatedUser });
  } catch (err) {
    console.error('Update settings error:', err);
    return res.status(500).json({ error: 'Failed to update settings.' });
  }
});

const { generateUserPdfReport } = require('../services/pdfGenerator');

// GET /api/user/download-pdf - Securely generates PDF containing strictly this user's data
router.get('/download-pdf', (req, res) => {
  try {
    const analyses = db.getAnalysesByUserId(req.user.id);
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="truelense-my-data-${dateStr}.pdf"`);
    generateUserPdfReport(req.user, analyses, res);
  } catch (err) {
    console.error('Download PDF error:', err);
    return res.status(500).json({ error: 'Failed to generate PDF report.' });
  }
});

// GET /api/user/download-data (supports ?format=pdf or default json)
router.get('/download-data', (req, res) => {
  try {
    const analyses = db.getAnalysesByUserId(req.user.id);

    if (req.query.format === 'pdf') {
      const dateStr = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="truelense-my-data-${dateStr}.pdf"`);
      return generateUserPdfReport(req.user, analyses, res);
    }

    const exportData = {
      exportMetadata: {
        system: 'TrueLense AI Detector',
        exportDate: new Date().toISOString(),
        note: 'Personal data export. No credentials or password hashes are ever included.',
      },
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        registeredAt: req.user.created_at,
        privacySettings: req.user.settings,
      },
      analyses: analyses.map((a) => ({
        id: a.id,
        originalFilename: a.originalName,
        mediaType: a.mediaType,
        result: a.label,
        confidencePercentage: a.confidencePct,
        aiProbabilityPercentage: a.aiProbabilityPct,
        realProbabilityPercentage: a.realProbabilityPct,
        framesAnalyzed: a.framesAnalyzed,
        fileSize: a.fileSize,
        metadata: a.metadata,
        analyzedAt: a.analyzedAt,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="truelense-data-${Date.now()}.json"`);
    return res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    console.error('Download data error:', err);
    return res.status(500).json({ error: 'Failed to generate data export.' });
  }
});

// POST /api/user/delete-data
router.post('/delete-data', (req, res) => {
  try {
    const deletedItems = db.deleteAllAnalysesByUserId(req.user.id);
    deleteMediaFiles(deletedItems);

    return res.json({
      ok: true,
      message: 'All your analysis history and uploaded media files have been permanently deleted.',
      recordsDeleted: deletedItems.length,
    });
  } catch (err) {
    console.error('Delete data error:', err);
    return res.status(500).json({ error: 'Failed to delete personal data.' });
  }
});

// DELETE /api/user/account
router.delete('/account', (req, res) => {
  try {
    const deletedItems = db.deleteAllAnalysesByUserId(req.user.id);
    deleteMediaFiles(deletedItems);
    db.deleteUser(req.user.id);

    return res.json({
      ok: true,
      message: 'Your account and all associated data have been permanently deleted.',
    });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ error: 'Failed to delete account.' });
  }
});

// GET /api/user/stats — per-user breakdown from existing analyses table
router.get('/stats', (req, res) => {
  try {
    const analyses = db.getAnalysesByUserId(req.user.id);

    const total = analyses.length;
    const images = analyses.filter((a) => a.mediaType === 'image').length;
    const videos = analyses.filter((a) => a.mediaType === 'video').length;
    const audio  = analyses.filter((a) => a.mediaType === 'audio').length;
    const real   = analyses.filter((a) => a.label === 'REAL').length;
    const aiGenerated = analyses.filter((a) => a.label === 'AI-GENERATED').length;
    const avgConfidence = total > 0
      ? Math.round((analyses.reduce((s, a) => s + (a.confidencePct || 0), 0) / total) * 10) / 10
      : 0;

    // Lightweight history for graph – only fields the chart needs
    const history = analyses.map((a) => ({
      analyzedAt: a.analyzedAt,
      confidencePct: a.confidencePct,
      label: a.label,
      mediaType: a.mediaType,
    }));

    return res.json({ total, images, videos, audio, real, aiGenerated, avgConfidence, history });
  } catch (err) {
    console.error('User stats error:', err);
    return res.status(500).json({ error: 'Failed to load statistics.' });
  }
});

module.exports = router;

