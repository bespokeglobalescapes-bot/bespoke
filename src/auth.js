'use strict';
const crypto = require('node:crypto');
const { q, appSecret } = require('./db');
const { HttpError } = require('./lib/http');

const SESSION_COOKIE = 'bge_sid';
const CSRF_COOKIE = 'bge_csrf';
const FLASH_COOKIE = 'bge_flash';
const SESSION_DAYS = 14;

// ---- passwords (scrypt) ----
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pw), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [alg, saltHex, hashHex] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(String(pw), Buffer.from(saltHex, 'hex'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, actual);
}

// ---- signed tokens (booking links) ----
function sign(value) {
  return crypto.createHmac('sha256', appSecret()).update(String(value)).digest('base64url').slice(0, 22);
}
function verifySigned(value, sig) {
  const a = Buffer.from(sign(value));
  const b = Buffer.from(String(sig || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---- sessions ----
function createSession(res, req, { adminId = null, userId = null }) {
  const existing = req.session;
  const id = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + SESSION_DAYS * 86400000;
  // Keep the other login (admin vs traveller) if one exists on this browser.
  const a = adminId ?? existing?.admin_id ?? null;
  const u = userId ?? existing?.user_id ?? null;
  if (existing) q.run('DELETE FROM sessions WHERE id = ?', existing.id);
  q.run('INSERT INTO sessions (id, admin_id, user_id, expires) VALUES (?,?,?,?)', id, a, u, expires);
  res.cookie(SESSION_COOKIE, id, { maxAge: SESSION_DAYS * 86400 });
}

function endSession(req, res, which) {
  const s = req.session;
  if (!s) return;
  const a = which === 'admin' ? null : s.admin_id;
  const u = which === 'user' ? null : s.user_id;
  if (!a && !u) { q.run('DELETE FROM sessions WHERE id = ?', s.id); res.clearCookie(SESSION_COOKIE); }
  else q.run('UPDATE sessions SET admin_id = ?, user_id = ? WHERE id = ?', a, u, s.id);
}

let lastSweep = 0;
function loadSession(req, res) {
  if (Date.now() - lastSweep > 3600000) { lastSweep = Date.now(); q.run('DELETE FROM sessions WHERE expires < ?', Date.now()); }
  const sid = req.cookies[SESSION_COOKIE];
  req.session = null; req.admin = null; req.user = null;
  if (sid && /^[a-f0-9]{64}$/.test(sid)) {
    const s = q.get('SELECT * FROM sessions WHERE id = ? AND expires > ?', sid, Date.now());
    if (s) {
      req.session = s;
      if (s.admin_id) req.admin = q.get('SELECT id, name, email FROM admins WHERE id = ?', s.admin_id) || null;
      if (s.user_id) req.user = q.get('SELECT id, name, email, phone FROM users WHERE id = ?', s.user_id) || null;
    }
  }
  // CSRF token: double-submit cookie
  let token = req.cookies[CSRF_COOKIE];
  if (!token || !/^[A-Za-z0-9_-]{20,}$/.test(token)) {
    token = crypto.randomBytes(24).toString('base64url');
    res.cookie(CSRF_COOKIE, token, { maxAge: 30 * 86400 });
    req.csrfFresh = true;
  }
  req.csrf = token;
  // Flash message from previous redirect
  if (req.cookies[FLASH_COOKIE]) {
    try { req.flash = JSON.parse(req.cookies[FLASH_COOKIE]); } catch { req.flash = null; }
    res.clearCookie(FLASH_COOKIE);
  }
  res.flash = (type, msg) => res.cookie(FLASH_COOKIE, JSON.stringify({ type, msg: String(msg).slice(0, 300) }), { maxAge: 60 });
}

function verifyCsrf(req) {
  if (req.method !== 'POST') return;
  const sent = String(req.body._csrf || req.headers['x-csrf-token'] || '');
  const cookie = req.cookies[CSRF_COOKIE] || '';
  if (!cookie || !sent || sent.length !== cookie.length || !crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(cookie))) {
    throw new HttpError(403, 'Your session expired. Go back, refresh the page and try again.');
  }
}

// ---- simple in-memory rate limiting ----
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { count: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.count++;
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  return b.count <= max;
}
function clearRate(key) { buckets.delete(key); }

function requireAdmin(req, res) {
  if (!req.admin) {
    const hasAdmins = q.get('SELECT COUNT(*) c FROM admins').c > 0;
    res.redirect(hasAdmins ? `/admin/login?next=${encodeURIComponent(req.path + (req.search || ''))}` : '/admin/setup');
  }
}
function requireUser(req, res) {
  if (!req.user) res.redirect(`/account/login?next=${encodeURIComponent(req.path + (req.search || ''))}`);
}

module.exports = {
  hashPassword, verifyPassword, sign, verifySigned, createSession, endSession, loadSession, verifyCsrf,
  rateLimit, clearRate, requireAdmin, requireUser,
};
