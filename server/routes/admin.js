const express = require('express');
const db = require('../services/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Enforce both authentication and admin role for all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  try {
    const stats = db.getUserStats();
    return res.json(stats);
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve admin statistics.' });
  }
});

// GET /api/admin/users
// PRIVACY RULE: strictly returns only registered-user info (id, name, email, created_at).
// NEVER exposes user media, analysis history, passwords, or personal files.
router.get('/users', (req, res) => {
  try {
    const { search = '' } = req.query;
    const users = db.getAllUsers({ search });
    const formatted = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      created_at: u.created_at,
    }));
    return res.json(formatted);
  } catch (err) {
    console.error('Admin get users error:', err);
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { account_status } = req.body;

    if (!['active', 'suspended'].includes(account_status)) {
      return res.status(400).json({ error: 'Invalid account status. Must be "active" or "suspended".' });
    }

    // Safety: prevent admin from suspending their own account
    if (id === req.user.id && account_status === 'suspended') {
      return res.status(400).json({ error: 'You cannot suspend your own administrator account.' });
    }

    const targetUser = db.getUserById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updated = db.updateUserStatus(id, account_status);
    return res.json({
      message: `User status changed to ${account_status}.`,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        account_status: updated.account_status,
      },
    });
  } catch (err) {
    console.error('Admin update user status error:', err);
    return res.status(500).json({ error: 'Failed to update user status.' });
  }
});

module.exports = router;
