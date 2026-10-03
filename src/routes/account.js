'use strict';
const crypto = require('node:crypto');
const { q } = require('../db');
const settings = require('../settings');
const V = require('../views/account');
const { ctxFor, send, baseUrl } = require('./public');
const { hashPassword, verifyPassword, createSession, endSession, rateLimit, clearRate, requireUser, sign } = require('../auth');
const mail = require('../mail');
const emails = require('../emails');
const { str, isEmail, nowIso } = require('../lib/util');

const safeNext = (n) => (typeof n === 'string' && /^\/(?!\/)[\w\-/?=&%.#]*$/.test(n) && !n.startsWith('/admin') ? n : '/account');

module.exports = function register(app) {
  app.get('/account/login', (req, res) => {
    if (req.user) return res.redirect(safeNext(req.query.next));
    send(res, V.login(ctxFor(req), { next: str(req.query.next, 300) }));
  });

  app.post('/account/login', (req, res) => {
    const email = str(req.body.email, 160).toLowerCase();
    const next = str(req.body.next, 300);
    const key = `ulogin:${req.ip}:${email}`;
    if (!rateLimit(key, 8, 900000)) return send(res, V.login(ctxFor(req), { error: 'Too many attempts. Wait 15 minutes and try again.', values: { email }, next }), 429);
    const u = q.get('SELECT * FROM users WHERE email = ?', email);
    if (!u || !verifyPassword(req.body.password, u.password_hash)) {
      return send(res, V.login(ctxFor(req), { error: 'That email and password combination is not right.', values: { email }, next }), 401);
    }
    clearRate(key);
    createSession(res, req, { userId: u.id });
    res.flash('ok', `Welcome back, ${u.name.split(' ')[0]}.`);
    res.redirect(safeNext(next));
  });

  app.get('/account/register', (req, res) => {
    if (req.user) return res.redirect('/account');
    send(res, V.register(ctxFor(req), { values: { email: str(req.query.email, 160), name: str(req.query.name, 120) }, next: str(req.query.next, 300) }));
  });

  app.post('/account/register', (req, res) => {
    const b = req.body;
    const values = { name: str(b.name, 120), email: str(b.email, 160).toLowerCase(), phone: str(b.phone, 40) };
    const next = str(b.next, 300);
    const fail = (error, code = 400) => send(res, V.register(ctxFor(req), { error, values, next }), code);
    if (str(b.website)) return res.redirect('/');
    if (!rateLimit(`reg:${req.ip}`, 10, 3600000)) return fail('Too many sign-ups from this connection. Please try again later.', 429);
    if (values.name.length < 2) return fail('Enter your full name.');
    if (!isEmail(values.email)) return fail('Enter a valid email address.');
    if (String(b.password || '').length < 8) return fail('Choose a password of at least 8 characters.');
    if (q.get('SELECT 1 FROM users WHERE email = ?', values.email)) return fail('An account already exists for that email. Sign in or reset your password.');
    const r = q.run('INSERT INTO users (name, email, phone, password_hash, created_at) VALUES (?,?,?,?,?)', values.name, values.email, values.phone, hashPassword(b.password), nowIso());
    createSession(res, req, { userId: Number(r.lastInsertRowid) });
    res.flash('ok', 'Your account is ready.');
    res.redirect(safeNext(next));
  });

  app.post('/account/logout', (req, res) => {
    endSession(req, res, 'user');
    res.flash('ok', 'You have been signed out.');
    res.redirect('/');
  });

  app.get('/account/forgot', (req, res) => send(res, V.forgot(ctxFor(req), { mailEnabled: mail.enabled() })));
  app.post('/account/forgot', (req, res) => {
    const email = str(req.body.email, 160).toLowerCase();
    if (rateLimit(`forgot:${req.ip}`, 5, 3600000)) {
      const u = q.get('SELECT * FROM users WHERE email = ?', email);
      if (u) {
        const token = crypto.randomBytes(32).toString('hex');
        const hash = crypto.createHash('sha256').update(token).digest('hex');
        q.run('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?', hash, Date.now() + 3600000, u.id);
        emails.passwordReset(u, settings.all(), `${baseUrl(req)}/account/reset?token=${token}`);
      }
    }
    send(res, V.forgot(ctxFor(req), { sent: true }));
  });

  const findByToken = (token) => {
    if (!/^[a-f0-9]{64}$/.test(String(token || ''))) return null;
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return q.get('SELECT * FROM users WHERE reset_token = ? AND reset_expires > ?', hash, Date.now());
  };
  app.get('/account/reset', (req, res) => send(res, V.reset(ctxFor(req), { token: str(req.query.token, 80), invalid: !findByToken(req.query.token) })));
  app.post('/account/reset', (req, res) => {
    const token = str(req.body.token, 80);
    const u = findByToken(token);
    if (!u) return send(res, V.reset(ctxFor(req), { invalid: true }), 400);
    if (String(req.body.password || '').length < 8) return send(res, V.reset(ctxFor(req), { token, error: 'Choose a password of at least 8 characters.' }), 400);
    q.run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?', hashPassword(req.body.password), u.id);
    q.run('DELETE FROM sessions WHERE user_id = ?', u.id);
    createSession(res, req, { userId: u.id });
    res.flash('ok', 'Your password has been changed.');
    res.redirect('/account');
  });

  app.get('/account', requireUser, (req, res) => {
    const bookings = q.all(`SELECT b.*, p.images, p.days FROM bookings b LEFT JOIN packages p ON p.id = b.package_id
      WHERE b.user_id = ? ORDER BY b.travel_date ASC`, req.user.id).map((b) => {
      let image = '';
      try { image = JSON.parse(b.images || '[]')[0] || ''; } catch {}
      return { ...b, image };
    });
    send(res, V.dashboard(ctxFor(req), { bookings, sign, tab: req.query.tab === 'profile' ? 'profile' : 'trips' }));
  });

  app.post('/account/profile', requireUser, (req, res) => {
    const name = str(req.body.name, 120);
    const email = str(req.body.email, 160).toLowerCase();
    const phone = str(req.body.phone, 40);
    if (name.length < 2 || !isEmail(email)) { res.flash('error', 'Enter your name and a valid email address.'); return res.redirect('/account?tab=profile'); }
    const clash = q.get('SELECT id FROM users WHERE email = ? AND id <> ?', email, req.user.id);
    if (clash) { res.flash('error', 'Another account already uses that email.'); return res.redirect('/account?tab=profile'); }
    q.run('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?', name, email, phone, req.user.id);
    res.flash('ok', 'Your details have been saved.');
    res.redirect('/account?tab=profile');
  });

  app.post('/account/password', requireUser, (req, res) => {
    const u = q.get('SELECT * FROM users WHERE id = ?', req.user.id);
    if (!verifyPassword(req.body.current, u.password_hash)) { res.flash('error', 'Your current password is not right.'); return res.redirect('/account?tab=profile'); }
    if (String(req.body.password || '').length < 8) { res.flash('error', 'Choose a new password of at least 8 characters.'); return res.redirect('/account?tab=profile'); }
    q.run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(req.body.password), u.id);
    res.flash('ok', 'Password updated.');
    res.redirect('/account?tab=profile');
  });
};
