/**
 * Admin Seeding / Management CLI Script
 *
 * Usage:
 *   node seed-admin.js
 *   node seed-admin.js <email> <password> "<name>"
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const db = require('./services/db');

async function seedOneAdmin(email, password, name) {
  const database = db.getDb();
  const cleanEmail = email.trim().toLowerCase();
  const existing = db.getUserByEmail(cleanEmail);

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  if (existing) {
    database.prepare(`
      UPDATE users
      SET password_hash = ?, role = 'admin', account_status = 'active', name = ?
      WHERE id = ?
    `).run(hash, name, existing.id);
    console.log(`✅ Updated existing user "${cleanEmail}" to ADMIN role with updated password.`);
  } else {
    const id = uuidv4();
    const now = new Date().toISOString();
    const settings = JSON.stringify({ saveHistory: true, storeMedia: true, darkMode: true });

    database.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, account_status, settings, created_at)
      VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?)
    `).run(id, name, cleanEmail, hash, settings, now);
    console.log(`✅ Successfully created new ADMIN account: "${cleanEmail}" (${name}).`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length >= 2) {
    const email = args[0].trim().toLowerCase();
    const password = args[1];
    const name = (args[2] || 'System Admin').trim();
    await seedOneAdmin(email, password, name);
  } else {
    // Seed all configured admin accounts
    const password = config.admin.password || 'Admin@TrueLense2026!';
    for (const email of config.adminEmails) {
      const name = `Admin (${email.split('@')[0].toUpperCase()})`;
      await seedOneAdmin(email, password, name);
    }
  }
}

main().catch((err) => {
  console.error('Admin seed failed:', err.message);
  process.exit(1);
});
