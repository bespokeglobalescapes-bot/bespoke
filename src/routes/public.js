'use strict';
const { q } = require('../db');
const config = require('../config');
const settings = require('../settings');
const M = require('../models');
const V = require('../views/public');
const L = require('../views/layout');
const { html } = require('../lib/html');
const emails = require('../emails');
const { sign, verifySigned, rateLimit } = require('../auth');
const { HttpError } = require('../lib/http');
const { str, int, num, isEmail, isIsoDate, isoDate, addDays, nowIso, bookingRef, esc } = { ...require('../lib/util'), ...require('../lib/html') };

function baseUrl(req) {
  if (config.baseUrl) return config.baseUrl;
  return `${req.secure ? 'https' : 'http'}://${req.headers.host || 'localhost'}`;
}

function ctxFor(req) {
  return {
    s: settings.all(),
    user: req.user,
    admin: req.admin,
    csrf: req.csrf,
    flash: req.flash,
    footerDestinations: q.all('SELECT name, slug FROM destinations WHERE active = 1 ORDER BY popular DESC, sort ASC LIMIT 6'),
    menu: { destinations: M.listDestinations({ menu: true }), types: M.listHolidayTypes({ menu: true }) },
  };
}

function send(res, page, status = 200) {
  res.setHeader('Cache-Control', 'private, no-cache');
  res.status(status).send(String(page));
}

function readFilters(qs) {
  const f = {
    q: str(qs.q, 80), from: isIsoDate(qs.from) ? qs.from : '', to: isIsoDate(qs.to) ? qs.to : '',
    adults: int(qs.adults, 2, 1, 16), children: int(qs.children, 0, 0, 10),
    destination: str(qs.destination, 80), type: str(qs.type, 80),
    style: ['solo', 'couple', 'family', 'group'].includes(qs.style) ? qs.style : '',
    max: int(qs.max, 0, 0) || '', min: int(qs.min, 0, 0) || '',
    duration: ['short', 'week', 'long'].includes(qs.duration) ? qs.duration : '',
    deal: qs.deal === '1' ? '1' : '', sort: str(qs.sort, 20),
  };
  // If the search text exactly names a destination, filter by it instead of free text.
  if (f.q && !f.destination) {
    const d = q.get('SELECT slug FROM destinations WHERE name = ? COLLATE NOCASE AND active = 1', f.q);
    if (d) { f.destination = d.slug; f.q = ''; }
  }
  return f;
}

function carryQuery(f) {
  const p = new URLSearchParams();
  if (f.from) p.set('date', f.from);
  if (f.adults && f.adults !== 2) p.set('adults', f.adults);
  if (f.children) p.set('children', f.children);
  const s = p.toString();
  return s ? `?${s}` : '';
}

function canViewBooking(req, b) {
  if (req.admin) return true;
  if (req.user && b.user_id === req.user.id) return true;
  return verifySigned(b.ref, req.query.t || req.body.t);
}

module.exports = function register(app) {
  app.get('/', (req, res) => {
    const ctx = ctxFor(req);
    const all = M.listPackages();
    // Hero slider: every package ticked as a popular choice (in sort order); falls back to the first few trips.
    let picks = all.filter((p) => p.featured);
    if (!picks.length) picks = all.slice(0, 5);
    let popular = M.listDestinations({ popular: true });
    if (!popular.length) popular = M.listDestinations();
    let deals = M.listPackages({ deal: true, limit: 4 });
    if (!deals.length) deals = all.filter((p) => !p.featured).slice(0, 4);
    if (!deals.length) deals = all.slice(0, 4);
    send(res, V.home(ctx, {
      picks, popular: popular.slice(0, 6), deals, reviews: M.publishedReviews(10), faqs: M.listFaqs(),
      destinations: M.listDestinations(), types: M.listHolidayTypes(),
    }));
  });

  app.get('/destinations', (req, res) => send(res, V.destinationsPage(ctxFor(req), { destinations: M.listDestinations() })));

  app.get('/destinations/:slug', (req, res) => {
    const d = M.getDestination(req.params.slug);
    if (!d) throw new HttpError(404, 'We could not find that destination.');
    const others = M.listDestinations().filter((x) => x.id !== d.id).slice(0, 6);
    send(res, V.destinationPage(ctxFor(req), { d, packages: M.listPackages({ destination: d.slug }), others }));
  });

  app.get('/packages', (req, res) => {
    const f = readFilters(req.query);
    const packages = M.listPackages({ ...f, deal: !!f.deal });
    send(res, V.packagesPage(ctxFor(req), { packages, filters: f, destinations: M.listDestinations(), types: M.listHolidayTypes(), carry: carryQuery(f) }));
  });

  // Old addresses from earlier versions of the site.
  app.get('/deals', (req, res) => res.redirect('/special-offers' + (req.search || ''), 301));
  app.get('/experiences', (req, res) => res.redirect('/holiday-types', 301));

  app.get('/special-offers', (req, res) => {
    const f = readFilters(req.query);
    if (!f.sort) f.sort = 'ending';
    send(res, V.specialOffersPage(ctxFor(req), {
      packages: M.listPackages({ ...f, deal: true }), filters: f,
      destinations: M.listDestinations({ menu: true }), types: M.listHolidayTypes(),
    }));
  });

  app.get('/faqs', (req, res) => send(res, V.faqsPage(ctxFor(req), { faqs: M.listFaqs() })));

  app.get('/holiday-types', (req, res) => send(res, V.holidayTypesPage(ctxFor(req), { types: M.listHolidayTypes() })));

  app.get('/holidays/:slug', (req, res) => {
    const t = M.getHolidayType(req.params.slug);
    if (!t) throw new HttpError(404, 'We could not find that holiday type.');
    const sort = str(req.query.sort, 20);
    send(res, V.holidayTypePage(ctxFor(req), { t, packages: M.listPackages({ type: t.slug, sort }), types: M.listHolidayTypes(), sort }));
  });

  app.get('/packages/:slug', (req, res) => {
    const p = M.getPackage(req.params.slug, { includeDrafts: !!req.admin });
    if (!p) throw new HttpError(404, 'That trip is no longer available.');
    const s = settings.all();
    const typeIds = new Set(M.packageTypes(p.id).map((t) => t.id));
    const sharesType = (x) => q.all('SELECT type_id FROM package_types WHERE package_id = ?', x.id).some((r) => typeIds.has(r.type_id));
    const related = M.listPackages({}).filter((x) => x.id !== p.id && (x.destination_id === p.destination_id || sharesType(x))).slice(0, 4);
    const reviews = q.all('SELECT * FROM reviews WHERE package_id = ? AND published = 1 ORDER BY sort ASC, created_at DESC LIMIT 12', p.id);
    const prefill = { date: isIsoDate(req.query.date) ? req.query.date : '', adults: int(req.query.adults, 2, 1, 16), children: int(req.query.children, 0, 0, 10) };
    send(res, V.packagePage(ctxFor(req), { p, related, reviews, prices: M.prices(p, s), prefill, types: M.packageTypes(p.id) }));
  });

  app.post('/packages/:slug/book', (req, res) => {
    const p = M.getPackage(req.params.slug);
    if (!p) throw new HttpError(404, 'That trip is no longer available.');
    const s = settings.all();
    const b = req.body;
    const back = (msg) => {
      res.flash('error', msg);
      const qs = new URLSearchParams({ date: str(b.travel_date, 10), adults: String(int(b.adults, 2, 1)), children: String(int(b.children, 0, 0)) });
      res.redirect(`/packages/${p.slug}?${qs}#book`);
    };
    if (str(b.website)) return res.redirect(`/packages/${p.slug}`); // bot
    if (!rateLimit(`book:${req.ip}`, 10, 3600000)) return back('Too many booking requests from this connection. Please try again later or call us.');
    const date = str(b.travel_date, 10);
    const tomorrow = addDays(isoDate(), 1);
    const max = p.max_travellers || 16;
    const adults = int(b.adults, 0);
    const children = int(b.children, 0);
    const name = str(b.name, 120);
    const email = str(b.email, 160).toLowerCase();
    const phone = str(b.phone, 40);
    if (!isIsoDate(date) || date < tomorrow) return back('Choose a departure date from tomorrow onwards.');
    if (date > addDays(isoDate(), 730)) return back('Choose a departure date within the next two years.');
    if (adults < 1 || adults > 16 || children < 0 || children > 10) return back('Add at least one adult traveller.');
    if (adults + children > max) return back(`This trip takes up to ${max} travellers per booking. Contact us for larger groups.`);
    if (name.length < 2) return back('Enter the lead traveller’s full name.');
    if (!isEmail(email)) return back('Enter a valid email address so we can confirm your booking.');
    if (phone.replace(/\D/g, '').length < 6) return back('Enter a phone number so we can reach you about availability.');
    if (!b.agree) return back('Tick the box to agree to the terms and privacy policy.');

    const pr = M.prices(p, s, date);
    if (!pr.available) return back(`This trip isn’t available in ${pr.monthName}. Choose a date in another month.`);
    const total = Math.round((adults * pr.adult + children * pr.child) * 100) / 100;
    const deposit = Math.round(total * (Math.max(0, Number(s.deposit_percent) || 0) / 100) * 100) / 100;
    let ref;
    do { ref = bookingRef(s.booking_prefix || 'BGE'); } while (q.get('SELECT 1 FROM bookings WHERE ref = ?', ref));
    const now = nowIso();
    q.run(`INSERT INTO bookings (ref, package_id, package_title, user_id, name, email, phone, travel_date, adults, children, price_adult, price_child, total, deposit, notes, status, payment_status, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending','unpaid',?,?)`,
    ref, p.id, p.title, req.user ? req.user.id : null, name, email, phone, date, adults, children, pr.adult, pr.child, total, deposit, str(b.notes, 2000), now, now);
    const booking = q.get('SELECT * FROM bookings WHERE ref = ?', ref);
    const link = `${baseUrl(req)}/booking/${ref}?t=${sign(ref)}`;
    emails.bookingReceived(booking, s, link);
    emails.newBookingAlert(booking, s, `${baseUrl(req)}/admin/bookings/${booking.id}`);
    res.redirect(`/booking/${ref}?t=${sign(ref)}&new=1`);
  });

  app.get('/booking/lookup', (req, res) => send(res, V.lookupPage(ctxFor(req), {})));
  app.post('/booking/lookup', (req, res) => {
    const ref = str(req.body.ref, 20).toUpperCase().replace(/\s+/g, '');
    const email = str(req.body.email, 160);
    if (!rateLimit(`lookup:${req.ip}`, 20, 900000)) {
      return send(res, V.lookupPage(ctxFor(req), { values: { ref, email }, error: 'Too many attempts. Please wait a few minutes and try again.' }), 429);
    }
    const b = q.get('SELECT ref FROM bookings WHERE ref = ? AND email = ? COLLATE NOCASE', ref, email);
    if (!b) return send(res, V.lookupPage(ctxFor(req), { values: { ref, email }, error: 'We could not find a booking with that reference and email. Check both and try again.' }), 404);
    res.redirect(`/booking/${b.ref}?t=${sign(b.ref)}`);
  });

  app.get('/booking/:ref', (req, res) => {
    const b = q.get('SELECT * FROM bookings WHERE ref = ?', req.params.ref);
    if (!b || !canViewBooking(req, b)) return res.redirect('/booking/lookup');
    // Signed-in traveller opening their emailed link: attach the guest booking to their account.
    if (req.user && !b.user_id && b.email.toLowerCase() === req.user.email.toLowerCase() && verifySigned(b.ref, req.query.t)) {
      q.run('UPDATE bookings SET user_id = ? WHERE id = ?', req.user.id, b.id);
    }
    const pkg = b.package_id ? M.getPackage(b.package_id, { includeDrafts: true }) : null;
    send(res, V.bookingPage(ctxFor(req), { b, pkg, token: sign(b.ref), justBooked: req.query.new === '1' }));
  });

  app.post('/booking/:ref/cancel', (req, res) => {
    const b = q.get('SELECT * FROM bookings WHERE ref = ?', req.params.ref);
    if (!b || !canViewBooking(req, b)) return res.redirect('/booking/lookup');
    if (['pending', 'confirmed'].includes(b.status)) {
      q.run("UPDATE bookings SET status = 'cancel_requested', updated_at = ? WHERE id = ?", nowIso(), b.id);
      emails.cancelRequestAlert({ ...b, status: 'cancel_requested' }, settings.all(), `${baseUrl(req)}/admin/bookings/${b.id}`);
      res.flash('ok', 'Cancellation requested. Our team will contact you to confirm.');
    }
    res.redirect(`/booking/${b.ref}?t=${sign(b.ref)}`);
  });

  app.get('/contact', (req, res) => send(res, V.contactPage(ctxFor(req), { values: { subject: str(req.query.subject, 160), name: req.user?.name, email: req.user?.email, phone: req.user?.phone } })));

  app.post('/contact', (req, res) => {
    const b = req.body;
    if (str(b.website)) return res.redirect('/contact');
    const values = { name: str(b.name, 120), email: str(b.email, 160), phone: str(b.phone, 40), subject: str(b.subject, 160), message: str(b.message, 5000) };
    const errors = {};
    if (values.name.length < 2) errors.name = 'Enter your name.';
    if (!isEmail(values.email)) errors.email = 'Enter a valid email address.';
    if (values.message.length < 5) errors.message = 'Tell us a little about your trip or question.';
    if (Object.keys(errors).length) return send(res, V.contactPage(ctxFor(req), { values, errors }), 400);
    if (!rateLimit(`contact:${req.ip}`, 8, 3600000)) { res.flash('error', 'Too many messages from this connection. Please email or call us instead.'); return res.redirect('/contact'); }
    const r = q.run('INSERT INTO enquiries (name, email, phone, subject, message, is_read, created_at) VALUES (?,?,?,?,?,0,?)', values.name, values.email, values.phone, values.subject, values.message, nowIso());
    emails.enquiryAlert(values, settings.all(), `${baseUrl(req)}/admin/enquiries/${r.lastInsertRowid}`);
    res.flash('ok', 'Thanks, your message has been sent. We will get back to you soon.');
    res.redirect('/contact');
  });

  app.post('/subscribe', (req, res) => {
    const email = str(req.body.email, 160).toLowerCase();
    const wantsJson = String(req.headers.accept || '').includes('application/json');
    const reply = (ok, msg, code = 200) => {
      if (wantsJson) return res.status(code).json({ ok, message: msg });
      res.flash(ok ? 'ok' : 'error', msg);
      res.redirect(req.headers.referer && new URL(req.headers.referer, 'http://x').host === req.headers.host ? new URL(req.headers.referer).pathname : '/');
    };
    if (str(req.body.website)) return reply(true, 'Thanks for subscribing!');
    if (!isEmail(email)) return reply(false, 'Enter a valid email address.', 400);
    if (!rateLimit(`sub:${req.ip}`, 10, 3600000)) return reply(false, 'Too many attempts. Please try again later.', 429);
    q.run('INSERT INTO subscribers (email, created_at) VALUES (?, ?) ON CONFLICT(email) DO NOTHING', email, nowIso());
    reply(true, 'Thanks for subscribing! Look out for our next offers.');
  });

  app.get('/saved', (req, res) => send(res, V.savedPage(ctxFor(req))));
  app.get('/saved/cards', (req, res) => {
    const s = settings.all();
    const items = str(req.query.items, 3000).split(',').map((x) => x.trim()).filter(Boolean).slice(0, 60);
    const pSlugs = items.filter((x) => x.startsWith('p:')).map((x) => x.slice(2));
    const dSlugs = items.filter((x) => x.startsWith('d:')).map((x) => x.slice(2));
    const pkgs = pSlugs.length ? M.listPackages().filter((p) => pSlugs.includes(p.slug)) : [];
    const dests = dSlugs.length ? M.listDestinations().filter((d) => dSlugs.includes(d.slug)) : [];
    const out = html`${pkgs.length ? html`<h2 class="account-h">Trips</h2><div class="pkg-grid">${pkgs.map((p) => L.packageCard(p, s))}</div>` : ''}
      ${dests.length ? html`<h2 class="account-h">Destinations</h2><div class="dest-grid">${dests.map((d) => L.destCard(d, s))}</div>` : ''}`;
    res.setHeader('Cache-Control', 'no-store');
    res.send(String(out));
  });

  // Browsers ask for /favicon.ico on their own; the icon files live in /static/img.
  app.get('/favicon.ico', (req, res) => res.redirect('/static/img/favicon.ico', 301));
  app.get('/site.webmanifest', (req, res) => {
    const s = settings.all();
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(JSON.stringify({
      name: s.site_name, short_name: String(s.site_name || '').split(' ')[0] || s.site_name, start_url: '/', display: 'browser',
      background_color: '#ffffff', theme_color: '#0A2463',
      icons: [
        { src: '/static/img/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/static/img/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    }), 'application/manifest+json; charset=utf-8');
  });
  app.get('/robots.txt',(req, res) => res.send(`User-agent: *\nDisallow: /admin\nDisallow: /account\nDisallow: /booking\nSitemap: ${baseUrl(req)}/sitemap.xml\n`, 'text/plain; charset=utf-8'));

  app.get('/sitemap.xml', (req, res) => {
    const base = baseUrl(req);
    const urls = ['/', '/destinations', '/packages', '/holiday-types', '/special-offers', '/faqs', '/contact',
      ...q.all('SELECT slug FROM holiday_types WHERE active = 1').map((t) => `/holidays/${t.slug}`),
      ...q.all("SELECT slug FROM pages WHERE slug <> 'faqs'").map((p) => `/${p.slug}`),
      ...q.all('SELECT slug FROM destinations WHERE active = 1').map((d) => `/destinations/${d.slug}`),
      ...q.all("SELECT slug FROM packages WHERE status = 'published'").map((p) => `/packages/${p.slug}`)];
    res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${esc(base + u)}</loc></url>`).join('\n')}\n</urlset>`, 'application/xml; charset=utf-8');
  });

  // Content pages edited in Admin → Pages (about, faqs, booking-guide, terms, privacy, …)
  app.get('/:page', (req, res, next) => {
    const pg = q.get('SELECT * FROM pages WHERE slug = ?', req.params.page);
    if (!pg) throw new HttpError(404, 'We could not find that page.');
    send(res, V.contentPage(ctxFor(req), { pg }));
  });
};

module.exports.ctxFor = ctxFor;
module.exports.send = send;
module.exports.baseUrl = baseUrl;
