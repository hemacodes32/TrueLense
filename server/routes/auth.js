const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../services/db');
const { authenticateToken } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailer');

const router = express.Router();

const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** SHA-256 hash of a plain token string → hex */
function hashToken(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Securely hash password - never store plain text passwords
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user securely (password hashed with bcrypt)
    const newUser = db.createUser({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
    });

    return res.status(201).json({
      message: 'Registration successful! Please sign in with your email and password.',
      email: cleanEmail,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'An error occurred during registration. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.getUserByEmail(cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.account_status !== 'active') {
      return res.status(403).json({ error: 'Your account is suspended. Please contact an administrator.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const sanitized = db.sanitizeUser(user);
    return res.json({
      message: 'Login successful.',
      token,
      user: sanitized,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'An error occurred during login. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  return res.json({ user: req.user });
});

// ── Forgot Password ──────────────────────────────────────────────────────────

// POST /api/auth/forgot-password
// Always returns a generic success so email enumeration is impossible.
router.post('/forgot-password', async (req, res) => {
  // Housekeeping: prune stale tokens on each request
  try { db.deleteExpiredResetTokens(); } catch (_) {}

  const genericOk = { message: 'If that email is registered, a reset link has been sent.' };

  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email.trim())) {
      // Still return 200 so callers cannot probe for valid emails
      return res.json(genericOk);
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.getUserByEmail(cleanEmail);

    if (!user) {
      // User not found — return generic OK (no email enumeration)
      return res.json(genericOk);
    }

    // Generate a cryptographically secure random token
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS).toISOString();

    db.createResetToken(user.id, tokenHash, expiresAt);

    const resetUrl = `${config.email.appUrl}?token=${plainToken}`;
    await sendPasswordResetEmail(cleanEmail, resetUrl);

    return res.json(genericOk);
  } catch (err) {
    console.error('Forgot-password error:', err);
    // Return 200 generic even on internal errors — don't expose internals
    return res.json(genericOk);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Reset token is missing or invalid.' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const tokenHash = hashToken(token.trim());
    const record = db.getResetToken(tokenHash);

    if (!record) {
      return res.status(400).json({ error: 'This reset link is invalid or has already been used.' });
    }
    if (record.used) {
      return res.status(400).json({ error: 'This reset link has already been used. Please request a new one.' });
    }
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }

    // Hash the new password and update the user record
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    db.updateUserPassword(record.user_id, newHash);

    // Invalidate the token — single use only
    db.markResetTokenUsed(record.id);

    return res.json({ message: 'Your password has been reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset-password error:', err);
    return res.status(500).json({ error: 'An error occurred while resetting your password. Please try again.' });
  }
});

module.exports = router;
