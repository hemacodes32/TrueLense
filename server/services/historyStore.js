const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', 'storage', 'history.json');

function readAll() {
  if (!fs.existsSync(STORE_PATH)) return [];
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (_) {
    return [];
  }
}

function writeAll(items) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(items, null, 2));
}

function add(entry) {
  const items = readAll();
  items.unshift(entry); // newest first
  writeAll(items);
  return entry;
}

function list() {
  return readAll();
}

function remove(id) {
  const items = readAll();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  const [removed] = items.splice(idx, 1);
  writeAll(items);
  return removed;
}

module.exports = { add, list, remove };
