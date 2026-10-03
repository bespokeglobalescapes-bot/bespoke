'use strict';
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`Node.js 22.13 or newer is required (you have ${process.versions.node}).`);
  process.exit(1);
}

const path = require('node:path');
const config = require('./src/config');
const { q } = require('./src/db');
const { seed } = require('./src/seed');
const { App } = require('./src/lib/http');
const { loadSession, verifyCsrf, hashPassword } = require('./src/auth');
const V = require('./src/views/public');
const { nowIso } = require('./src/lib/util');

if (seed()) console.log('Added starter destinations, packages and pages.');

// Optional: create the first admin from environment variables.
if (config.adminEmail && config.adminPassword && !q.get('SELECT 1 FROM admins WHERE email = ?', config.adminEmail)) {
  q.run('INSERT INTO admins (name, email, password_hash, created_at) VALUES (?,?,?,?)', 'Administrator', config.adminEmail, hashPassword(config.adminPassword), nowIso());
  console.log(`Created admin account for ${config.adminEmail}.`);
}

const app = new App({ trustProxy: config.trustProxy });
app.static('/static', path.join(__dirname, 'public'), { maxAge: config.production ? 86400 : 0 });
app.static('/uploads', config.uploadsDir, { maxAge: 604800 });

app.use((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
});
app.use(loadSession);
app.use(verifyCsrf);

require('./src/routes/admin')(app);
require('./src/routes/account')(app);
require('./src/routes/public')(app);

const { ctxFor, send } = require('./src/routes/public');

app.notFound((req, res) => {
  send(res, V.errorPage(ctxFor(req), { status: 404, title: 'Page not found', message: 'We could not find that page.' }), 404);
});

app.onError((err, req, res) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  const title = status === 404 ? 'Page not found' : status === 403 ? 'Please try again' : status === 413 ? 'Upload too large' : 'Something went wrong';
  const message = status >= 500 ? 'An unexpected error happened. Please try again in a moment.' : err.message;
  try {
    send(res, V.errorPage(ctxFor(req), { status, title, message }), status);
  } catch (e) {
    console.error(e);
    res.status(status).send(message, 'text/plain; charset=utf-8');
  }
});

app.listen(config.port, config.host, () => {
  const hasAdmin = q.get('SELECT COUNT(*) c FROM admins').c > 0;
  console.log(`\n  Website running at http://localhost:${config.port}`);
  console.log(`  Admin dashboard: http://localhost:${config.port}/admin${hasAdmin ? '' : '  (first visit: create your admin account)'}`);
  console.log(`  Data folder: ${config.dataDir}\n`);
});
