'use strict';
// Silence Node's one-line "SQLite is experimental" notice; everything else still prints.
const origEmit = process.emitWarning;
process.emitWarning = function (warning, ...args) {
  const msg = typeof warning === 'string' ? warning : warning && warning.message;
  if (msg && /SQLite is an experimental feature/.test(msg)) return;
  return origEmit.call(this, warning, ...args);
};

const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const config = require('./config');

const db = new DatabaseSync(config.dbFile);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  reset_token TEXT,
  reset_expires INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  admin_id INTEGER,
  user_id INTEGER,
  expires INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS destinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  region TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  popular INTEGER DEFAULT 0,
  in_menu INTEGER DEFAULT 0,
  sort INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS holiday_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'compass',
  description TEXT DEFAULT '',
  intro TEXT DEFAULT '',
  image TEXT DEFAULT '',
  in_menu INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  destination_id INTEGER REFERENCES destinations(id) ON DELETE SET NULL,
  style TEXT DEFAULT 'any',
  days INTEGER DEFAULT 7,
  nights INTEGER DEFAULT 6,
  price REAL NOT NULL DEFAULT 0,
  old_price REAL,
  child_price REAL,
  includes TEXT DEFAULT '',
  board TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  overview TEXT DEFAULT '',
  highlights TEXT DEFAULT '',
  itinerary TEXT DEFAULT '[]',
  inclusions TEXT DEFAULT '',
  exclusions TEXT DEFAULT '',
  images TEXT DEFAULT '[]',
  max_travellers INTEGER DEFAULT 12,
  featured INTEGER DEFAULT 0,
  is_deal INTEGER DEFAULT 0,
  offer_label TEXT DEFAULT '',
  offer_ends TEXT DEFAULT '',
  month_prices TEXT DEFAULT '{}',
  from_price REAL,
  hotels TEXT DEFAULT '[]',
  faqs TEXT DEFAULT '[]',
  badge TEXT DEFAULT '',
  status TEXT DEFAULT 'published',
  sort INTEGER DEFAULT 0,
  is_sample INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_packages_dest ON packages(destination_id);

CREATE TABLE IF NOT EXISTS package_types (
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  type_id INTEGER NOT NULL REFERENCES holiday_types(id) ON DELETE CASCADE,
  PRIMARY KEY (package_id, type_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
  package_title TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  travel_date TEXT NOT NULL,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  price_adult REAL NOT NULL,
  price_child REAL NOT NULL,
  total REAL NOT NULL,
  deposit REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  amount_paid REAL NOT NULL DEFAULT 0,
  admin_notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  text TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  avatar TEXT DEFAULT '',
  package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
  published INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort INTEGER DEFAULT 0,
  published INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  is_template INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL
);
`);

// Small migrations so a database created by an earlier version keeps working.
function addColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}
addColumn('destinations', 'in_menu', 'INTEGER DEFAULT 0');
addColumn('packages', 'offer_label', "TEXT DEFAULT ''");
addColumn('packages', 'offer_ends', "TEXT DEFAULT ''");
addColumn('packages', 'is_sample', 'INTEGER DEFAULT 0');
addColumn('packages', 'month_prices', "TEXT DEFAULT '{}'");
addColumn('packages', 'from_price', 'REAL');
addColumn('packages', 'hotels', "TEXT DEFAULT '[]'");
addColumn('packages', 'faqs', "TEXT DEFAULT '[]'");

const q = {
  get: (sql, ...p) => db.prepare(sql).get(...p),
  all: (sql, ...p) => db.prepare(sql).all(...p),
  run: (sql, ...p) => db.prepare(sql).run(...p),
  tx(fn) {
    db.exec('BEGIN');
    try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
  },
};

// Secret used to sign booking links; generated once per install.
function appSecret() {
  let row = q.get("SELECT value FROM settings WHERE key = 'app_secret'");
  if (!row) {
    const v = crypto.randomBytes(32).toString('hex');
    q.run("INSERT INTO settings (key, value) VALUES ('app_secret', ?)", v);
    row = { value: v };
  }
  return row.value;
}

module.exports = { db, q, appSecret };
