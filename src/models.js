'use strict';
const { q } = require('./db');
const { parseJson } = require('./lib/util');

const STYLES = {
  solo: { label: 'Solo explorer', icon: 'backpack', text: 'Perfect for solo travellers seeking adventure.' },
  couple: { label: 'Couple getaway', icon: 'couple', text: 'Romantic trips made memorable.' },
  family: { label: 'Family vacation', icon: 'family', text: 'Fun and safe trips for the whole family.' },
  group: { label: 'Group adventure', icon: 'group', text: 'Shared experiences with friends.' },
  any: { label: 'Any traveller', icon: 'users', text: 'Great for everyone.' },
};

const BOOKING_STATUSES = {
  pending: 'Pending', confirmed: 'Confirmed', cancel_requested: 'Cancellation requested', cancelled: 'Cancelled', completed: 'Completed',
};
const PAYMENT_STATUSES = { unpaid: 'Unpaid', deposit: 'Deposit paid', paid: 'Paid in full', refunded: 'Refunded' };

const PKG_SELECT = `
  SELECT p.*, d.name AS dest_name, d.slug AS dest_slug, d.region AS dest_region,
         (p.is_deal = 1 AND (p.offer_ends IS NULL OR p.offer_ends = '' OR p.offer_ends >= date('now'))) AS offer_active,
         (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.package_id = p.id AND r.published = 1) AS rating,
         (SELECT COUNT(*) FROM reviews r WHERE r.package_id = p.id AND r.published = 1) AS review_count
  FROM packages p
  LEFT JOIN destinations d ON d.id = p.destination_id`;
const OFFER_ACTIVE = "p.is_deal = 1 AND (p.offer_ends IS NULL OR p.offer_ends = '' OR p.offer_ends >= date('now'))";

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Price for each calendar month: a month-specific price, the standard price, or closed.
function monthTable(p) {
  const base = Number(p.base_price ?? p.price) || 0;
  const mp = typeof p.month_prices === 'string' ? parseJson(p.month_prices, {}) : (p.month_prices || {});
  return MONTH_NAMES.map((name, i) => {
    const e = mp[i + 1] || mp[String(i + 1)] || {};
    const closed = !!e.closed;
    const custom = e.price !== undefined && e.price !== null && e.price !== '';
    return { month: i + 1, name, closed, custom, price: closed ? null : (custom ? Number(e.price) : base) };
  });
}
function computeFromPrice(base, monthPrices) {
  const open = monthTable({ price: base, month_prices: monthPrices }).filter((m) => !m.closed).map((m) => m.price);
  return open.length ? Math.min(...open) : Number(base) || 0;
}

function hydrate(p) {
  if (!p) return p;
  p.images = parseJson(p.images, []);
  p.itinerary = parseJson(p.itinerary, []);
  p.hotels = parseJson(p.hotels, []);
  p.faqs = parseJson(p.faqs, []);
  p.month_prices = parseJson(p.month_prices, {});
  p.image = p.images[0] || '';
  p.base_price = p.price;                       // standard price entered in the admin
  if (p.from_price !== null && p.from_price !== undefined) p.price = p.from_price; // lowest bookable price, shown as "from"
  p.months = monthTable(p);
  return p;
}

const SORTS = {
  recommended: 'p.featured DESC, p.sort ASC, p.id ASC',
  price_asc: 'COALESCE(p.from_price, p.price) ASC',
  price_desc: 'COALESCE(p.from_price, p.price) DESC',
  duration: 'p.days ASC',
  newest: 'p.created_at DESC',
  ending: "CASE WHEN p.offer_ends = '' OR p.offer_ends IS NULL THEN 1 ELSE 0 END, p.offer_ends ASC, p.sort ASC",
};

function listPackages(f = {}) {
  const where = [];
  const params = [];
  if (f.status !== 'any') { where.push("p.status = 'published'"); }
  if (f.destination) { where.push('d.slug = ?'); params.push(f.destination); }
  if (f.type) { where.push('EXISTS (SELECT 1 FROM package_types pt JOIN holiday_types t ON t.id = pt.type_id WHERE pt.package_id = p.id AND t.slug = ?)'); params.push(f.type); }
  if (f.style) { where.push('(p.style = ? OR p.style = \'any\')'); params.push(f.style); }
  if (f.deal) where.push(OFFER_ACTIVE);
  if (f.min) { where.push('COALESCE(p.from_price, p.price) >= ?'); params.push(f.min); }
  if (f.max) { where.push('COALESCE(p.from_price, p.price) <= ?'); params.push(f.max); }
  if (f.duration === 'short') where.push('p.nights <= 5');
  if (f.duration === 'week') where.push('p.nights BETWEEN 6 AND 8');
  if (f.duration === 'long') where.push('p.nights >= 9');
  if (f.q) {
    where.push('(p.title LIKE ? OR d.name LIKE ? OR d.region LIKE ? OR p.summary LIKE ?)');
    const like = `%${f.q}%`;
    params.push(like, like, like, like);
  }
  if (f.ids) { where.push(`p.id IN (${f.ids.map(() => '?').join(',') || 'NULL'})`); params.push(...f.ids); }
  let sql = PKG_SELECT + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY ' + (SORTS[f.sort] || SORTS.recommended);
  if (f.limit) { sql += ' LIMIT ? OFFSET ?'; params.push(f.limit, f.offset || 0); }
  return q.all(sql, ...params).map(hydrate);
}

function countPackages(f = {}) { return listPackages({ ...f, limit: 0 }).length; }

function getPackage(slugOrId, { includeDrafts = false } = {}) {
  const byId = typeof slugOrId === 'number';
  const row = q.get(PKG_SELECT + ` WHERE ${byId ? 'p.id' : 'p.slug'} = ?` + (includeDrafts ? '' : " AND p.status = 'published'"), slugOrId);
  return hydrate(row);
}

function listDestinations({ all = false, popular = false, menu = false } = {}) {
  const where = [];
  if (!all) where.push('d.active = 1');
  if (popular) where.push('d.popular = 1');
  if (menu) where.push('d.in_menu = 1');
  return q.all(`
    SELECT d.*,
      (SELECT COUNT(*) FROM packages p WHERE p.destination_id = d.id AND p.status = 'published') AS package_count,
      (SELECT MIN(COALESCE(p.from_price, p.price)) FROM packages p WHERE p.destination_id = d.id AND p.status = 'published') AS from_price,
      (SELECT ROUND(AVG(r.rating), 1) FROM reviews r JOIN packages p ON p.id = r.package_id WHERE p.destination_id = d.id AND r.published = 1) AS rating
    FROM destinations d
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY d.sort ASC, d.name ASC`);
}

function getDestination(slug) {
  return q.get(`SELECT d.*,
      (SELECT MIN(COALESCE(p.from_price, p.price)) FROM packages p WHERE p.destination_id = d.id AND p.status = 'published') AS from_price,
      (SELECT ROUND(AVG(r.rating), 1) FROM reviews r JOIN packages p ON p.id = r.package_id WHERE p.destination_id = d.id AND r.published = 1) AS rating
    FROM destinations d WHERE d.slug = ? AND d.active = 1`, slug);
}

const TYPE_COUNTS = `
      (SELECT COUNT(*) FROM package_types pt JOIN packages p ON p.id = pt.package_id WHERE pt.type_id = t.id AND p.status = 'published') AS package_count,
      (SELECT MIN(COALESCE(p.from_price, p.price)) FROM package_types pt JOIN packages p ON p.id = pt.package_id WHERE pt.type_id = t.id AND p.status = 'published') AS from_price`;

function listHolidayTypes({ all = false, menu = false } = {}) {
  const where = [];
  if (!all) where.push('t.active = 1');
  if (menu) where.push('t.in_menu = 1');
  return q.all(`SELECT t.*, ${TYPE_COUNTS} FROM holiday_types t ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY t.sort ASC, t.name ASC`);
}

function getHolidayType(slug) {
  return q.get(`SELECT t.*, ${TYPE_COUNTS} FROM holiday_types t WHERE t.slug = ? AND t.active = 1`, slug);
}

function packageTypes(packageId) {
  return q.all(`SELECT t.id, t.name, t.slug, t.icon FROM package_types pt JOIN holiday_types t ON t.id = pt.type_id
    WHERE pt.package_id = ? AND t.active = 1 ORDER BY t.sort ASC`, packageId);
}

function setPackageTypes(packageId, typeIds) {
  q.run('DELETE FROM package_types WHERE package_id = ?', packageId);
  for (const tid of typeIds) q.run('INSERT OR IGNORE INTO package_types (package_id, type_id) VALUES (?, ?)', packageId, tid);
}

function listFaqs({ all = false } = {}) {
  return q.all(`SELECT * FROM faqs ${all ? '' : 'WHERE published = 1'} ORDER BY sort ASC, id ASC`);
}

function publishedReviews(limit = 12) {
  return q.all(`SELECT r.*, p.title AS package_title, p.slug AS package_slug FROM reviews r
    LEFT JOIN packages p ON p.id = r.package_id WHERE r.published = 1 ORDER BY r.sort ASC, r.created_at DESC LIMIT ?`, limit);
}

function stylePlans() {
  const rows = q.all("SELECT style, MIN(COALESCE(from_price, price)) AS from_price, COUNT(*) AS n FROM packages WHERE status = 'published' GROUP BY style");
  const byStyle = Object.fromEntries(rows.map((r) => [r.style, r]));
  const anyFrom = byStyle.any?.from_price;
  return ['solo', 'couple', 'family'].map((s) => {
    const own = byStyle[s]?.from_price;
    const from = [own, anyFrom].filter((v) => v != null);
    return { style: s, ...STYLES[s], from_price: from.length ? Math.min(...from) : null, popular: s === 'couple' };
  });
}

// Adult and child price per person. With a travel date, the price for that month is used.
function prices(pkg, settings, date) {
  const pct = Math.max(0, Math.min(100, Number(settings.child_price_percent) || 0));
  let adult = Number(pkg.price) || 0;
  let available = true;
  let month = null;
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    month = Number(date.slice(5, 7));
    const m = monthTable(pkg)[month - 1];
    available = !m.closed;
    adult = m.closed ? Number(pkg.base_price ?? pkg.price) || 0 : m.price;
  }
  const child = pkg.child_price != null && pkg.child_price !== '' ? Number(pkg.child_price) : Math.round(adult * pct) / 100;
  return { adult, child, available, month, monthName: month ? MONTH_NAMES[month - 1] : '' };
}

module.exports = {
  STYLES, BOOKING_STATUSES, PAYMENT_STATUSES, listPackages, countPackages, getPackage, listDestinations, getDestination,
  listHolidayTypes, getHolidayType, packageTypes, setPackageTypes, publishedReviews, stylePlans, prices, hydrate,
  monthTable, computeFromPrice, MONTH_NAMES, listFaqs,
};
