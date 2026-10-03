'use strict';
const { q } = require('../db');
const settings = require('../settings');
const M = require('../models');
const V = require('../views/admin');
const mail = require('../mail');
const emails = require('../emails');
const { saveImage } = require('../uploads');
const { ctxFor, send, baseUrl } = require('./public');
const { hashPassword, verifyPassword, createSession, endSession, rateLimit, clearRate, requireAdmin, sign } = require('../auth');
const { HttpError } = require('../lib/http');
const { str, int, num, arr, lines, isEmail, isIsoDate, slugify, nowIso, isoDate, addDays, csv, bookingRef, parseJson } = require('../lib/util');

function actx(req) {
  const ctx = ctxFor(req);
  ctx.counts = {
    pending: q.get("SELECT COUNT(*) c FROM bookings WHERE status IN ('pending','cancel_requested')").c,
    unread: q.get('SELECT COUNT(*) c FROM enquiries WHERE is_read = 0').c,
  };
  return ctx;
}

const safeNext = (n) => (typeof n === 'string' && /^\/admin(\/[\w\-/?=&%.]*)?$/.test(n) ? n : '/admin');
const id = (req) => { const n = int(req.params.id, 0); if (!n) throw new HttpError(404, 'Not found'); return n; };
const cleanUrl = (u) => { const s = str(u, 1000); return /^https?:\/\/\S+$/i.test(s) || /^\/uploads\/[\w.-]+$/.test(s) ? s : ''; };
function uniqueSlug(table, base, exceptId = 0) {
  let slug = base, n = 2;
  while (q.get(`SELECT 1 FROM ${table} WHERE slug = ? AND id <> ?`, slug, exceptId)) slug = `${base}-${n++}`;
  return slug;
}
// Image input that accepts either a pasted link or an uploaded file (<name>_file).
function imageInput(req, name) {
  const file = req.files.find((f) => f.field === `${name}_file`);
  if (file) return saveImage(file);
  return cleanUrl(req.body[name]);
}
const pageOf = (req) => int(req.query.page, 1, 1);

module.exports = function register(app) {
  // Everything under /admin needs a signed-in admin, except sign-in and first-run setup.
  app.use((req, res) => {
    if (!req.path.startsWith('/admin')) return;
    res.setHeader('Cache-Control', 'no-store');
    if (['/admin/login', '/admin/setup'].includes(req.path)) return;
    requireAdmin(req, res);
  });

  // ---------- setup & auth ----------
  const hasAdmins = () => q.get('SELECT COUNT(*) c FROM admins').c > 0;
  app.get('/admin/setup', (req, res) => {
    if (hasAdmins()) return res.redirect('/admin/login');
    send(res, V.setup(ctxFor(req), {}));
  });
  app.post('/admin/setup', (req, res) => {
    if (hasAdmins()) return res.redirect('/admin/login');
    const values = { name: str(req.body.name, 80), email: str(req.body.email, 160).toLowerCase() };
    const pw = String(req.body.password || '');
    let error = '';
    if (values.name.length < 2) error = 'Enter your name.';
    else if (!isEmail(values.email)) error = 'Enter a valid email address.';
    else if (pw.length < 10) error = 'Choose a password of at least 10 characters.';
    if (error) return send(res, V.setup(ctxFor(req), { error, values }), 400);
    const r = q.run('INSERT INTO admins (name, email, password_hash, created_at) VALUES (?,?,?,?)', values.name, values.email, hashPassword(pw), nowIso());
    createSession(res, req, { adminId: Number(r.lastInsertRowid) });
    res.flash('ok', 'Your admin account is ready. Start by checking the launch checklist below.');
    res.redirect('/admin');
  });

  app.get('/admin/login', (req, res) => {
    if (!hasAdmins()) return res.redirect('/admin/setup');
    if (req.admin) return res.redirect(safeNext(req.query.next));
    send(res, V.login(ctxFor(req), { next: str(req.query.next, 300) }));
  });
  app.post('/admin/login', (req, res) => {
    const email = str(req.body.email, 160).toLowerCase();
    const next = str(req.body.next, 300);
    const key = `alogin:${req.ip}`;
    if (!rateLimit(key, 10, 900000)) return send(res, V.login(ctxFor(req), { error: 'Too many attempts. Wait 15 minutes and try again.', email, next }), 429);
    const a = q.get('SELECT * FROM admins WHERE email = ?', email);
    if (!a || !verifyPassword(req.body.password, a.password_hash)) return send(res, V.login(ctxFor(req), { error: 'That email and password combination is not right.', email, next }), 401);
    clearRate(key);
    createSession(res, req, { adminId: a.id });
    res.redirect(safeNext(next));
  });
  app.post('/admin/logout', (req, res) => { endSession(req, res, 'admin'); res.redirect('/admin/login'); });

  // ---------- dashboard ----------
  app.get('/admin', (req, res) => {
    const s = settings.all();
    const today = isoDate();
    const monthStart = today.slice(0, 8) + '01';
    const months = [];
    const d = new Date(); d.setUTCDate(1);
    for (let i = 5; i >= 0; i--) {
      const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
      const key = m.toISOString().slice(0, 7);
      const row = q.get("SELECT COUNT(*) c, COALESCE(SUM(total),0) v FROM bookings WHERE substr(created_at,1,7) = ? AND status <> 'cancelled'", key);
      months.push({ label: m.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }), count: row.c, value: row.v });
    }
    const socials = ['social_facebook', 'social_instagram', 'social_tiktok', 'social_youtube', 'social_x'].some((k) => s[k]);
    const data = {
      pending: q.get("SELECT COUNT(*) c FROM bookings WHERE status = 'pending'").c,
      cancelReq: q.get("SELECT COUNT(*) c FROM bookings WHERE status = 'cancel_requested'").c,
      revenue: q.get("SELECT COALESCE(SUM(total),0) v FROM bookings WHERE status IN ('confirmed','completed')").v,
      monthCount: q.get('SELECT COUNT(*) c FROM bookings WHERE created_at >= ?', monthStart).c,
      upcoming: q.get("SELECT COUNT(*) c FROM bookings WHERE status = 'confirmed' AND travel_date BETWEEN ? AND ?", today, addDays(today, 30)).c,
      months,
      packages: q.get("SELECT COUNT(*) c FROM packages WHERE status = 'published'").c,
      destinations: q.get('SELECT COUNT(*) c FROM destinations WHERE active = 1').c,
      unread: q.get('SELECT COUNT(*) c FROM enquiries WHERE is_read = 0').c,
      subscribers: q.get('SELECT COUNT(*) c FROM subscribers').c,
      users: q.get('SELECT COUNT(*) c FROM users').c,
      recent: q.all('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 8'),
      top: q.all('SELECT p.id, p.title, COUNT(b.id) n FROM bookings b JOIN packages p ON p.id = b.package_id GROUP BY p.id ORDER BY n DESC LIMIT 5'),
      checklist: [
        { label: 'Set up email so travellers get confirmations', done: mail.enabled(), href: '/admin/settings?tab=email' },
        { label: 'Review the terms and privacy pages', done: !q.get('SELECT 1 FROM pages WHERE is_template = 1'), href: '/admin/pages', hint: 'They are templates and need your own wording.' },
        { label: 'Check the sample packages and prices', done: !q.get('SELECT 1 FROM packages WHERE is_sample = 1'), href: '/admin/packages', hint: 'Edit or delete each starter package.' },
        { label: 'Add your business address and opening hours', done: !!(s.contact_address && s.contact_hours), href: '/admin/settings?tab=contact' },
        { label: 'Add your social media links', done: socials, href: '/admin/settings?tab=contact' },
        { label: 'Add genuine traveller reviews', done: !!q.get('SELECT 1 FROM reviews WHERE published = 1'), href: '/admin/reviews' },
        { label: 'Add a promo video (optional)', done: !!s.hero_video_url, href: '/admin/settings?tab=home' },
      ],
    };
    send(res, V.dashboard(actx(req), data));
  });

  // ---------- bookings ----------
  function bookingFilter(req) {
    const status = Object.keys(M.BOOKING_STATUSES).includes(req.query.status) ? req.query.status : '';
    const qtext = str(req.query.q, 100);
    const upcoming = req.query.upcoming === '1';
    const where = [], params = [];
    if (status) { where.push('status = ?'); params.push(status); }
    if (qtext) { where.push('(ref LIKE ? OR name LIKE ? OR email LIKE ? OR phone LIKE ? OR package_title LIKE ?)'); const l = `%${qtext}%`; params.push(l, l, l, l, l); }
    if (upcoming) { where.push('travel_date BETWEEN ? AND ?'); params.push(isoDate(), addDays(isoDate(), 30)); }
    return { status, qtext, upcoming, sql: where.length ? ' WHERE ' + where.join(' AND ') : '', params };
  }

  app.get('/admin/bookings', (req, res) => {
    const f = bookingFilter(req);
    const per = 25;
    const total = q.get('SELECT COUNT(*) c FROM bookings' + f.sql, ...f.params).c;
    const pages = Math.max(1, Math.ceil(total / per));
    const page = Math.min(pageOf(req), pages);
    const rows = q.all(`SELECT * FROM bookings${f.sql} ORDER BY ${f.upcoming ? 'travel_date ASC' : 'created_at DESC'} LIMIT ? OFFSET ?`, ...f.params, per, (page - 1) * per);
    const counts = { all: q.get('SELECT COUNT(*) c FROM bookings').c };
    for (const r of q.all('SELECT status, COUNT(*) c FROM bookings GROUP BY status')) counts[r.status] = r.c;
    send(res, V.bookings(actx(req), { rows, status: f.status, qtext: f.qtext, upcoming: f.upcoming, page, pages, total, counts }));
  });

  app.get('/admin/bookings/export.csv', (req, res) => {
    const f = bookingFilter(req);
    const rows = q.all(`SELECT * FROM bookings${f.sql} ORDER BY created_at DESC`, ...f.params);
    const out = csv([
      ['Reference', 'Status', 'Payment', 'Trip', 'Departure', 'Adults', 'Children', 'Total', 'Deposit', 'Paid', 'Name', 'Email', 'Phone', 'Requests', 'Internal notes', 'Received'],
      ...rows.map((b) => [b.ref, M.BOOKING_STATUSES[b.status], M.PAYMENT_STATUSES[b.payment_status], b.package_title, b.travel_date, b.adults, b.children, b.total, b.deposit, b.amount_paid, b.name, b.email, b.phone, b.notes, b.admin_notes, b.created_at]),
    ]);
    res.setHeader('Content-Disposition', `attachment; filename="bookings-${isoDate()}.csv"`);
    res.send('﻿' + out, 'text/csv; charset=utf-8');
  });

  const pkgOptions = () => q.all("SELECT id, title, price, status FROM packages ORDER BY status = 'published' DESC, title ASC");
  app.get('/admin/bookings/new', (req, res) => send(res, V.bookingNew(actx(req), { packages: pkgOptions(), values: { travel_date: addDays(isoDate(), 30) } })));
  app.post('/admin/bookings/new', (req, res) => {
    const b = req.body;
    const values = {
      package_id: int(b.package_id, 0), travel_date: str(b.travel_date, 10), status: Object.keys(M.BOOKING_STATUSES).includes(b.status) ? b.status : 'confirmed',
      adults: int(b.adults, 1, 1, 50), children: int(b.children, 0, 0, 50), name: str(b.name, 120), email: str(b.email, 160).toLowerCase(), phone: str(b.phone, 40),
      payment_status: Object.keys(M.PAYMENT_STATUSES).includes(b.payment_status) ? b.payment_status : 'unpaid', notes: str(b.notes, 2000),
    };
    const p = M.getPackage(values.package_id, { includeDrafts: true });
    let error = '';
    if (!p) error = 'Choose a package.';
    else if (!isIsoDate(values.travel_date)) error = 'Enter a departure date.';
    else if (values.name.length < 2) error = 'Enter the lead traveller’s name.';
    else if (!isEmail(values.email)) error = 'Enter a valid email address.';
    if (error) return send(res, V.bookingNew(actx(req), { packages: pkgOptions(), values, error }), 400);
    const s = settings.all();
    const pr = M.prices(p, s, values.travel_date);
    const total = Math.round((values.adults * pr.adult + values.children * pr.child) * 100) / 100;
    const deposit = Math.round(total * (Number(s.deposit_percent) || 0)) / 100;
    let ref; do { ref = bookingRef(s.booking_prefix || 'BGE'); } while (q.get('SELECT 1 FROM bookings WHERE ref = ?', ref));
    const user = q.get('SELECT id FROM users WHERE email = ?', values.email);
    const now = nowIso();
    const r = q.run(`INSERT INTO bookings (ref, package_id, package_title, user_id, name, email, phone, travel_date, adults, children, price_adult, price_child, total, deposit, notes, status, payment_status, amount_paid, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, ref, p.id, p.title, user ? user.id : null, values.name, values.email, values.phone, values.travel_date,
    values.adults, values.children, pr.adult, pr.child, total, deposit, values.notes, values.status, values.payment_status,
    values.payment_status === 'paid' ? total : values.payment_status === 'deposit' ? deposit : 0, now, now);
    if (b.notify) emails.bookingReceived(q.get('SELECT * FROM bookings WHERE id = ?', r.lastInsertRowid), s, `${baseUrl(req)}/booking/${ref}?t=${sign(ref)}`);
    res.flash('ok', `Booking ${ref} created.`);
    res.redirect(`/admin/bookings/${r.lastInsertRowid}`);
  });

  app.get('/admin/bookings/:id', (req, res) => {
    const b = q.get('SELECT * FROM bookings WHERE id = ?', id(req));
    if (!b) throw new HttpError(404, 'That booking no longer exists.');
    const pkg = b.package_id ? M.getPackage(b.package_id, { includeDrafts: true }) : null;
    const history = q.all('SELECT id, ref, package_title, status FROM bookings WHERE email = ? COLLATE NOCASE ORDER BY created_at DESC LIMIT 10', b.email);
    send(res, V.bookingDetail(actx(req), { b, pkg, history, publicLink: `${baseUrl(req)}/booking/${b.ref}?t=${sign(b.ref)}` }));
  });

  app.post('/admin/bookings/:id', (req, res) => {
    const b = q.get('SELECT * FROM bookings WHERE id = ?', id(req));
    if (!b) throw new HttpError(404, 'That booking no longer exists.');
    const body = req.body;
    const status = Object.keys(M.BOOKING_STATUSES).includes(body.status) ? body.status : b.status;
    const payment = Object.keys(M.PAYMENT_STATUSES).includes(body.payment_status) ? body.payment_status : b.payment_status;
    const date = isIsoDate(body.travel_date) ? body.travel_date : b.travel_date;
    q.run(`UPDATE bookings SET status = ?, payment_status = ?, amount_paid = ?, total = ?, deposit = ?, travel_date = ?, adults = ?, children = ?, admin_notes = ?, updated_at = ? WHERE id = ?`,
      status, payment, Math.max(0, num(body.amount_paid, b.amount_paid)), Math.max(0, num(body.total, b.total)), Math.max(0, num(body.deposit, b.deposit)), date,
      int(body.adults, b.adults, 1, 50), int(body.children, b.children, 0, 50), str(body.admin_notes, 5000), nowIso(), b.id);
    const updated = q.get('SELECT * FROM bookings WHERE id = ?', b.id);
    let msg = 'Booking updated.';
    if (body.notify && status !== b.status) {
      emails.statusChanged(updated, settings.all(), `${baseUrl(req)}/booking/${b.ref}?t=${sign(b.ref)}`);
      msg = mail.enabled() ? 'Booking updated and the traveller has been emailed.' : 'Booking updated. Email is not set up, so the traveller was not notified.';
    }
    res.flash('ok', msg);
    res.redirect(`/admin/bookings/${b.id}`);
  });

  app.post('/admin/bookings/:id/delete', (req, res) => {
    q.run('DELETE FROM bookings WHERE id = ?', id(req));
    res.flash('ok', 'Booking deleted.');
    res.redirect('/admin/bookings');
  });

  // ---------- packages ----------
  app.get('/admin/packages', (req, res) => {
    const status = ['published', 'draft'].includes(req.query.status) ? req.query.status : '';
    const destination = str(req.query.destination, 80);
    const qtext = str(req.query.q, 80);
    let rows = M.listPackages({ status: 'any', destination, q: qtext });
    if (status) rows = rows.filter((p) => p.status === status);
    const counts = Object.fromEntries(q.all('SELECT package_id, COUNT(*) n FROM bookings GROUP BY package_id').map((r) => [r.package_id, r.n]));
    rows.forEach((p) => { p.bookings = counts[p.id] || 0; });
    send(res, V.packages(actx(req), { rows, qtext, status, destination, destinations: M.listDestinations({ all: true }) }));
  });

  const formLists = () => ({ destinations: q.all('SELECT id, name FROM destinations ORDER BY name'), types: q.all('SELECT id, name, icon FROM holiday_types ORDER BY sort, name') });
  const typeIdsOf = (pid) => q.all('SELECT type_id FROM package_types WHERE package_id = ?', pid).map((r) => r.type_id);

  function readPackage(req) {
    const b = req.body;
    const labels = arr(b.itin_label), titles = arr(b.itin_title), texts = arr(b.itin_text);
    const itinerary = titles.map((t, i) => ({ label: str(labels[i], 30), title: str(t, 140), text: str(texts[i], 2000) })).filter((d) => d.title || d.text);
    const images = arr(b.image_url).map(cleanUrl).filter(Boolean);
    const p = {
      title: str(b.title, 140), slug: slugify(str(b.slug, 90) || str(b.title, 140)),
      destination_id: int(b.destination_id, 0) || null,
      type_ids: [...new Set(arr(b.type_ids).map((v) => int(v, 0)).filter(Boolean))],
      style: Object.keys(M.STYLES).includes(b.style) ? b.style : 'any',
      days: int(b.days, 1, 1, 60), nights: int(b.nights, 0, 0, 60),
      price: num(b.price, NaN), old_price: str(b.old_price) === '' ? null : num(b.old_price, null), child_price: str(b.child_price) === '' ? null : num(b.child_price, null),
      includes: str(b.includes, 80), board: str(b.board, 60), summary: str(b.summary, 400), overview: str(b.overview, 5000),
      highlights: str(b.highlights, 3000), inclusions: str(b.inclusions, 3000), exclusions: str(b.exclusions, 3000),
      itinerary, images, max_travellers: int(b.max_travellers, 12, 1, 50),
      featured: b.featured ? 1 : 0, is_deal: b.is_deal ? 1 : 0, badge: str(b.badge, 30),
      offer_label: str(b.offer_label, 60), offer_ends: isIsoDate(b.offer_ends) ? str(b.offer_ends, 10) : '',
      status: b.status === 'draft' ? 'draft' : 'published', sort: int(b.sort, 0),
    };
    // Prices by month
    p.month_prices = {};
    for (let m = 1; m <= 12; m++) {
      const e = {};
      const raw = str(b[`month_price_${m}`], 20);
      if (raw !== '') { const v = num(raw, NaN); if (Number.isFinite(v) && v >= 0) e.price = Math.round(v * 100) / 100; }
      if (b[`month_closed_${m}`]) e.closed = true;
      if (Object.keys(e).length) p.month_prices[m] = e;
    }
    // Hotels (each block posts its fields with its own key)
    p.hotels = [];
    let error = '';
    try {
      for (const f of req.files.filter((x) => x.field === 'image_files')) p.images.push(saveImage(f));
      for (const key of arr(b.hotel_key)) {
        if (!/^[A-Za-z0-9_]{1,24}$/.test(key)) continue;
        const g = (f, max = 300) => str(b[`hotel_${f}_${key}`], max);
        const h = {
          name: g('name', 120), location: g('location', 120), stars: Math.max(0, Math.min(5, Math.round(num(b[`hotel_stars_${key}`], 0) * 2) / 2)),
          nights: int(b[`hotel_nights_${key}`], 0, 0, 60), room: g('room', 120), board: g('board', 80), description: g('description', 3000),
          facilities: g('facilities', 2000), images: lines(b[`hotel_images_${key}`]).map(cleanUrl).filter(Boolean),
        };
        for (const f of req.files.filter((x) => x.field === `hotel_files_${key}`)) h.images.push(saveImage(f));
        if (!h.name && !h.location && !h.description && !h.images.length) continue;
        if (!h.name && !error) error = 'Give each hotel a name.';
        p.hotels.push(h);
      }
    } catch (e) { error = e.message; }
    p.from_price = M.computeFromPrice(p.price, p.month_prices);
    const fq = arr(b.faq_q), fa = arr(b.faq_a);
    p.faqs = fq.map((qq, i) => ({ question: str(qq, 200), answer: str(fa[i], 3000) })).filter((f) => f.question || f.answer);
    if (!error && p.faqs.some((f) => !f.question || !f.answer)) error = 'Each package FAQ needs both a question and an answer.';
    if (!error && Object.keys(p.month_prices).filter((m) => p.month_prices[m].closed).length === 12) error = 'At least one month must be available to book.';
    if (!error) {
      if (p.title.length < 3) error = 'Give the package a title.';
      else if (!Number.isFinite(p.price) || p.price < 0) error = 'Enter a price per adult.';
      else if (p.nights > p.days) error = 'Nights can’t be more than days.';
      else if (p.old_price !== null && p.old_price <= p.from_price) error = `The “was” price must be higher than the “from” price (${p.from_price}), or leave it empty.`;
    }
    return { p, error };
  }

  function savePackage(p, pid) {
    const now = nowIso();
    p.slug = uniqueSlug('packages', p.slug, pid || 0);
    const mp = p.month_prices || {};
    const vals = [p.title, p.slug, p.destination_id, p.style, p.days, p.nights, p.price, p.old_price, p.child_price, p.includes, p.board, p.summary, p.overview,
      p.highlights, JSON.stringify(p.itinerary), p.inclusions, p.exclusions, JSON.stringify(p.images), p.max_travellers, p.featured, p.is_deal, p.offer_label || '', p.offer_ends || '',
      JSON.stringify(mp), M.computeFromPrice(p.price, mp), JSON.stringify(p.hotels || []), JSON.stringify(p.faqs || []), p.badge, p.status, p.sort];
    return q.tx(() => {
      let newId = pid;
      if (pid) {
        q.run(`UPDATE packages SET title=?, slug=?, destination_id=?, style=?, days=?, nights=?, price=?, old_price=?, child_price=?, includes=?, board=?, summary=?, overview=?,
          highlights=?, itinerary=?, inclusions=?, exclusions=?, images=?, max_travellers=?, featured=?, is_deal=?, offer_label=?, offer_ends=?, month_prices=?, from_price=?, hotels=?, faqs=?, badge=?, status=?, sort=?, is_sample=0, updated_at=? WHERE id=?`, ...vals, now, pid);
      } else {
        newId = Number(q.run(`INSERT INTO packages (title, slug, destination_id, style, days, nights, price, old_price, child_price, includes, board, summary, overview,
          highlights, itinerary, inclusions, exclusions, images, max_travellers, featured, is_deal, offer_label, offer_ends, month_prices, from_price, hotels, faqs, badge, status, sort, created_at, updated_at) VALUES (${vals.map(() => '?').join(',')},?,?)`, ...vals, now, now).lastInsertRowid);
      }
      M.setPackageTypes(newId, p.type_ids || []);
      return newId;
    });
  }

  app.get('/admin/packages/new', (req, res) => send(res, V.packageForm(actx(req), { p: { images: [], itinerary: [] }, ...formLists() })));
  app.post('/admin/packages/new', (req, res) => {
    const { p, error } = readPackage(req);
    if (error) return send(res, V.packageForm(actx(req), { p, error, ...formLists() }), 400);
    const newId = savePackage(p);
    res.flash('ok', `“${p.title}” created${p.status === 'draft' ? ' as a draft' : ' and published'}.`);
    res.redirect(`/admin/packages/${newId}`);
  });
  app.get('/admin/packages/:id', (req, res) => {
    const p = M.getPackage(id(req), { includeDrafts: true });
    if (!p) throw new HttpError(404, 'That package no longer exists.');
    p.type_ids = typeIdsOf(p.id);
    send(res, V.packageForm(actx(req), { p, ...formLists() }));
  });
  app.post('/admin/packages/:id', (req, res) => {
    const pid = id(req);
    if (!q.get('SELECT 1 FROM packages WHERE id = ?', pid)) throw new HttpError(404, 'That package no longer exists.');
    const { p, error } = readPackage(req);
    if (error) return send(res, V.packageForm(actx(req), { p: { ...p, id: pid }, error, ...formLists() }), 400);
    savePackage(p, pid);
    res.flash('ok', 'Package saved.');
    res.redirect(`/admin/packages/${pid}`);
  });
  app.post('/admin/packages/:id/duplicate', (req, res) => {
    const src = q.get('SELECT * FROM packages WHERE id = ?', id(req));
    if (!src) throw new HttpError(404, 'That package no longer exists.');
    const p = { ...src, title: `${src.title} (copy)`, slug: slugify(`${src.slug}-copy`), itinerary: parseJson(src.itinerary, []), images: parseJson(src.images, []), month_prices: parseJson(src.month_prices, {}), hotels: parseJson(src.hotels, []), faqs: parseJson(src.faqs, []), featured: 0, status: 'draft', type_ids: typeIdsOf(src.id) };
    const newId = savePackage(p);
    res.flash('ok', 'Copy created as a draft.');
    res.redirect(`/admin/packages/${newId}`);
  });
  app.post('/admin/packages/:id/delete', (req, res) => {
    q.run('DELETE FROM packages WHERE id = ?', id(req));
    res.flash('ok', 'Package deleted.');
    res.redirect('/admin/packages');
  });

  // ---------- destinations ----------
  app.get('/admin/destinations', (req, res) => send(res, V.destinations(actx(req), { rows: M.listDestinations({ all: true }) })));
  function readDest(req) {
    const b = req.body;
    const d = { name: str(b.name, 80), region: str(b.region, 80), summary: str(b.summary, 160), description: str(b.description, 8000), popular: b.popular ? 1 : 0, in_menu: b.in_menu ? 1 : 0, active: b.active ? 1 : 0, sort: int(b.sort, 0) };
    d.slug = slugify(str(b.slug, 80) || d.name);
    let error = '';
    try { d.image = imageInput(req, 'image'); } catch (e) { error = e.message; d.image = cleanUrl(b.image); }
    if (!error && d.name.length < 2) error = 'Enter a name.';
    return { d, error };
  }
  app.get('/admin/destinations/new', (req, res) => send(res, V.destinationForm(actx(req), { d: {} })));
  app.post('/admin/destinations/new', (req, res) => {
    const { d, error } = readDest(req);
    if (error) return send(res, V.destinationForm(actx(req), { d, error }), 400);
    d.slug = uniqueSlug('destinations', d.slug);
    const r = q.run('INSERT INTO destinations (name, slug, region, summary, description, image, popular, in_menu, sort, active, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      d.name, d.slug, d.region, d.summary, d.description, d.image, d.popular, d.in_menu, d.sort, d.active, nowIso());
    res.flash('ok', `${d.name} added.`);
    res.redirect(`/admin/destinations/${r.lastInsertRowid}`);
  });
  app.get('/admin/destinations/:id', (req, res) => {
    const d = q.get('SELECT * FROM destinations WHERE id = ?', id(req));
    if (!d) throw new HttpError(404, 'That destination no longer exists.');
    send(res, V.destinationForm(actx(req), { d }));
  });
  app.post('/admin/destinations/:id', (req, res) => {
    const did = id(req);
    const { d, error } = readDest(req);
    if (error) return send(res, V.destinationForm(actx(req), { d: { ...d, id: did }, error }), 400);
    d.slug = uniqueSlug('destinations', d.slug, did);
    q.run('UPDATE destinations SET name=?, slug=?, region=?, summary=?, description=?, image=?, popular=?, in_menu=?, sort=?, active=? WHERE id=?',
      d.name, d.slug, d.region, d.summary, d.description, d.image, d.popular, d.in_menu, d.sort, d.active, did);
    res.flash('ok', 'Destination saved.');
    res.redirect(`/admin/destinations/${did}`);
  });
  app.post('/admin/destinations/:id/delete', (req, res) => {
    q.run('DELETE FROM destinations WHERE id = ?', id(req));
    res.flash('ok', 'Destination deleted.');
    res.redirect('/admin/destinations');
  });

  // ---------- holiday types ----------
  app.get('/admin/experiences', (req, res) => res.redirect('/admin/holiday-types', 301));
  app.get('/admin/holiday-types', (req, res) => send(res, V.holidayTypes(actx(req), { rows: M.listHolidayTypes({ all: true }) })));
  function readType(req) {
    const b = req.body;
    const t = { name: str(b.name, 60), description: str(b.description, 160), intro: str(b.intro, 2000), icon: /^[a-z]+$/.test(str(b.icon)) ? str(b.icon) : 'compass', active: b.active ? 1 : 0, in_menu: b.in_menu ? 1 : 0, sort: int(b.sort, 0) };
    t.slug = slugify(str(b.slug, 60) || t.name);
    let error = '';
    try { t.image = imageInput(req, 'image'); } catch (err) { error = err.message; t.image = cleanUrl(b.image); }
    if (!error && t.name.length < 2) error = 'Enter a name.';
    return { t, error };
  }
  app.get('/admin/holiday-types/new', (req, res) => send(res, V.holidayTypeForm(actx(req), { t: {} })));
  app.post('/admin/holiday-types/new', (req, res) => {
    const { t, error } = readType(req);
    if (error) return send(res, V.holidayTypeForm(actx(req), { t, error }), 400);
    t.slug = uniqueSlug('holiday_types', t.slug);
    const r = q.run('INSERT INTO holiday_types (name, slug, icon, description, intro, image, in_menu, sort, active) VALUES (?,?,?,?,?,?,?,?,?)', t.name, t.slug, t.icon, t.description, t.intro, t.image, t.in_menu, t.sort, t.active);
    res.flash('ok', `${t.name} added. Tick it on packages to list them there.`);
    res.redirect(`/admin/holiday-types/${r.lastInsertRowid}`);
  });
  app.get('/admin/holiday-types/:id', (req, res) => {
    const t = q.get('SELECT * FROM holiday_types WHERE id = ?', id(req));
    if (!t) throw new HttpError(404, 'That holiday type no longer exists.');
    send(res, V.holidayTypeForm(actx(req), { t }));
  });
  app.post('/admin/holiday-types/:id', (req, res) => {
    const tid = id(req);
    const { t, error } = readType(req);
    if (error) return send(res, V.holidayTypeForm(actx(req), { t: { ...t, id: tid }, error }), 400);
    t.slug = uniqueSlug('holiday_types', t.slug, tid);
    q.run('UPDATE holiday_types SET name=?, slug=?, icon=?, description=?, intro=?, image=?, in_menu=?, sort=?, active=? WHERE id=?', t.name, t.slug, t.icon, t.description, t.intro, t.image, t.in_menu, t.sort, t.active, tid);
    res.flash('ok', 'Holiday type saved.');
    res.redirect(`/admin/holiday-types/${tid}`);
  });
  app.post('/admin/holiday-types/:id/delete', (req, res) => {
    q.run('DELETE FROM holiday_types WHERE id = ?', id(req));
    res.flash('ok', 'Holiday type deleted.');
    res.redirect('/admin/holiday-types');
  });

  // ---------- FAQs ----------
  app.get('/admin/faqs', (req, res) => {
    const packages = q.all("SELECT id, title, faqs FROM packages ORDER BY status = 'published' DESC, sort ASC, title ASC").map((p) => ({ id: p.id, title: p.title, faq_count: parseJson(p.faqs, []).length }));
    send(res, V.faqsAdmin(actx(req), { rows: M.listFaqs({ all: true }), packages }));
  });
  function readFaq(req) {
    const b = req.body;
    const f = { question: str(b.question, 200), answer: str(b.answer, 5000), published: b.published ? 1 : 0, sort: int(b.sort, 0) };
    let error = '';
    if (f.question.length < 3) error = 'Enter the question.';
    else if (f.answer.length < 2) error = 'Enter the answer.';
    return { f, error };
  }
  app.get('/admin/faqs/new', (req, res) => {
    const next = (q.get('SELECT MAX(sort) m FROM faqs').m ?? -1) + 1;
    send(res, V.faqForm(actx(req), { f: { sort: next } }));
  });
  app.post('/admin/faqs/new', (req, res) => {
    const { f, error } = readFaq(req);
    if (error) return send(res, V.faqForm(actx(req), { f, error }), 400);
    q.run('INSERT INTO faqs (question, answer, sort, published, created_at) VALUES (?,?,?,?,?)', f.question, f.answer, f.sort, f.published, nowIso());
    res.flash('ok', 'Question added.');
    res.redirect('/admin/faqs');
  });
  app.get('/admin/faqs/:id', (req, res) => {
    const f = q.get('SELECT * FROM faqs WHERE id = ?', id(req));
    if (!f) throw new HttpError(404, 'That question no longer exists.');
    send(res, V.faqForm(actx(req), { f }));
  });
  app.post('/admin/faqs/:id', (req, res) => {
    const fid = id(req);
    const { f, error } = readFaq(req);
    if (error) return send(res, V.faqForm(actx(req), { f: { ...f, id: fid }, error }), 400);
    q.run('UPDATE faqs SET question = ?, answer = ?, sort = ?, published = ? WHERE id = ?', f.question, f.answer, f.sort, f.published, fid);
    res.flash('ok', 'Question saved.');
    res.redirect('/admin/faqs');
  });
  app.post('/admin/faqs/:id/move', (req, res) => {
    const fid = id(req);
    const list = M.listFaqs({ all: true });
    const i = list.findIndex((f) => f.id === fid);
    const j = req.body.dir === 'up' ? i - 1 : i + 1;
    if (i > -1 && j >= 0 && j < list.length) {
      [list[i], list[j]] = [list[j], list[i]];
      q.tx(() => list.forEach((f, k) => q.run('UPDATE faqs SET sort = ? WHERE id = ?', k, f.id)));
    }
    res.redirect('/admin/faqs');
  });
  app.post('/admin/faqs/:id/delete', (req, res) => {
    q.run('DELETE FROM faqs WHERE id = ?', id(req));
    res.flash('ok', 'Question deleted.');
    res.redirect('/admin/faqs');
  });

  // ---------- reviews ----------
  app.get('/admin/reviews', (req, res) => send(res, V.reviews(actx(req), {
    rows: q.all('SELECT r.*, p.title AS package_title FROM reviews r LEFT JOIN packages p ON p.id = r.package_id ORDER BY r.sort ASC, r.created_at DESC'),
  })));
  const pkgList = () => q.all('SELECT id, title FROM packages ORDER BY title');
  function readReview(req) {
    const b = req.body;
    const r = { name: str(b.name, 80), location: str(b.location, 80), text: str(b.text, 2000), rating: int(b.rating, 5, 1, 5), package_id: int(b.package_id, 0) || null, published: b.published ? 1 : 0, sort: int(b.sort, 0) };
    let error = '';
    try { r.avatar = imageInput(req, 'avatar'); } catch (e) { error = e.message; r.avatar = cleanUrl(b.avatar); }
    if (!error && r.name.length < 2) error = 'Enter the traveller’s name.';
    if (!error && r.text.length < 5) error = 'Enter the review text.';
    return { r, error };
  }
  app.get('/admin/reviews/new', (req, res) => send(res, V.reviewForm(actx(req), { r: {}, packages: pkgList() })));
  app.post('/admin/reviews/new', (req, res) => {
    const { r, error } = readReview(req);
    if (error) return send(res, V.reviewForm(actx(req), { r, error, packages: pkgList() }), 400);
    const ins = q.run('INSERT INTO reviews (name, location, text, rating, avatar, package_id, published, sort, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      r.name, r.location, r.text, r.rating, r.avatar, r.package_id, r.published, r.sort, nowIso());
    res.flash('ok', 'Review added.');
    res.redirect(`/admin/reviews/${ins.lastInsertRowid}`);
  });
  app.get('/admin/reviews/:id', (req, res) => {
    const r = q.get('SELECT * FROM reviews WHERE id = ?', id(req));
    if (!r) throw new HttpError(404, 'That review no longer exists.');
    send(res, V.reviewForm(actx(req), { r, packages: pkgList() }));
  });
  app.post('/admin/reviews/:id', (req, res) => {
    const rid = id(req);
    const { r, error } = readReview(req);
    if (error) return send(res, V.reviewForm(actx(req), { r: { ...r, id: rid }, error, packages: pkgList() }), 400);
    q.run('UPDATE reviews SET name=?, location=?, text=?, rating=?, avatar=?, package_id=?, published=?, sort=? WHERE id=?', r.name, r.location, r.text, r.rating, r.avatar, r.package_id, r.published, r.sort, rid);
    res.flash('ok', 'Review saved.');
    res.redirect(`/admin/reviews/${rid}`);
  });
  app.post('/admin/reviews/:id/delete', (req, res) => {
    q.run('DELETE FROM reviews WHERE id = ?', id(req));
    res.flash('ok', 'Review deleted.');
    res.redirect('/admin/reviews');
  });

  // ---------- enquiries ----------
  app.get('/admin/enquiries', (req, res) => send(res, V.enquiries(actx(req), { rows: q.all('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 500') })));
  app.get('/admin/enquiries/:id', (req, res) => {
    const e = q.get('SELECT * FROM enquiries WHERE id = ?', id(req));
    if (!e) throw new HttpError(404, 'That enquiry no longer exists.');
    if (!e.is_read) q.run('UPDATE enquiries SET is_read = 1 WHERE id = ?', e.id);
    send(res, V.enquiry(actx(req), { e }));
  });
  app.post('/admin/enquiries/:id/unread', (req, res) => { q.run('UPDATE enquiries SET is_read = 0 WHERE id = ?', id(req)); res.redirect('/admin/enquiries'); });
  app.post('/admin/enquiries/:id/delete', (req, res) => { q.run('DELETE FROM enquiries WHERE id = ?', id(req)); res.flash('ok', 'Enquiry deleted.'); res.redirect('/admin/enquiries'); });

  // ---------- subscribers & travellers ----------
  app.get('/admin/subscribers', (req, res) => send(res, V.subscribers(actx(req), { rows: q.all('SELECT * FROM subscribers ORDER BY created_at DESC') })));
  app.get('/admin/subscribers/export.csv', (req, res) => {
    const rows = q.all('SELECT email, created_at FROM subscribers ORDER BY created_at DESC');
    res.setHeader('Content-Disposition', `attachment; filename="subscribers-${isoDate()}.csv"`);
    res.send('﻿' + csv([['Email', 'Subscribed'], ...rows.map((r) => [r.email, r.created_at])]), 'text/csv; charset=utf-8');
  });
  app.post('/admin/subscribers/:id/delete', (req, res) => { q.run('DELETE FROM subscribers WHERE id = ?', id(req)); res.flash('ok', 'Subscriber removed.'); res.redirect('/admin/subscribers'); });

  app.get('/admin/travellers', (req, res) => send(res, V.travellers(actx(req), {
    rows: q.all('SELECT u.*, (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) AS bookings FROM users u ORDER BY u.created_at DESC'),
  })));
  app.post('/admin/travellers/:id/delete', (req, res) => {
    const uid = id(req);
    q.run('DELETE FROM sessions WHERE user_id = ?', uid);
    q.run('DELETE FROM users WHERE id = ?', uid);
    res.flash('ok', 'Traveller account deleted. Their bookings are kept.');
    res.redirect('/admin/travellers');
  });

  // ---------- pages ----------
  app.get('/admin/pages', (req, res) => send(res, V.pages(actx(req), { rows: q.all("SELECT * FROM pages WHERE slug <> 'faqs' ORDER BY id") })));
  const RESERVED = ['admin', 'account', 'booking', 'packages', 'destinations', 'experiences', 'deals', 'special-offers', 'holiday-types', 'holidays', 'faqs', 'contact', 'saved', 'static', 'uploads', 'subscribe', 'robots.txt', 'sitemap.xml'];
  app.get('/admin/pages/new', (req, res) => send(res, V.pageForm(actx(req), { pg: {} })));
  app.post('/admin/pages/new', (req, res) => {
    const pg = { title: str(req.body.title, 120), content: str(req.body.content, 100000) };
    pg.slug = slugify(str(req.body.slug, 60) || pg.title);
    if (pg.title.length < 2) return send(res, V.pageForm(actx(req), { pg, error: 'Enter a title.' }), 400);
    if (RESERVED.includes(pg.slug)) return send(res, V.pageForm(actx(req), { pg, error: `“/${pg.slug}” is used by the website. Choose another address.` }), 400);
    pg.slug = uniqueSlug('pages', pg.slug);
    const r = q.run('INSERT INTO pages (slug, title, content, is_template, updated_at) VALUES (?,?,?,0,?)', pg.slug, pg.title, pg.content, nowIso());
    res.flash('ok', `Page created at /${pg.slug}. Link to it from another page or your social profiles.`);
    res.redirect(`/admin/pages/${r.lastInsertRowid}`);
  });
  app.get('/admin/pages/:id', (req, res) => {
    const pg = q.get('SELECT * FROM pages WHERE id = ?', id(req));
    if (!pg) throw new HttpError(404, 'That page no longer exists.');
    send(res, V.pageForm(actx(req), { pg }));
  });
  app.post('/admin/pages/:id', (req, res) => {
    const pg = q.get('SELECT * FROM pages WHERE id = ?', id(req));
    if (!pg) throw new HttpError(404, 'That page no longer exists.');
    const title = str(req.body.title, 120) || pg.title;
    let slug = pg.slug;
    if (!V.CORE_PAGES.includes(pg.slug) && req.body.slug !== undefined) {
      const wanted = slugify(str(req.body.slug, 60) || title);
      if (RESERVED.includes(wanted)) return send(res, V.pageForm(actx(req), { pg: { ...pg, title, content: str(req.body.content, 100000) }, error: `“/${wanted}” is used by the website. Choose another address.` }), 400);
      slug = uniqueSlug('pages', wanted, pg.id);
    }
    q.run('UPDATE pages SET title = ?, slug = ?, content = ?, is_template = 0, updated_at = ? WHERE id = ?', title, slug, str(req.body.content, 100000), nowIso(), pg.id);
    res.flash('ok', 'Page saved.');
    res.redirect(`/admin/pages/${pg.id}`);
  });
  app.post('/admin/pages/:id/delete', (req, res) => {
    const pg = q.get('SELECT * FROM pages WHERE id = ?', id(req));
    if (pg && !V.CORE_PAGES.includes(pg.slug)) q.run('DELETE FROM pages WHERE id = ?', pg.id);
    res.flash('ok', 'Page deleted.');
    res.redirect('/admin/pages');
  });

  // ---------- settings ----------
  const validTab = (t) => (settings.GROUPS.some((g) => g.id === t) || t === 'email' ? t : 'general');
  app.get('/admin/settings', (req, res) => send(res, V.settingsPage(actx(req), {
    tab: validTab(req.query.tab), values: settings.all(), mailEnabled: mail.enabled(), mailFrom: require('../config').smtp.from,
  })));
  app.post('/admin/settings', (req, res) => {
    const tab = validTab(req.query.tab);
    const out = {};
    try {
      for (const f of settings.FIELDS.filter((x) => x.group === tab)) {
        const sent = req.body[f.key] !== undefined || req.files.some((x) => x.field === `${f.key}_file`);
        if (!sent) continue; // keep the saved value for anything the form didn't send
        if (f.type === 'image') out[f.key] = imageInput(req, f.key);
        else if (f.type === 'number') out[f.key] = String(Math.max(0, Math.min(100, num(req.body[f.key], Number(f.def)))));
        else if (f.type === 'url') { const u = str(req.body[f.key], 500); out[f.key] = !u || /^https?:\/\//i.test(u) ? u : `https://${u}`; }
        else out[f.key] = str(req.body[f.key], f.type === 'textarea' ? 4000 : 300);
      }
    } catch (e) {
      res.flash('error', e.message);
      return res.redirect(`/admin/settings?tab=${tab}`);
    }
    if (tab === 'general' && !out.site_name) out.site_name = settings.DEFAULTS.site_name;
    settings.save(out);
    res.flash('ok', 'Settings saved.');
    res.redirect(`/admin/settings?tab=${tab}`);
  });
  app.post('/admin/settings/test-email', async (req, res) => {
    const s = settings.all();
    const to = s.notify_email || req.admin.email;
    if (!mail.enabled()) { res.flash('error', 'Email is not set up yet.'); return res.redirect('/admin/settings?tab=email'); }
    await mail.sendMail({ siteName: s.site_name, to, subject: `Test email from ${s.site_name}`, text: 'Email delivery from your website is working.', html: '<p>Email delivery from your website is working.</p>' });
    res.flash('ok', `Test email sent to ${to}. Check the inbox (and spam folder). If nothing arrives, check the server log.`);
    res.redirect('/admin/settings?tab=email');
  });

  // ---------- admin users ----------
  app.get('/admin/team', (req, res) => send(res, V.team(actx(req), { admins: q.all('SELECT id, name, email FROM admins ORDER BY id') })));
  app.post('/admin/team', (req, res) => {
    const name = str(req.body.name, 80), email = str(req.body.email, 160).toLowerCase(), pw = String(req.body.password || '');
    const fail = (error) => send(res, V.team(actx(req), { admins: q.all('SELECT id, name, email FROM admins ORDER BY id'), error }), 400);
    if (name.length < 2 || !isEmail(email)) return fail('Enter a name and a valid email address.');
    if (pw.length < 10) return fail('The temporary password needs at least 10 characters.');
    if (q.get('SELECT 1 FROM admins WHERE email = ?', email)) return fail('That email already has admin access.');
    q.run('INSERT INTO admins (name, email, password_hash, created_at) VALUES (?,?,?,?)', name, email, hashPassword(pw), nowIso());
    res.flash('ok', `${name} can now sign in to the dashboard.`);
    res.redirect('/admin/team');
  });
  app.post('/admin/team/password', (req, res) => {
    const a = q.get('SELECT * FROM admins WHERE id = ?', req.admin.id);
    if (!verifyPassword(req.body.current, a.password_hash)) { res.flash('error', 'Your current password is not right.'); return res.redirect('/admin/team'); }
    if (String(req.body.password || '').length < 10) { res.flash('error', 'Choose a new password of at least 10 characters.'); return res.redirect('/admin/team'); }
    q.run('UPDATE admins SET password_hash = ? WHERE id = ?', hashPassword(req.body.password), a.id);
    q.run('DELETE FROM sessions WHERE admin_id = ? AND id <> ?', a.id, req.session.id);
    res.flash('ok', 'Password updated. Other devices have been signed out.');
    res.redirect('/admin/team');
  });
  app.post('/admin/team/:id/delete', (req, res) => {
    const aid = id(req);
    if (aid === req.admin.id) { res.flash('error', 'You can’t remove your own access.'); return res.redirect('/admin/team'); }
    q.run('DELETE FROM sessions WHERE admin_id = ?', aid);
    q.run('DELETE FROM admins WHERE id = ?', aid);
    res.flash('ok', 'Admin access removed.');
    res.redirect('/admin/team');
  });
};
