const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Ensure storage directory exists
const STORAGE_DIR = path.join(__dirname, '..', 'storage');
fs.mkdirSync(STORAGE_DIR, { recursive: true });
const DB_PATH = path.join(STORAGE_DIR, 'truelense.db');

let db = null;

function getDb() {
  if (db) return db;

  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_PATH);

  // Enable WAL and foreign keys
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Initialize tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      account_status TEXT NOT NULL DEFAULT 'active',
      settings TEXT NOT NULL DEFAULT '{"saveHistory":true,"storeMedia":true,"darkMode":true}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_file TEXT,
      mime_type TEXT,
      media_type TEXT,
      label TEXT NOT NULL,
      confidence_pct REAL NOT NULL,
      ai_probability_pct REAL NOT NULL,
      real_probability_pct REAL NOT NULL,
      frames_analyzed INTEGER NOT NULL DEFAULT 1,
      frame_breakdown TEXT,
      file_size INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      analyzed_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_hash ON password_reset_tokens(token_hash);
  `);

  // Auto-migration check for existing databases
  try {
    const tableInfo = db.prepare('PRAGMA table_info(analyses)').all();
    const columnNames = new Set(tableInfo.map((c) => c.name));
    if (!columnNames.has('file_size')) {
      db.exec('ALTER TABLE analyses ADD COLUMN file_size INTEGER DEFAULT 0;');
    }
    if (!columnNames.has('metadata')) {
      db.exec("ALTER TABLE analyses ADD COLUMN metadata TEXT DEFAULT '{}';");
    }
  } catch (err) {
    console.error('[Database Migration Warning]', err.message);
  }

  // Auto-migration: ensure password_reset_tokens table exists on older DBs
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_reset_tokens_hash ON password_reset_tokens(token_hash);
    `);
  } catch (err) {
    console.error('[Database Migration Warning - reset tokens]', err.message);
  }

  seedAdminIfConfigured();
  return db;
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  let parsedSettings = { saveHistory: true, storeMedia: true, darkMode: true };
  if (rest.settings) {
    try {
      parsedSettings = typeof rest.settings === 'string' ? JSON.parse(rest.settings) : rest.settings;
    } catch (_) {}
  }
  return {
    ...rest,
    settings: parsedSettings,
  };
}

function seedAdminIfConfigured() {
  if (!config.adminEmails || config.adminEmails.length === 0) return;

  const defaultPassword = config.admin?.password || 'Admin@TrueLense2026!';
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(defaultPassword, salt);
  const defaultSettings = JSON.stringify({ saveHistory: true, storeMedia: true, darkMode: true });

  for (const adminEmail of config.adminEmails) {
    try {
      const cleanEmail = adminEmail.trim().toLowerCase();
      const checkStmt = db.prepare('SELECT id, email, role FROM users WHERE email = ?');
      const existing = checkStmt.get(cleanEmail);

      if (!existing) {
        const adminId = uuidv4();
        const now = new Date().toISOString();
        const adminName = cleanEmail.split('@')[0].toUpperCase();

        const insertStmt = db.prepare(`
          INSERT INTO users (id, name, email, password_hash, role, account_status, settings, created_at)
          VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?)
        `);
        insertStmt.run(adminId, `Admin (${adminName})`, cleanEmail, hash, defaultSettings, now);
        console.log(`[Database] Authorized admin seeded: ${cleanEmail}`);
      } else if (existing.role !== 'admin') {
        db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
        console.log(`[Database] Promoted existing account to admin: ${cleanEmail}`);
      }
    } catch (err) {
      console.error(`[Database] Error seeding admin ${adminEmail}:`, err.message);
    }
  }
}

// User CRUD operations
function createUser({ name, email, passwordHash }) {
  const database = getDb();
  const id = uuidv4();
  const cleanEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();
  const defaultSettings = JSON.stringify({ saveHistory: true, storeMedia: true, darkMode: true });
  // If email matches configured admin list, assign admin role, otherwise strictly user
  const role = config.isAdminEmail(cleanEmail) ? 'admin' : 'user';

  const stmt = database.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, account_status, settings, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
  `);

  stmt.run(id, name.trim(), cleanEmail, passwordHash, role, defaultSettings, now);
  return getUserById(id);
}

function getUserByEmail(email) {
  const database = getDb();
  const cleanEmail = (email || '').trim().toLowerCase();
  const stmt = database.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(cleanEmail) || null;
}

function getUserById(id) {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM users WHERE id = ?');
  const user = stmt.get(id);
  return sanitizeUser(user);
}

function getUserByIdWithSecret(id) {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) || null;
}

function updateUserProfile(id, { name, email }) {
  const database = getDb();
  const cleanName = name ? name.trim() : null;
  const cleanEmail = email ? email.trim().toLowerCase() : null;

  if (cleanName && cleanEmail) {
    database.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(cleanName, cleanEmail, id);
  } else if (cleanName) {
    database.prepare('UPDATE users SET name = ? WHERE id = ?').run(cleanName, id);
  } else if (cleanEmail) {
    database.prepare('UPDATE users SET email = ? WHERE id = ?').run(cleanEmail, id);
  }
  return getUserById(id);
}

function updateUserPassword(id, newPasswordHash) {
  const database = getDb();
  database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, id);
  return true;
}

function updateUserSettings(id, newSettings) {
  const database = getDb();
  const current = getUserById(id);
  if (!current) return null;

  const merged = {
    ...current.settings,
    ...newSettings,
  };

  database.prepare('UPDATE users SET settings = ? WHERE id = ?').run(JSON.stringify(merged), id);
  return getUserById(id);
}

function deleteUser(id) {
  const database = getDb();
  // Foreign key cascade will delete analyses rows
  database.prepare('DELETE FROM users WHERE id = ?').run(id);
  return true;
}

// Admin user queries - strictly excludes sensitive fields, media, or private history
// Admin user queries - strictly excludes sensitive fields, media, or private history
// Admin can ONLY see the list of registered users: Name, Email, Registration date
function getAllUsers({ search = '' } = {}) {
  const database = getDb();
  let query = `
    SELECT id, name, email, created_at
    FROM users
  `;
  const params = [];

  if (search && search.trim()) {
    query += ` WHERE name LIKE ? OR email LIKE ? `;
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  query += ` ORDER BY created_at DESC`;
  const stmt = database.prepare(query);
  return stmt.all(...params);
}

function getUserStats() {
  const database = getDb();
  const totalStmt = database.prepare('SELECT COUNT(*) as count FROM users');
  const activeStmt = database.prepare("SELECT COUNT(*) as count FROM users WHERE account_status = 'active'");
  const suspendedStmt = database.prepare("SELECT COUNT(*) as count FROM users WHERE account_status = 'suspended'");

  return {
    totalUsers: totalStmt.get().count,
    activeUsers: activeStmt.get().count,
    suspendedUsers: suspendedStmt.get().count,
  };
}

function updateUserStatus(id, accountStatus) {
  const database = getDb();
  database.prepare('UPDATE users SET account_status = ? WHERE id = ?').run(accountStatus, id);
  return getUserById(id);
}

// Analysis history queries - isolated per user
function createAnalysis({
  id = uuidv4(),
  userId,
  originalName,
  storedFile = null,
  mimeType = '',
  mediaType = 'image',
  label,
  confidencePct,
  aiProbabilityPct,
  realProbabilityPct,
  framesAnalyzed = 1,
  frameBreakdown = [],
  fileSize = 0,
  metadata = {},
  analyzedAt = new Date().toISOString(),
}) {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO analyses (
      id, user_id, original_name, stored_file, mime_type, media_type,
      label, confidence_pct, ai_probability_pct, real_probability_pct,
      frames_analyzed, frame_breakdown, file_size, metadata, analyzed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    userId,
    originalName,
    storedFile,
    mimeType,
    mediaType,
    label,
    confidencePct,
    aiProbabilityPct,
    realProbabilityPct,
    framesAnalyzed,
    typeof frameBreakdown === 'string' ? frameBreakdown : JSON.stringify(frameBreakdown),
    Number(fileSize) || 0,
    typeof metadata === 'string' ? metadata : JSON.stringify(metadata || {}),
    analyzedAt
  );

  return getAnalysisById(id);
}

function formatAnalysis(row) {
  if (!row) return null;
  let breakdown = [];
  try {
    breakdown = typeof row.frame_breakdown === 'string' ? JSON.parse(row.frame_breakdown) : (row.frame_breakdown || []);
  } catch (_) {}

  let meta = {};
  try {
    meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {});
  } catch (_) {}

  return {
    id: row.id,
    userId: row.user_id,
    originalName: row.original_name,
    storedFile: row.stored_file,
    fileUrl: row.stored_file ? `/media/${row.stored_file}` : null,
    mimeType: row.mime_type,
    mediaType: row.media_type,
    label: row.label,
    confidencePct: row.confidence_pct,
    aiProbabilityPct: row.ai_probability_pct,
    realProbabilityPct: row.real_probability_pct,
    framesAnalyzed: row.frames_analyzed,
    frameBreakdown: breakdown,
    fileSize: row.file_size || 0,
    metadata: meta,
    analyzedAt: row.analyzed_at,
  };
}

function getAnalysesByUserId(userId) {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM analyses WHERE user_id = ? ORDER BY analyzed_at DESC');
  const rows = stmt.all(userId);
  return rows.map(formatAnalysis);
}

function getAnalysisById(id) {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM analyses WHERE id = ?');
  const row = stmt.get(id);
  return formatAnalysis(row);
}

function deleteAnalysis(id, userId) {
  const database = getDb();
  const item = getAnalysisById(id);
  if (!item || item.userId !== userId) {
    return null;
  }
  database.prepare('DELETE FROM analyses WHERE id = ? AND user_id = ?').run(id, userId);
  return item;
}

function deleteAllAnalysesByUserId(userId) {
  const database = getDb();
  const items = getAnalysesByUserId(userId);
  database.prepare('DELETE FROM analyses WHERE user_id = ?').run(userId);
  return items;
}

// ── Password Reset Token operations ──────────────────────────────────────────

/**
 * Create (or replace) a reset token for a user.
 * Deletes any existing unused tokens for that user first to keep the table clean.
 */
function createResetToken(userId, tokenHash, expiresAt) {
  const database = getDb();
  // Invalidate any previous pending tokens for this user
  database.prepare('DELETE FROM password_reset_tokens WHERE user_id = ? AND used = 0').run(userId);
  const id = uuidv4();
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(id, userId, tokenHash, expiresAt, now);
  return id;
}

/**
 * Look up a token record by its SHA-256 hash.
 * Returns the row or null.
 */
function getResetToken(tokenHash) {
  const database = getDb();
  return database.prepare('SELECT * FROM password_reset_tokens WHERE token_hash = ?').get(tokenHash) || null;
}

/**
 * Mark a token as used so it cannot be reused.
 */
function markResetTokenUsed(id) {
  const database = getDb();
  database.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(id);
}

/**
 * Housekeeping: remove expired tokens to keep the table small.
 */
function deleteExpiredResetTokens() {
  const database = getDb();
  const now = new Date().toISOString();
  database.prepare('DELETE FROM password_reset_tokens WHERE expires_at < ?').run(now);
}

module.exports = {
  getDb,
  sanitizeUser,
  createUser,
  getUserByEmail,
  getUserById,
  getUserByIdWithSecret,
  updateUserProfile,
  updateUserPassword,
  updateUserSettings,
  deleteUser,
  getAllUsers,
  getUserStats,
  updateUserStatus,
  createAnalysis,
  getAnalysesByUserId,
  getAnalysisById,
  deleteAnalysis,
  deleteAllAnalysesByUserId,
  // Password reset
  createResetToken,
  getResetToken,
  markResetTokenUsed,
  deleteExpiredResetTokens,
};
