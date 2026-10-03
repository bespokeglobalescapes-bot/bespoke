'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Load a .env file (KEY=value per line) without overriding real environment variables.
function loadEnv(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return; }
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

const ROOT = path.resolve(__dirname, '..');
loadEnv(path.join(ROOT, '.env'));

const env = process.env;
const DATA_DIR = path.resolve(ROOT, env.DATA_DIR || 'data');

const config = {
  root: ROOT,
  port: parseInt(env.PORT || '3000', 10),
  host: env.HOST || '0.0.0.0',
  dataDir: DATA_DIR,
  dbFile: path.join(DATA_DIR, 'site.db'),
  uploadsDir: path.join(DATA_DIR, 'uploads'),
  baseUrl: (env.BASE_URL || '').replace(/\/+$/, ''),
  production: env.NODE_ENV === 'production',
  trustProxy: env.TRUST_PROXY ? env.TRUST_PROXY !== 'false' : true,
  adminEmail: env.ADMIN_EMAIL || '',
  adminPassword: env.ADMIN_PASSWORD || '',
  smtp: {
    host: env.SMTP_HOST || '',
    port: parseInt(env.SMTP_PORT || '587', 10),
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : (env.SMTP_PORT === '465'),
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.MAIL_FROM || env.SMTP_USER || '',
  },
};

fs.mkdirSync(config.uploadsDir, { recursive: true });

module.exports = config;
