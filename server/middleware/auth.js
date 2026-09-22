const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../services/db');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, config.jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    }

    const user = db.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User account not found or has been deleted.' });
    }

    if (user.account_status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended. Please contact an administrator.' });
    }

    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin' || !config.isAdminEmail(req.user.email)) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
};

