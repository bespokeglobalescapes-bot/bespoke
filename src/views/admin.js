'use strict';
const { html, raw, sel, chk, attr } = require('../lib/html');
const { icon } = require('../lib/icons');
const { money, fmtDate, fmtDateTime, truncate, initials, isoDate } = require('../lib/util');
const { brandMark, brandWords, faviconLinks, ASSET_V } = require('./layout');
const { STYLES, BOOKING_STATUSES, PAYMENT_STATUSES, monthTable, MONTH_NAMES } = require('../models');
const { FIELDS, GROUPS } = require('../settings');

const NAV = [
  { href: '/admin', label: 'Dashboard', ic: 'dashboard', key: 'dashboard' },
  { href: '/admin/bookings', label: 'Bookings', ic: 'ticket', key: 'bookings', badge: 'pending' },
  { href: '/admin/packages', label: 'Packages', ic: 'box', key: 'packages' },
  { href: '/admin/destinations', label: 'Destinations', ic: 'pin', key: 'destinations' },
  { href: '/admin/holiday-types', label: 'Holiday types', ic: 'compass', key: 'types' },
  { href: '/admin/reviews', label: 'Reviews', ic: 'star', key: 'reviews' },
  { href: '/admin/faqs', label: 'FAQs', ic: 'message', key: 'faqs' },
  { href: '/admin/enquiries', label: 'Enquiries', ic: 'inbox', key: 'enquiries', badge: 'unread' },
  { href: '/admin/subscribers', label: 'Subscribers', ic: 'mail', key: 'subscribers' },
  { href: '/admin/travellers', label: 'Travellers', ic: 'users', key: 'travellers' },
  { href: '/admin/pages', label: 'Pages', ic: 'file', key: 'pages' },
  { href: '/admin/settings', label: 'Settings', ic: 'settings', key: 'settings' },
];

function shell(ctx, { title, active, body, actions = '', back }) {
  const { s, admin, counts = {} } = ctx;
  return html`<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title} · Admin · ${s.site_name}</title>
${faviconLinks()}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/css/admin.css?v=${ASSET_V}">
</head>
<body>
<div class="adm">
  <aside class="adm-side" id="adm-side">
    <a class="adm-brand" href="/admin" aria-label="${s.site_name} admin dashboard">${brandMark(42, 'white')}<span class="adm-brand-text">${brandWords(s.site_name)}<small>Admin</small></span></a>
    <nav aria-label="Admin">
      <ul>${NAV.map((n) => html`<li><a href="${n.href}"${attr(active === n.key, 'aria-current', 'page')}>${icon(n.ic, 19)}<span>${n.label}</span>${n.badge && counts[n.badge] ? html`<b class="nav-badge">${counts[n.badge]}</b>` : ''}</a></li>`)}</ul>
    </nav>
    <div class="adm-side-foot">
      <a href="/" target="_blank" rel="noopener">${icon('external', 17)} View website</a>
    </div>
  </aside>
  <div class="adm-main">
    <header class="adm-top">
      <button class="adm-burger" type="button" data-side-toggle aria-controls="adm-side" aria-label="Open menu">${icon('menu', 22)}</button>
      <div class="adm-title">
        ${back ? html`<a class="adm-back" href="${back.href}">${icon('back', 16)} ${back.label}</a>` : ''}
        <h1>${title}</h1>
      </div>
      <div class="adm-top-actions">${actions}</div>
      <details class="adm-user">
        <summary><span class="adm-avatar">${initials(admin.name)}</span><span class="adm-user-name">${admin.name}</span>${icon('down', 16)}</summary>
        <div class="adm-user-menu">
          <p><strong>${admin.name}</strong><small>${admin.email}</small></p>
          <a href="/admin/team">${icon('lock', 16)} Password &amp; admin users</a>
          <form method="post" action="/admin/logout"><input type="hidden" name="_csrf" value="${ctx.csrf}"><button type="submit">${icon('logout', 16)} Sign out</button></form>
        </div>
      </details>
    </header>
    ${ctx.flash ? html`<div class="adm-flash adm-flash--${ctx.flash.type === 'error' ? 'error' : 'ok'}" role="status">${icon(ctx.flash.type === 'error' ? 'alert' : 'check', 18)} ${ctx.flash.msg}</div>` : ''}
    <main class="adm-content">${body}</main>
  </div>
</div>
<script src="/static/js/admin.js?v=${ASSET_V}" defer></script>
</body>
</html>`;
}

function bare(ctx, { title, body }) {
  return html`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${title} · ${ctx.s.site_name}</title>${faviconLinks()}
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/css/admin.css?v=${ASSET_V}"></head>
<body class="adm-auth"><div class="auth-card">
  <div class="auth-brand">${brandMark(52, 'navy')}<div>${brandWords(ctx.s.site_name)}<small>Admin dashboard</small></div></div>
  ${body}
</div></body></html>`;
}

// ---------- small helpers ----------
const csrfField = (ctx) => html`<input type="hidden" name="_csrf" value="${ctx.csrf}">`;
const errorBox = (e) => (e ? html`<p class="adm-error" role="alert">${icon('alert', 18)} ${e}</p>` : '');

function field(label, control, { hint, wide, id } = {}) {
  return html`<div class="f${wide ? ' f--wide' : ''}"${attr(!!id, 'id', id)}><label>${label}${control}</label>${hint ? html`<small class="f-hint">${hint}</small>` : ''}</div>`;
}
const input = (name, value, opts = {}) => html`<input name="${name}" value="${value ?? ''}" type="${opts.type || 'text'}"${attr(opts.required, 'required')}${attr(opts.placeholder, 'placeholder', opts.placeholder)}${attr(opts.step, 'step', opts.step)}${attr(opts.min !== undefined, 'min', opts.min)}${attr(opts.max !== undefined, 'max', opts.max)}${attr(opts.maxlength, 'maxlength', opts.maxlength)}${attr(opts.data, opts.data)}${attr(opts.autocomplete, 'autocomplete', opts.autocomplete)}>`;
const textarea = (name, value, rows = 4, opts = {}) => html`<textarea name="${name}" rows="${rows}"${attr(opts.placeholder, 'placeholder', opts.placeholder)}${attr(opts.required, 'required')}${attr(opts.mono, 'class', 'mono')}>${value ?? ''}</textarea>`;
const select = (name, value, options) => html`<select name="${name}">${options.map(([v, l]) => html`<option value="${v}"${sel(value ?? '', v)}>${l}</option>`)}</select>`;
const toggle = (name, checked, label, hint) => html`<label class="tgl"><input type="checkbox" name="${name}" value="1"${chk(checked)}><span class="tgl-ui"></span><span class="tgl-text"><strong>${label}</strong>${hint ? html`<small>${hint}</small>` : ''}</span></label>`;

function imageField(name, label, value, hint) {
  return html`<div class="f f--wide img-field" data-img-field>
    <span class="f-label">${label}</span>
    <div class="img-field-row">
      <div class="img-preview" data-img-preview>${value ? html`<img src="${value}" alt="">` : icon('image', 28)}</div>
      <div class="img-field-inputs">
        <input type="url" name="${name}" value="${value || ''}" placeholder="Paste an image link, or upload below" data-img-url>
        <label class="upload-btn">${icon('download', 16)} Upload image<input type="file" name="${name}_file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" data-img-file hidden></label>
        ${value ? html`<button type="button" class="link-btn" data-img-clear>Remove image</button>` : ''}
      </div>
    </div>
    ${hint ? html`<small class="f-hint">${hint}</small>` : ''}
  </div>`;
}

function pill(status, map = BOOKING_STATUSES) { return html`<span class="pill pill--${status}">${map[status] || status}</span>`; }

function pager(page, pages, base) {
  if (pages <= 1) return '';
  const link = (p) => base + (base.includes('?') ? '&' : '?') + 'page=' + p;
  return html`<nav class="pager" aria-label="Pages">
    ${page > 1 ? html`<a href="${link(page - 1)}">${icon('left', 16)} Previous</a>` : html`<span></span>`}
    <span>Page ${page} of ${pages}</span>
    ${page < pages ? html`<a href="${link(page + 1)}">Next ${icon('right', 16)}</a>` : html`<span></span>`}
  </nav>`;
}

function empty(title, text, action = '') {
  return html`<div class="adm-empty">${icon('layers', 34)}<h2>${title}</h2><p>${text}</p>${action}</div>`;
}

function deleteForm(ctx, action, label, confirmText, cls = 'btn btn-danger-outline') {
  return html`<form method="post" action="${action}" data-confirm="${confirmText}" class="inline">${csrfField(ctx)}<button class="${cls}" type="submit">${icon('trash', 16)} ${label}</button></form>`;
}

// ---------- auth ----------
function login(ctx, { error, email = '', next = '' }) {
  return bare(ctx, { title: 'Admin sign in', body: html`
    <h1>Sign in</h1>
    ${errorBox(error)}
    <form method="post" action="/admin/login" class="stack">
      ${csrfField(ctx)}<input type="hidden" name="next" value="${next}">
      ${field('Email', input('email', email, { type: 'email', required: true, autocomplete: 'username' }))}
      ${field('Password', input('password', '', { type: 'password', required: true, autocomplete: 'current-password' }))}
      <button class="btn btn-primary btn-block" type="submit">Sign in</button>
    </form>
    <p class="auth-foot"><a href="/">${icon('back', 14)} Back to website</a></p>` });
}

function setup(ctx, { error, values = {} }) {
  return bare(ctx, { title: 'Set up admin', body: html`
    <h1>Create your admin account</h1>
    <p class="muted">This is the first visit to the dashboard. The account you create here can manage bookings, packages and settings.</p>
    ${errorBox(error)}
    <form method="post" action="/admin/setup" class="stack">
      ${csrfField(ctx)}
      ${field('Your name', input('name', values.name, { required: true, autocomplete: 'name' }))}
      ${field('Email', input('email', values.email, { type: 'email', required: true, autocomplete: 'username' }))}
      ${field('Password', input('password', '', { type: 'password', required: true, autocomplete: 'new-password' }), { hint: 'At least 10 characters.' })}
      <button class="btn btn-primary btn-block" type="submit">Create account and continue</button>
    </form>` });
}

// ---------- dashboard ----------
function dashboard(ctx, d) {
  const { s } = ctx;
  const maxCount = Math.max(1, ...d.months.map((m) => m.count));
  const body = html`
  <section class="kpis">
    <a class="kpi kpi--sun" href="/admin/bookings?status=pending"><span class="kpi-ic">${icon('clock', 22)}</span><div><strong>${d.pending}</strong><span>Requests waiting</span></div></a>
    <a class="kpi" href="/admin/bookings?status=confirmed"><span class="kpi-ic">${icon('pound', 22)}</span><div><strong>${money(d.revenue, s.currency_symbol)}</strong><span>Confirmed sales value</span></div></a>
    <a class="kpi" href="/admin/bookings"><span class="kpi-ic">${icon('ticket', 22)}</span><div><strong>${d.monthCount}</strong><span>Bookings this month</span></div></a>
    <a class="kpi" href="/admin/bookings?status=confirmed&upcoming=1"><span class="kpi-ic">${icon('plane', 22)}</span><div><strong>${d.upcoming}</strong><span>Departures next 30 days</span></div></a>
  </section>

  <div class="grid-2">
    <section class="panel">
      <div class="panel-head"><h2>Booking requests, last 6 months</h2></div>
      <div class="bars" role="img" aria-label="Bookings per month">
        ${d.months.map((m) => html`<div class="bar-col"><span class="bar-val">${m.count}</span><span class="bar" style="height:${Math.round((m.count / maxCount) * 100)}%"></span><span class="bar-lbl">${m.label}</span></div>`)}
      </div>
      <p class="muted small">Value of requests over this period: <strong>${money(d.months.reduce((a, m) => a + m.value, 0), s.currency_symbol)}</strong></p>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>At a glance</h2></div>
      <ul class="glance">
        <li><a href="/admin/packages">${icon('box', 18)} Published packages <b>${d.packages}</b></a></li>
        <li><a href="/admin/destinations">${icon('pin', 18)} Destinations <b>${d.destinations}</b></a></li>
        <li><a href="/admin/enquiries">${icon('inbox', 18)} Unread enquiries <b>${d.unread}</b></a></li>
        <li><a href="/admin/subscribers">${icon('mail', 18)} Newsletter subscribers <b>${d.subscribers}</b></a></li>
        <li><a href="/admin/travellers">${icon('users', 18)} Traveller accounts <b>${d.users}</b></a></li>
        <li><a href="/admin/bookings?status=cancel_requested">${icon('alert', 18)} Cancellation requests <b>${d.cancelReq}</b></a></li>
      </ul>
    </section>
  </div>

  <section class="panel">
    <div class="panel-head"><h2>Latest booking requests</h2><a href="/admin/bookings" class="link">View all</a></div>
    ${d.recent.length ? bookingsTable(d.recent, s) : empty('No bookings yet', 'When travellers send booking requests from the website they appear here.')}
  </section>

  <div class="grid-2">
    <section class="panel">
      <div class="panel-head"><h2>Most requested packages</h2></div>
      ${d.top.length ? html`<ol class="toplist">${d.top.map((t) => html`<li><a href="/admin/packages/${t.id}">${t.title}</a><span>${t.n} ${t.n === 1 ? 'request' : 'requests'}</span></li>`)}</ol>` : html`<p class="muted">No requests yet.</p>`}
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Launch checklist</h2></div>
      <ul class="checklist">${d.checklist.map((c) => html`<li class="${c.done ? 'done' : ''}">${icon(c.done ? 'check' : 'info', 18)}<span>${c.href && !c.done ? html`<a href="${c.href}">${c.label}</a>` : c.label}${c.hint && !c.done ? html`<small>${c.hint}</small>` : ''}</span></li>`)}</ul>
    </section>
  </div>`;
  return shell(ctx, { title: 'Dashboard', active: 'dashboard', body, actions: html`<a class="btn btn-primary btn-sm" href="/admin/packages/new">${icon('plus', 16)} Add package</a>` });
}

// ---------- bookings ----------
function bookingsTable(rows, s) {
  return html`<div class="table-wrap"><table class="tbl">
    <thead><tr><th>Reference</th><th>Traveller</th><th>Trip</th><th>Departure</th><th class="num">Pax</th><th class="num">Total</th><th>Status</th><th>Payment</th><th>Received</th></tr></thead>
    <tbody>${rows.map((b) => html`<tr data-href="/admin/bookings/${b.id}">
      <td class="nowrap"><a class="strong" href="/admin/bookings/${b.id}">${b.ref}</a></td>
      <td>${b.name}<small>${b.email}</small></td>
      <td>${truncate(b.package_title, 38)}</td>
      <td class="nowrap">${fmtDate(b.travel_date)}</td>
      <td class="num">${b.adults + b.children}</td>
      <td class="num">${money(b.total, s.currency_symbol)}</td>
      <td>${pill(b.status)}</td>
      <td>${pill(b.payment_status, PAYMENT_STATUSES)}</td>
      <td class="nowrap">${fmtDate(b.created_at)}</td>
    </tr>`)}</tbody>
  </table></div>`;
}

function bookings(ctx, { rows, status, qtext, page, pages, total, counts, upcoming }) {
  const tabs = [['', 'All'], ['pending', 'Pending'], ['confirmed', 'Confirmed'], ['cancel_requested', 'Cancel requests'], ['cancelled', 'Cancelled'], ['completed', 'Completed']];
  const qs = new URLSearchParams({ ...(status ? { status } : {}), ...(qtext ? { q: qtext } : {}), ...(upcoming ? { upcoming: '1' } : {}) }).toString();
  const body = html`
  <div class="toolbar">
    <nav class="seg" aria-label="Filter by status">${tabs.map(([v, l]) => html`<a href="/admin/bookings${v ? `?status=${v}` : ''}"${attr((status || '') === v, 'aria-current', 'true')}>${l}${counts[v || 'all'] ? html`<b>${counts[v || 'all']}</b>` : ''}</a>`)}</nav>
    <form class="search" method="get" action="/admin/bookings">
      ${status ? html`<input type="hidden" name="status" value="${status}">` : ''}
      ${icon('search', 18)}<input type="search" name="q" value="${qtext}" placeholder="Reference, name, email or phone" aria-label="Search bookings">
    </form>
  </div>
  ${upcoming ? html`<p class="note">${icon('plane', 16)} Showing confirmed departures in the next 30 days. <a href="/admin/bookings?status=confirmed">Show all confirmed</a></p>` : ''}
  <section class="panel panel--flush">
    ${rows.length ? bookingsTable(rows, ctx.s) : empty('No bookings found', qtext || status ? 'Try a different filter or search.' : 'Booking requests from the website will appear here. You can also add phone bookings yourself.', html`<a class="btn btn-primary btn-sm" href="/admin/bookings/new">${icon('plus', 16)} Add booking</a>`)}
  </section>
  ${pager(page, pages, `/admin/bookings${qs ? `?${qs}` : ''}`)}
  <p class="muted small">${total} ${total === 1 ? 'booking' : 'bookings'}</p>`;
  return shell(ctx, {
    title: 'Bookings', active: 'bookings', body,
    actions: html`<a class="btn btn-ghost btn-sm" href="/admin/bookings/export.csv${qs ? `?${qs}` : ''}">${icon('download', 16)} Export CSV</a><a class="btn btn-primary btn-sm" href="/admin/bookings/new">${icon('plus', 16)} Add booking</a>`,
  });
}

function bookingDetail(ctx, { b, pkg, publicLink, history }) {
  const { s } = ctx;
  const body = html`
  <div class="detail-grid">
    <div class="stack-lg">
      <section class="panel">
        <div class="panel-head"><h2>${b.package_title}</h2>${pill(b.status)}</div>
        <dl class="dl">
          <div><dt>Departure</dt><dd>${fmtDate(b.travel_date)}${pkg ? html` <small>(${pkg.days} days / ${pkg.nights} nights)</small>` : ''}</dd></div>
          <div><dt>Travellers</dt><dd>${b.adults} adult${b.adults === 1 ? '' : 's'}${b.children ? `, ${b.children} child${b.children === 1 ? '' : 'ren'}` : ''}</dd></div>
          <div><dt>Adult price</dt><dd>${money(b.price_adult, s.currency_symbol)}</dd></div>
          <div><dt>Child price</dt><dd>${money(b.price_child, s.currency_symbol)}</dd></div>
          <div><dt>Total</dt><dd class="big">${money(b.total, s.currency_symbol)}</dd></div>
          <div><dt>Deposit</dt><dd>${money(b.deposit, s.currency_symbol)}</dd></div>
          <div><dt>Paid</dt><dd>${money(b.amount_paid, s.currency_symbol)} ${pill(b.payment_status, PAYMENT_STATUSES)}</dd></div>
          <div><dt>Balance</dt><dd>${money(Math.max(0, b.total - b.amount_paid), s.currency_symbol)}</dd></div>
        </dl>
        ${b.notes ? html`<div class="callout"><strong>Traveller's requests</strong><p>${b.notes}</p></div>` : ''}
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Update booking</h2></div>
        <form method="post" action="/admin/bookings/${b.id}" class="form-grid">
          ${csrfField(ctx)}
          ${field('Booking status', select('status', b.status, Object.entries(BOOKING_STATUSES)))}
          ${field('Payment', select('payment_status', b.payment_status, Object.entries(PAYMENT_STATUSES)))}
          ${field(`Amount paid (${s.currency_symbol})`, input('amount_paid', b.amount_paid, { type: 'number', step: '0.01', min: 0 }))}
          ${field(`Total (${s.currency_symbol})`, input('total', b.total, { type: 'number', step: '0.01', min: 0 }), { hint: 'Change if the final quoted price differs.' })}
          ${field('Departure date', input('travel_date', b.travel_date, { type: 'date', required: true }))}
          ${field('Adults', input('adults', b.adults, { type: 'number', min: 1, max: 50 }))}
          ${field('Children', input('children', b.children, { type: 'number', min: 0, max: 50 }))}
          ${field(`Deposit (${s.currency_symbol})`, input('deposit', b.deposit, { type: 'number', step: '0.01', min: 0 }))}
          ${field('Internal notes', textarea('admin_notes', b.admin_notes, 4, { placeholder: 'Supplier references, call notes… (not shown to the traveller)' }), { wide: true })}
          <div class="f f--wide">${toggle('notify', true, 'Email the traveller if the status changes', 'They get a short update with a link to their booking.')}</div>
          <div class="form-actions f--wide"><button class="btn btn-primary" type="submit">Save changes</button></div>
        </form>
      </section>
    </div>

    <aside class="stack-lg">
      <section class="panel">
        <div class="panel-head"><h2>Lead traveller</h2></div>
        <p class="person"><span class="adm-avatar adm-avatar--lg">${initials(b.name)}</span><span><strong>${b.name}</strong>${b.user_id ? html`<small>Has an account</small>` : html`<small>Guest booking</small>`}</span></p>
        <ul class="contact">
          <li>${icon('mail', 16)} <a href="mailto:${b.email}?subject=${encodeURIComponent(`Your booking ${b.ref}`)}">${b.email}</a></li>
          <li>${icon('phone', 16)} <a href="tel:${b.phone.replace(/[^\d+]/g, '')}">${b.phone}</a></li>
          ${b.phone ? html`<li>${icon('whatsapp', 16)} <a href="https://wa.me/${b.phone.replace(/\D/g, '').replace(/^0/, '44')}" target="_blank" rel="noopener">WhatsApp</a></li>` : ''}
        </ul>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Booking</h2></div>
        <dl class="dl dl--stack">
          <div><dt>Reference</dt><dd class="strong">${b.ref}</dd></div>
          <div><dt>Received</dt><dd>${fmtDateTime(b.created_at)}</dd></div>
          <div><dt>Last updated</dt><dd>${fmtDateTime(b.updated_at)}</dd></div>
        </dl>
        <div class="btn-col">
          <a class="btn btn-ghost btn-sm" href="${publicLink}" target="_blank" rel="noopener">${icon('eye', 16)} Traveller's view</a>
          ${pkg ? html`<a class="btn btn-ghost btn-sm" href="/admin/packages/${pkg.id}">${icon('box', 16)} Open package</a>` : ''}
          <button class="btn btn-ghost btn-sm" type="button" data-copy="${publicLink}">${icon('send', 16)} Copy traveller link</button>
        </div>
      </section>
      ${history.length > 1 ? html`<section class="panel"><div class="panel-head"><h2>Other bookings by this traveller</h2></div><ul class="mini-list">${history.filter((h) => h.id !== b.id).map((h) => html`<li><a href="/admin/bookings/${h.id}">${h.ref}</a> ${truncate(h.package_title, 28)} ${pill(h.status)}</li>`)}</ul></section>` : ''}
      ${deleteForm(ctx, `/admin/bookings/${b.id}/delete`, 'Delete booking', `Delete booking ${b.ref} permanently? This cannot be undone.`)}
    </aside>
  </div>`;
  return shell(ctx, { title: b.ref, active: 'bookings', body, back: { href: '/admin/bookings', label: 'Bookings' } });
}

function bookingNew(ctx, { packages, error, values = {} }) {
  const { s } = ctx;
  const body = html`
  <section class="panel narrow-panel">
    <p class="muted">Record a booking taken by phone, email or in person. Prices are calculated from the package; you can adjust the total afterwards.</p>
    ${errorBox(error)}
    <form method="post" action="/admin/bookings/new" class="form-grid">
      ${csrfField(ctx)}
      ${field('Package', select('package_id', values.package_id, packages.map((p) => [p.id, `${p.title} (${money(p.price, s.currency_symbol)})${p.status !== 'published' ? ' – draft' : ''}`])), { wide: true })}
      ${field('Departure date', input('travel_date', values.travel_date, { type: 'date', required: true }))}
      ${field('Status', select('status', values.status || 'confirmed', Object.entries(BOOKING_STATUSES)))}
      ${field('Adults', input('adults', values.adults || 2, { type: 'number', min: 1, max: 50 }))}
      ${field('Children', input('children', values.children || 0, { type: 'number', min: 0, max: 50 }))}
      ${field('Lead traveller name', input('name', values.name, { required: true }))}
      ${field('Email', input('email', values.email, { type: 'email', required: true }))}
      ${field('Phone', input('phone', values.phone))}
      ${field('Payment', select('payment_status', values.payment_status || 'unpaid', Object.entries(PAYMENT_STATUSES)))}
      ${field('Traveller requests', textarea('notes', values.notes, 3), { wide: true })}
      <div class="f f--wide">${toggle('notify', false, 'Email the traveller a copy', 'Sends the booking received email with their booking link.')}</div>
      <div class="form-actions f--wide"><button class="btn btn-primary" type="submit">Create booking</button></div>
    </form>
  </section>`;
  return shell(ctx, { title: 'Add booking', active: 'bookings', body, back: { href: '/admin/bookings', label: 'Bookings' } });
}

// ---------- packages ----------
function packages(ctx, { rows, qtext, status, destination, destinations }) {
  const { s } = ctx;
  const body = html`
  <div class="toolbar">
    <form class="filters-inline" method="get" action="/admin/packages" data-autosubmit>
      ${select('status', status, [['', 'All statuses'], ['published', 'Published'], ['draft', 'Drafts']])}
      ${select('destination', destination, [['', 'All destinations'], ...destinations.map((d) => [d.slug, d.name])])}
      <span class="search">${icon('search', 18)}<input type="search" name="q" value="${qtext}" placeholder="Search packages" aria-label="Search packages"></span>
    </form>
  </div>
  <section class="panel panel--flush">
    ${rows.length ? html`<div class="table-wrap"><table class="tbl tbl--media">
      <thead><tr><th>Package</th><th>Destination</th><th>Length</th><th class="num">Price</th><th>Labels</th><th>Status</th><th class="num">Requests</th><th></th></tr></thead>
      <tbody>${rows.map((p) => html`<tr data-href="/admin/packages/${p.id}">
        <td><div class="media-cell">${p.image ? html`<img src="${p.image.replace(/([?&])w=\d+/, '$1w=160')}" alt="" loading="lazy">` : html`<span class="thumb-empty">${icon('image', 18)}</span>`}<a class="strong" href="/admin/packages/${p.id}">${p.title}</a></div></td>
        <td>${p.dest_name || html`<span class="muted">—</span>`}</td>
        <td class="nowrap">${p.days}D / ${p.nights}N</td>
        <td class="num">${p.old_price && p.old_price > p.price ? html`<s class="muted">${money(p.old_price, s.currency_symbol)}</s> ` : ''}${money(p.price, s.currency_symbol)}</td>
        <td>${p.featured ? html`<span class="tag tag--sun">Popular</span>` : ''}${p.is_deal ? html`<span class="tag ${p.offer_active ? 'tag--red' : ''}">${p.offer_active ? 'Offer' : 'Offer ended'}${p.offer_ends && p.offer_active ? ` · ends ${fmtDate(p.offer_ends)}` : ''}</span>` : ''}${p.badge ? html`<span class="tag">${p.badge}</span>` : ''}</td>
        <td>${pill(p.status, { published: 'Published', draft: 'Draft' })}</td>
        <td class="num">${p.bookings}</td>
        <td class="row-actions"><a href="/packages/${p.slug}" target="_blank" rel="noopener" title="View on website" aria-label="View ${p.title} on website">${icon('external', 17)}</a></td>
      </tr>`)}</tbody></table></div>`
      : empty('No packages found', 'Add your first package to show it on the website.', html`<a class="btn btn-primary btn-sm" href="/admin/packages/new">${icon('plus', 16)} Add package</a>`)}
  </section>`;
  return shell(ctx, { title: 'Packages', active: 'packages', body, actions: html`<a class="btn btn-primary btn-sm" href="/admin/packages/new">${icon('plus', 16)} Add package</a>` });
}

const STAR_OPTIONS = [['', 'No rating'], ['5', '5 stars'], ['4.5', '4.5 stars'], ['4', '4 stars'], ['3.5', '3.5 stars'], ['3', '3 stars'], ['2.5', '2.5 stars'], ['2', '2 stars'], ['1', '1 star']];
function hotelBlock(h, key) {
  const imgs = (h.images || []).filter(Boolean);
  const n = (f) => `hotel_${f}_${key}`;
  return html`<div class="hotel-edit" data-hotel>
    <input type="hidden" name="hotel_key" value="${key}">
    <div class="hotel-edit-head">
      <span class="hotel-edit-title">${icon('bed', 18)} <strong data-hotel-title>${h.name || 'New hotel'}</strong></span>
      <div class="img-row-actions">
        <button type="button" data-move="-1" aria-label="Move hotel up">${icon('down', 16, 'flip')}</button>
        <button type="button" data-move="1" aria-label="Move hotel down">${icon('down', 16)}</button>
        <button type="button" class="icon-x" data-remove-row aria-label="Remove hotel">${icon('trash', 16)}</button>
      </div>
    </div>
    <div class="form-grid">
      ${field('Hotel name', html`<input name="${n('name')}" value="${h.name || ''}" maxlength="120" data-hotel-name placeholder="e.g. Sun Island Resort & Spa">`)}
      ${field('Location', html`<input name="${n('location')}" value="${h.location || ''}" maxlength="120" placeholder="e.g. South Ari Atoll, Maldives">`)}
      ${field('Star rating', select(n('stars'), h.stars ? String(h.stars) : '', STAR_OPTIONS))}
      ${field('Nights', html`<input type="number" name="${n('nights')}" value="${h.nights || ''}" min="0" max="60">`)}
      ${field('Room type', html`<input name="${n('room')}" value="${h.room || ''}" maxlength="120" placeholder="e.g. Beach Villa">`)}
      ${field('Board basis', html`<input name="${n('board')}" value="${h.board || ''}" maxlength="80" placeholder="e.g. All inclusive" list="board-options">`)}
      ${field('Description', html`<textarea name="${n('description')}" rows="3">${h.description || ''}</textarea>`, { wide: true })}
      ${field('Facilities', html`<textarea name="${n('facilities')}" rows="3" placeholder="One per line, e.g. Infinity pool">${h.facilities || ''}</textarea>`, { hint: 'One per line. Shown as tags.' })}
      <div class="f">
        <span class="f-label">Photos</span>
        <div class="hotel-thumbs" data-hotel-thumbs>${imgs.map((src) => html`<span class="hotel-thumb" data-src="${src}"><img src="${src.replace(/([?&])w=\d+/, '$1w=200')}" alt=""><button type="button" data-remove-photo aria-label="Remove photo">${icon('x', 14)}</button></span>`)}</div>
        <textarea name="${n('images')}" rows="2" class="mono small-ta" placeholder="Photo links, one per line" data-hotel-images>${imgs.join('\n')}</textarea>
        <label class="upload-btn">${icon('download', 16)} Upload photos<input type="file" name="${n('files')}" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple hidden data-hotel-files></label>
        <small class="f-hint" data-hotel-files-note>The first photo is the main one.</small>
      </div>
    </div>
  </div>`;
}

function faqRow(f) {
  return html`<div class="itin-row faq-row" data-faq-row>
    <div class="itin-handle">
      <button type="button" data-move="-1" aria-label="Move question up">${icon('down', 16, 'flip')}</button>
      <button type="button" data-move="1" aria-label="Move question down">${icon('down', 16)}</button>
    </div>
    <div class="itin-fields">
      <input name="faq_q" value="${f.question || ''}" placeholder="Question, e.g. Is the seaplane transfer included?" aria-label="Question" maxlength="200">
      <textarea name="faq_a" rows="3" placeholder="Answer" aria-label="Answer">${f.answer || ''}</textarea>
    </div>
    <button type="button" class="icon-x" data-remove-row aria-label="Remove question">${icon('trash', 16)}</button>
  </div>`;
}

function monthGrid(p, s) {
  const base = p.base_price ?? p.price ?? '';
  const table = monthTable({ price: base || 0, month_prices: p.month_prices || {} });
  return html`<div class="month-grid">
    ${table.map((m) => html`<div class="month-edit${m.closed ? ' is-closed' : ''}" data-month-edit>
      <label for="mp-${m.month}">${m.name}</label>
      <span class="money-input"><span>${s.currency_symbol}</span><input id="mp-${m.month}" type="number" step="0.01" min="0" name="month_price_${m.month}" value="${m.custom ? (p.month_prices[m.month] || p.month_prices[String(m.month)]).price : ''}" placeholder="${base}" data-month-price></span>
      <label class="mini-check"><input type="checkbox" name="month_closed_${m.month}" value="1"${chk(m.closed)} data-month-closed> Not available</label>
    </div>`)}
  </div>`;
}

function packageForm(ctx, { p, destinations, types, error }) {
  const { s } = ctx;
  const isNew = !p.id;
  const itin = p.itinerary && p.itinerary.length ? p.itinerary : [{ label: 'Day 1', title: '', text: '' }];
  const itinRow = (d) => html`<div class="itin-row" data-itin-row>
    <div class="itin-handle">
      <button type="button" data-move="-1" aria-label="Move up">${icon('down', 16, 'flip')}</button>
      <button type="button" data-move="1" aria-label="Move down">${icon('down', 16)}</button>
    </div>
    <div class="itin-fields">
      <div class="itin-top">
        <input name="itin_label" value="${d.label || ''}" placeholder="Day 1" aria-label="Day label" class="itin-label">
        <input name="itin_title" value="${d.title || ''}" placeholder="Title, e.g. Arrive in Malé" aria-label="Day title">
      </div>
      <textarea name="itin_text" rows="2" placeholder="What happens on this day" aria-label="Day description">${d.text || ''}</textarea>
    </div>
    <button type="button" class="icon-x" data-remove-row aria-label="Remove day">${icon('trash', 16)}</button>
  </div>`;
  const imgRow = (src) => html`<div class="img-row" data-img-row>
    <img src="${src.replace(/([?&])w=\d+/, '$1w=240')}" alt="" loading="lazy">
    <input type="url" name="image_url" value="${src}" aria-label="Image link">
    <div class="img-row-actions">
      <button type="button" data-move="-1" aria-label="Move up">${icon('down', 16, 'flip')}</button>
      <button type="button" data-move="1" aria-label="Move down">${icon('down', 16)}</button>
      <button type="button" class="icon-x" data-remove-row aria-label="Remove image">${icon('trash', 16)}</button>
    </div>
  </div>`;
  const body = html`
  ${errorBox(error)}
  <form method="post" action="${isNew ? '/admin/packages/new' : `/admin/packages/${p.id}`}" enctype="multipart/form-data" class="edit-layout" data-dirty-guard>
    ${csrfField(ctx)}
    <div class="stack-lg">
      <section class="panel">
        <div class="panel-head"><h2>Basics</h2></div>
        <div class="form-grid">
          ${field('Title', input('title', p.title, { required: true, maxlength: 140, data: 'data-slug-source' }), { wide: true })}
          ${field('Web address', html`<span class="prefix-input"><span>/packages/</span>${input('slug', p.slug, { maxlength: 90, data: 'data-slug-target', placeholder: 'generated-from-title' })}</span>`, { wide: true, hint: 'Leave empty to create it from the title.' })}
          ${field('Destination', select('destination_id', p.destination_id, [['', 'None'], ...destinations.map((d) => [d.id, d.name])]))}
          ${field('Best for', select('style', p.style || 'any', Object.entries(STYLES).map(([k, v]) => [k, v.label])), { hint: 'Used by the "Choose your perfect plan" cards.' })}
          ${field('Board / meals', input('board', p.board, { placeholder: 'All inclusive' }))}
          ${field('Days', input('days', p.days ?? 7, { type: 'number', min: 1, max: 60, required: true }))}
          ${field('Nights', input('nights', p.nights ?? 6, { type: 'number', min: 0, max: 60, required: true }))}
          ${field('Includes (short line on cards)', input('includes', p.includes, { placeholder: 'Flights + Hotel + Meals', maxlength: 80 }))}
          <fieldset class="f f--wide type-pick"><legend class="f-label">Holiday types</legend>
            <div class="type-pick-grid">${types.map((t) => html`<label class="type-opt"><input type="checkbox" name="type_ids" value="${t.id}"${chk((p.type_ids || []).includes(t.id))}><span>${icon(t.icon, 16)} ${t.name}</span></label>`)}</div>
            <small class="f-hint">The package appears on each ticked holiday type page and in its menu.${types.length ? '' : ' Add holiday types first under Holiday types.'}</small>
          </fieldset>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Description</h2></div>
        <div class="form-grid">
          ${field('Summary', textarea('summary', p.summary, 2, { placeholder: 'One or two sentences for listings and search engines.' }), { wide: true })}
          ${field('Overview', textarea('overview', p.overview, 5), { wide: true })}
          ${field('Highlights', textarea('highlights', p.highlights, 5, { placeholder: 'One highlight per line' }), { wide: true, hint: 'One per line.' })}
          ${field("What's included", textarea('inclusions', p.inclusions, 6, { placeholder: 'One item per line' }), { hint: 'One per line.' })}
          ${field('Not included', textarea('exclusions', p.exclusions, 6, { placeholder: 'One item per line' }), { hint: 'One per line.' })}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Itinerary</h2><button type="button" class="btn btn-ghost btn-sm" data-add-row="itin">${icon('plus', 16)} Add day</button></div>
        <div class="rows" data-rows="itin">${itin.map(itinRow)}</div>
        <template data-template="itin">${itinRow({ label: '', title: '', text: '' })}</template>
        <p class="f-hint">Group days with a label like “Days 3–5”. Use the arrows to reorder.</p>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Hotels</h2><button type="button" class="btn btn-ghost btn-sm" data-add-row="hotel">${icon('plus', 16)} Add hotel</button></div>
        <p class="f-hint">Add every hotel in this package, in the order guests stay. Each one gets a photo gallery, star rating and details box on the package page.</p>
        <div class="rows" data-rows="hotel">${(p.hotels || []).map((h, i) => hotelBlock(h, 'h' + i))}</div>
        <template data-template="hotel">${hotelBlock({}, '__KEY__')}</template>
        <datalist id="board-options"><option value="Room only"><option value="Breakfast"><option value="Half board"><option value="Full board"><option value="All inclusive"></datalist>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Prices by month</h2></div>
        <p class="f-hint">Set the price per adult for each month of travel. Leave a month empty to use the standard price, or tick “Not available” for months you don’t sell. The lowest available price is shown as the “from” price.</p>
        ${monthGrid(p, s)}
      </section>

      <section class="panel" id="faqs">
        <div class="panel-head"><h2>FAQs for this package</h2><button type="button" class="btn btn-ghost btn-sm" data-add-row="faq">${icon('plus', 16)} Add question</button></div>
        <p class="f-hint">Shown in a “Questions about this trip” section on this package’s page. Homepage FAQs are managed separately under FAQs.</p>
        <div class="rows" data-rows="faq">${(p.faqs || []).map(faqRow)}</div>
        <template data-template="faq">${faqRow({})}</template>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Photos</h2></div>
        <p class="f-hint">The first photo is the main image on cards and the package page. Use wide landscape photos (at least 1600 px wide).</p>
        <div class="rows" data-rows="img">${(p.images || []).map(imgRow)}</div>
        <template data-template="img">${imgRow('')}</template>
        <div class="img-add">
          <label class="upload-btn">${icon('download', 16)} Upload photos<input type="file" name="image_files" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple hidden data-multi-files></label>
          <button type="button" class="btn btn-ghost btn-sm" data-add-row="img">${icon('plus', 16)} Add image link</button>
          <span class="muted small" data-files-note></span>
        </div>
      </section>
    </div>

    <aside class="stack-lg side-sticky">
      <section class="panel">
        <div class="panel-head"><h2>Publish</h2></div>
        <div class="stack">
          ${field('Status', select('status', p.status || 'published', [['published', 'Published (visible on website)'], ['draft', 'Draft (hidden)']]))}
          ${field('Sort order', input('sort', p.sort ?? 0, { type: 'number' }), { hint: 'Lower numbers appear first.' })}
          <button class="btn btn-primary btn-block" type="submit">${isNew ? 'Create package' : 'Save changes'}</button>
          ${!isNew ? html`<a class="btn btn-ghost btn-block" href="/packages/${p.slug}" target="_blank" rel="noopener">${icon('external', 16)} View on website</a>` : ''}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Pricing (${s.currency_code})</h2></div>
        <div class="stack">
          ${field('Standard price per adult', input('price', p.base_price ?? p.price, { type: 'number', step: '0.01', min: 0, required: true, data: 'data-standard-price' }), { hint: 'Used for any month without its own price.' })}
          ${field('Was price', input('old_price', p.old_price, { type: 'number', step: '0.01', min: 0 }), { hint: 'Shown crossed out next to the “from” price, for the % off badge.' })}
          ${field('Price per child', input('child_price', p.child_price, { type: 'number', step: '0.01', min: 0 }), { hint: `Leave empty to use ${s.child_price_percent}% of the adult price.` })}
          ${field('Max travellers per booking', input('max_travellers', p.max_travellers ?? 12, { type: 'number', min: 1, max: 50 }))}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Promotion</h2></div>
        <div class="stack">
          ${toggle('featured', p.featured, 'Popular choice', 'Shown in the “Popular choices” slider at the top of the homepage. Tick as many packages as you like; the sort order sets the slide order.')}
          ${toggle('is_deal', p.is_deal, 'Show in Special offers', 'Listed on the Special offers page. Add a “was” price to show the % saving.')}
          ${field('Offer text', input('offer_label', p.offer_label, { placeholder: 'e.g. Save £300 per person', maxlength: 60 }))}
          ${field('Offer ends', input('offer_ends', p.offer_ends, { type: 'date' }), { hint: 'Optional. The offer is hidden automatically after this date.' })}
          ${field('Badge text', input('badge', p.badge, { placeholder: 'e.g. Popular choice', maxlength: 30 }))}
        </div>
      </section>
      ${!isNew ? html`<section class="panel panel--plain">
        <div class="btn-col">
          <button class="btn btn-ghost btn-sm" type="submit" form="dup-form">${icon('layers', 16)} Duplicate package</button>
          <button class="btn btn-danger-outline btn-sm" type="submit" form="del-form">${icon('trash', 16)} Delete package</button>
        </div>
      </section>` : ''}
    </aside>
  </form>
  ${!isNew ? html`<form id="dup-form" method="post" action="/admin/packages/${p.id}/duplicate">${csrfField(ctx)}</form>
  <form id="del-form" method="post" action="/admin/packages/${p.id}/delete" data-confirm="Delete “${p.title}”? Existing bookings keep their details.">${csrfField(ctx)}</form>` : ''}`;
  return shell(ctx, { title: isNew ? 'New package' : p.title, active: 'packages', body, back: { href: '/admin/packages', label: 'Packages' } });
}

// ---------- destinations ----------
function destinations(ctx, { rows }) {
  const { s } = ctx;
  const body = html`<section class="panel panel--flush">
    ${rows.length ? html`<div class="table-wrap"><table class="tbl tbl--media">
      <thead><tr><th>Destination</th><th>Region</th><th class="num">Packages</th><th class="num">From</th><th>Shown in</th><th>Visible</th><th></th></tr></thead>
      <tbody>${rows.map((d) => html`<tr data-href="/admin/destinations/${d.id}">
        <td><div class="media-cell">${d.image ? html`<img src="${d.image.replace(/([?&])w=\d+/, '$1w=160')}" alt="" loading="lazy">` : html`<span class="thumb-empty">${icon('image', 18)}</span>`}<a class="strong" href="/admin/destinations/${d.id}">${d.name}</a></div></td>
        <td>${d.region}</td><td class="num">${d.package_count}</td><td class="num">${d.from_price != null ? money(d.from_price, s.currency_symbol) : '—'}</td>
        <td>${d.in_menu ? html`<span class="tag tag--sun">Menu</span>` : ''}${d.popular ? html`<span class="tag">Homepage</span>` : ''}</td>
        <td>${d.active ? pill('published', { published: 'Visible' }) : pill('draft', { draft: 'Hidden' })}</td>
        <td class="row-actions"><a href="/destinations/${d.slug}" target="_blank" rel="noopener" aria-label="View ${d.name} on website">${icon('external', 17)}</a></td>
      </tr>`)}</tbody></table></div>` : empty('No destinations yet', 'Add destinations to group your packages.', html`<a class="btn btn-primary btn-sm" href="/admin/destinations/new">${icon('plus', 16)} Add destination</a>`)}
  </section>`;
  return shell(ctx, { title: 'Destinations', active: 'destinations', body, actions: html`<a class="btn btn-primary btn-sm" href="/admin/destinations/new">${icon('plus', 16)} Add destination</a>` });
}

function destinationForm(ctx, { d, error }) {
  const isNew = !d.id;
  const body = html`${errorBox(error)}
  <form method="post" action="${isNew ? '/admin/destinations/new' : `/admin/destinations/${d.id}`}" enctype="multipart/form-data" class="edit-layout">
    ${csrfField(ctx)}
    <section class="panel">
      <div class="form-grid">
        ${field('Name', input('name', d.name, { required: true, maxlength: 80, data: 'data-slug-source' }))}
        ${field('Region or country', input('region', d.region, { placeholder: 'e.g. Indian Ocean', maxlength: 80 }))}
        ${field('Web address', html`<span class="prefix-input"><span>/destinations/</span>${input('slug', d.slug, { maxlength: 80, data: 'data-slug-target' })}</span>`, { wide: true, hint: 'Leave empty to create it from the name.' })}
        ${field('Short summary', input('summary', d.summary, { maxlength: 160 }), { wide: true })}
        ${field('Description', textarea('description', d.description, 8), { wide: true, hint: 'Leave a blank line between paragraphs.' })}
        ${imageField('image', 'Main photo', d.image, 'Used on destination cards and as the page banner.')}
      </div>
    </section>
    <aside class="stack-lg side-sticky">
      <section class="panel"><div class="stack">
        ${toggle('active', isNew ? true : d.active, 'Visible on website')}
        ${toggle('in_menu', isNew ? false : d.in_menu, 'Show in the Destinations menu', 'Menu order follows the sort order below.')}
        ${toggle('popular', d.popular, 'Show in “Popular destinations”', 'Up to six appear on the homepage.')}
        ${field('Sort order', input('sort', d.sort ?? 0, { type: 'number' }))}
        <button class="btn btn-primary btn-block" type="submit">${isNew ? 'Create destination' : 'Save changes'}</button>
      </div></section>
      ${!isNew ? html`<section class="panel panel--plain"><button class="btn btn-danger-outline btn-sm btn-block" type="submit" form="del-form">${icon('trash', 16)} Delete destination</button></section>` : ''}
    </aside>
  </form>
  ${!isNew ? html`<form id="del-form" method="post" action="/admin/destinations/${d.id}/delete" data-confirm="Delete ${d.name}? Its packages stay but lose their destination.">${csrfField(ctx)}</form>` : ''}`;
  return shell(ctx, { title: isNew ? 'New destination' : d.name, active: 'destinations', body, back: { href: '/admin/destinations', label: 'Destinations' } });
}

// ---------- holiday types ----------
const EXP_ICONS = ['twin', 'paw', 'ship', 'palm', 'martini', 'tag', 'couple', 'meals', 'gem', 'family', 'city', 'landmark', 'mountain', 'compass', 'backpack', 'camera', 'sun', 'plane', 'globe', 'sparkles', 'heart'];
function holidayTypes(ctx, { rows }) {
  const body = html`
  <p class="note">${icon('info', 16)} Holiday types build the Holiday types menu and their own pages. Tick them on each package to decide where it appears.</p>
  <section class="panel panel--flush">
    ${rows.length ? html`<div class="table-wrap"><table class="tbl tbl--media">
      <thead><tr><th>Holiday type</th><th>Description</th><th class="num">Packages</th><th>Menu</th><th>Visible</th><th></th></tr></thead>
      <tbody>${rows.map((t) => html`<tr data-href="/admin/holiday-types/${t.id}">
        <td><div class="media-cell"><span class="thumb-ic">${icon(t.icon, 18)}</span><a class="strong" href="/admin/holiday-types/${t.id}">${t.name}</a></div></td>
        <td>${truncate(t.description, 60)}</td><td class="num">${t.package_count}</td>
        <td>${t.in_menu ? html`<span class="tag tag--sun">Menu</span>` : ''}</td>
        <td>${t.active ? pill('published', { published: 'Visible' }) : pill('draft', { draft: 'Hidden' })}</td>
        <td class="row-actions"><a href="/holidays/${t.slug}" target="_blank" rel="noopener" aria-label="View ${t.name} on website">${icon('external', 17)}</a></td>
      </tr>`)}</tbody></table></div>` : empty('No holiday types yet', 'Holiday types are categories like beach, safari or honeymoon holidays.', html`<a class="btn btn-primary btn-sm" href="/admin/holiday-types/new">${icon('plus', 16)} Add holiday type</a>`)}
  </section>`;
  return shell(ctx, { title: 'Holiday types', active: 'types', body, actions: html`<a class="btn btn-primary btn-sm" href="/admin/holiday-types/new">${icon('plus', 16)} Add holiday type</a>` });
}

function holidayTypeForm(ctx, { t, error }) {
  const isNew = !t.id;
  const body = html`${errorBox(error)}
  <form method="post" action="${isNew ? '/admin/holiday-types/new' : `/admin/holiday-types/${t.id}`}" enctype="multipart/form-data" class="edit-layout">
    ${csrfField(ctx)}
    <section class="panel"><div class="form-grid">
      ${field('Name', input('name', t.name, { required: true, maxlength: 60, data: 'data-slug-source', placeholder: 'e.g. Beach Holidays' }))}
      ${field('Web address', html`<span class="prefix-input"><span>/holidays/</span>${input('slug', t.slug, { maxlength: 60, data: 'data-slug-target' })}</span>`)}
      ${field('Short description', input('description', t.description, { maxlength: 160 }), { wide: true, hint: 'Shown on cards and under the page title.' })}
      ${field('Introduction', textarea('intro', t.intro, 4), { wide: true, hint: 'A paragraph at the top of the holiday type page.' })}
      <div class="f f--wide"><span class="f-label">Icon</span><div class="icon-pick">${EXP_ICONS.map((ic) => html`<label><input type="radio" name="icon" value="${ic}"${chk((t.icon || 'compass') === ic)}><span>${icon(ic, 22)}</span></label>`)}</div></div>
      ${imageField('image', 'Banner photo', t.image)}
    </div></section>
    <aside class="stack-lg side-sticky">
      <section class="panel"><div class="stack">
        ${toggle('active', isNew ? true : t.active, 'Visible on website')}
        ${toggle('in_menu', isNew ? true : t.in_menu, 'Show in the Holiday types menu')}
        ${field('Sort order', input('sort', t.sort ?? 0, { type: 'number' }), { hint: 'Lower numbers appear first in the menu.' })}
        <button class="btn btn-primary btn-block" type="submit">${isNew ? 'Create holiday type' : 'Save changes'}</button>
        ${!isNew ? html`<a class="btn btn-ghost btn-block" href="/holidays/${t.slug}" target="_blank" rel="noopener">${icon('external', 16)} View page</a>` : ''}
      </div></section>
      ${!isNew ? html`<section class="panel panel--plain"><button class="btn btn-danger-outline btn-sm btn-block" type="submit" form="del-form">${icon('trash', 16)} Delete holiday type</button></section>` : ''}
    </aside>
  </form>
  ${!isNew ? html`<form id="del-form" method="post" action="/admin/holiday-types/${t.id}/delete" data-confirm="Delete ${t.name}? Packages stay but are removed from this type.">${csrfField(ctx)}</form>` : ''}`;
  return shell(ctx, { title: isNew ? 'New holiday type' : t.name, active: 'types', body, back: { href: '/admin/holiday-types', label: 'Holiday types' } });
}

// ---------- FAQs ----------
function faqsAdmin(ctx, { rows, packages }) {
  const body = html`
  <p class="note">${icon('info', 16)} These questions appear in the FAQ section on the homepage (first six) and on the FAQs page. Each package has its own FAQs, edited inside the package.</p>
  <section class="panel panel--flush">
    <div class="panel-head panel-head--pad"><h2>Homepage FAQs</h2><a class="btn btn-primary btn-sm" href="/admin/faqs/new">${icon('plus', 16)} Add question</a></div>
    ${rows.length ? html`<div class="table-wrap"><table class="tbl">
      <thead><tr><th class="num">#</th><th>Question</th><th>Answer</th><th>Status</th><th>Order</th><th></th></tr></thead>
      <tbody>${rows.map((f, i) => html`<tr data-href="/admin/faqs/${f.id}">
        <td class="num">${i + 1}</td>
        <td><a class="strong" href="/admin/faqs/${f.id}">${f.question}</a>${i < 6 && f.published ? html`<small>On homepage</small>` : ''}</td>
        <td>${truncate(f.answer, 90)}</td>
        <td>${f.published ? pill('published', { published: 'Visible' }) : pill('draft', { draft: 'Hidden' })}</td>
        <td class="nowrap">
          <form method="post" action="/admin/faqs/${f.id}/move" class="inline">${csrfField(ctx)}<input type="hidden" name="dir" value="up"><button class="mini-btn" type="submit" aria-label="Move up"${attr(i === 0, 'disabled')}>${icon('down', 15, 'flip')}</button></form>
          <form method="post" action="/admin/faqs/${f.id}/move" class="inline">${csrfField(ctx)}<input type="hidden" name="dir" value="down"><button class="mini-btn" type="submit" aria-label="Move down"${attr(i === rows.length - 1, 'disabled')}>${icon('down', 15)}</button></form>
        </td>
        <td class="row-actions">
          <a href="/admin/faqs/${f.id}" aria-label="Edit question">${icon('edit', 17)}</a>
          ${deleteForm(ctx, `/admin/faqs/${f.id}/delete`, 'Delete', 'Delete this question?', 'link-btn danger')}
        </td>
      </tr>`)}</tbody></table></div>` : empty('No homepage FAQs yet', 'Add the questions customers ask most often. They appear on the homepage and the FAQs page.', html`<a class="btn btn-primary btn-sm" href="/admin/faqs/new">${icon('plus', 16)} Add question</a>`)}
  </section>
  <section class="panel panel--flush">
    <div class="panel-head panel-head--pad"><h2>Package FAQs</h2></div>
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Package</th><th class="num">Questions</th><th></th></tr></thead>
      <tbody>${packages.map((p) => html`<tr data-href="/admin/packages/${p.id}#faqs">
        <td><a class="strong" href="/admin/packages/${p.id}#faqs">${p.title}</a></td>
        <td class="num">${p.faq_count}</td>
        <td class="row-actions"><a class="link" href="/admin/packages/${p.id}#faqs">${p.faq_count ? 'Edit FAQs' : 'Add FAQs'}</a></td>
      </tr>`)}</tbody>
    </table></div>
  </section>`;
  return shell(ctx, { title: 'FAQs', active: 'faqs', body, actions: html`<a class="btn btn-ghost btn-sm" href="/faqs" target="_blank" rel="noopener">${icon('external', 16)} View FAQs page</a>` });
}

function faqForm(ctx, { f, error }) {
  const isNew = !f.id;
  const body = html`${errorBox(error)}
  <form method="post" action="${isNew ? '/admin/faqs/new' : `/admin/faqs/${f.id}`}" class="edit-layout">
    ${csrfField(ctx)}
    <section class="panel"><div class="form-grid">
      ${field('Question', input('question', f.question, { required: true, maxlength: 200, placeholder: 'e.g. Do I have to pay online?' }), { wide: true })}
      ${field('Answer', textarea('answer', f.answer, 7, { required: true }), { wide: true, hint: 'Leave a blank line between paragraphs.' })}
    </div></section>
    <aside class="stack-lg side-sticky">
      <section class="panel"><div class="stack">
        ${toggle('published', isNew ? true : f.published, 'Visible on website')}
        ${field('Sort order', input('sort', f.sort ?? 0, { type: 'number' }), { hint: 'Lower numbers appear first. The first six visible questions show on the homepage.' })}
        <button class="btn btn-primary btn-block" type="submit">${isNew ? 'Add question' : 'Save changes'}</button>
      </div></section>
      ${!isNew ? html`<section class="panel panel--plain"><button class="btn btn-danger-outline btn-sm btn-block" type="submit" form="del-form">${icon('trash', 16)} Delete question</button></section>` : ''}
    </aside>
  </form>
  ${!isNew ? html`<form id="del-form" method="post" action="/admin/faqs/${f.id}/delete" data-confirm="Delete this question?">${csrfField(ctx)}</form>` : ''}`;
  return shell(ctx, { title: isNew ? 'New question' : 'Edit question', active: 'faqs', body, back: { href: '/admin/faqs', label: 'FAQs' } });
}

// ---------- reviews ----------
function reviews(ctx, { rows }) {
  const body = html`
  <p class="note">${icon('info', 16)} Add genuine reviews from your travellers. Published reviews appear on the homepage and on the linked package, and give destinations their star rating.</p>
  <section class="panel panel--flush">
    ${rows.length ? html`<div class="table-wrap"><table class="tbl">
      <thead><tr><th>Traveller</th><th>Review</th><th>Rating</th><th>Package</th><th>Status</th></tr></thead>
      <tbody>${rows.map((r) => html`<tr data-href="/admin/reviews/${r.id}">
        <td><a class="strong" href="/admin/reviews/${r.id}">${r.name}</a><small>${r.location}</small></td>
        <td>${truncate(r.text, 80)}</td>
        <td class="nowrap"><span class="stars-s">${'★'.repeat(r.rating)}<span>${'★'.repeat(5 - r.rating)}</span></span></td>
        <td>${r.package_title || html`<span class="muted">—</span>`}</td>
        <td>${r.published ? pill('published', { published: 'Published' }) : pill('draft', { draft: 'Hidden' })}</td>
      </tr>`)}</tbody></table></div>` : empty('No reviews yet', 'When travellers send you feedback, add it here to show it on the website.', html`<a class="btn btn-primary btn-sm" href="/admin/reviews/new">${icon('plus', 16)} Add review</a>`)}
  </section>`;
  return shell(ctx, { title: 'Reviews', active: 'reviews', body, actions: html`<a class="btn btn-primary btn-sm" href="/admin/reviews/new">${icon('plus', 16)} Add review</a>` });
}

function reviewForm(ctx, { r, packages, error }) {
  const isNew = !r.id;
  const body = html`${errorBox(error)}
  <form method="post" action="${isNew ? '/admin/reviews/new' : `/admin/reviews/${r.id}`}" enctype="multipart/form-data" class="edit-layout">
    ${csrfField(ctx)}
    <section class="panel"><div class="form-grid">
      ${field('Traveller name', input('name', r.name, { required: true, maxlength: 80 }), { hint: 'First name and initial is fine, e.g. “Emily R.”' })}
      ${field('Location', input('location', r.location, { maxlength: 80, placeholder: 'e.g. Manchester, UK' }))}
      ${field('Review', textarea('text', r.text, 5, { required: true }), { wide: true })}
      <div class="f"><span class="f-label">Rating</span><div class="rating-pick">${[5, 4, 3, 2, 1].map((n) => html`<label><input type="radio" name="rating" value="${n}"${chk((r.rating || 5) === n)}><span>${'★'.repeat(n)}</span></label>`)}</div></div>
      ${field('Trip', select('package_id', r.package_id, [['', 'Not linked to a package'], ...packages.map((p) => [p.id, p.title])]))}
      ${imageField('avatar', 'Photo (optional)', r.avatar, 'Only with the traveller’s permission. Initials are shown otherwise.')}
    </div></section>
    <aside class="stack-lg side-sticky">
      <section class="panel"><div class="stack">
        ${toggle('published', isNew ? true : r.published, 'Published')}
        ${field('Sort order', input('sort', r.sort ?? 0, { type: 'number' }))}
        <button class="btn btn-primary btn-block" type="submit">${isNew ? 'Add review' : 'Save changes'}</button>
      </div></section>
      ${!isNew ? html`<section class="panel panel--plain"><button class="btn btn-danger-outline btn-sm btn-block" type="submit" form="del-form">${icon('trash', 16)} Delete review</button></section>` : ''}
    </aside>
  </form>
  ${!isNew ? html`<form id="del-form" method="post" action="/admin/reviews/${r.id}/delete" data-confirm="Delete this review?">${csrfField(ctx)}</form>` : ''}`;
  return shell(ctx, { title: isNew ? 'New review' : `Review by ${r.name}`, active: 'reviews', body, back: { href: '/admin/reviews', label: 'Reviews' } });
}

// ---------- enquiries ----------
function enquiries(ctx, { rows }) {
  const body = html`<section class="panel panel--flush">
    ${rows.length ? html`<div class="table-wrap"><table class="tbl">
      <thead><tr><th>From</th><th>Subject</th><th>Message</th><th>Received</th></tr></thead>
      <tbody>${rows.map((e) => html`<tr data-href="/admin/enquiries/${e.id}" class="${e.is_read ? '' : 'unread'}">
        <td><a class="strong" href="/admin/enquiries/${e.id}">${e.name}</a><small>${e.email}</small></td>
        <td>${e.subject || html`<span class="muted">—</span>`}</td>
        <td>${truncate(e.message, 70)}</td>
        <td class="nowrap">${fmtDateTime(e.created_at)}</td>
      </tr>`)}</tbody></table></div>` : empty('No enquiries yet', 'Messages sent from the Contact page appear here.')}
  </section>`;
  return shell(ctx, { title: 'Enquiries', active: 'enquiries', body });
}

function enquiry(ctx, { e }) {
  const body = html`<div class="detail-grid">
    <section class="panel">
      <div class="panel-head"><h2>${e.subject || 'Website enquiry'}</h2><span class="muted small">${fmtDateTime(e.created_at)}</span></div>
      <div class="message">${e.message}</div>
    </section>
    <aside class="stack-lg">
      <section class="panel">
        <p class="person"><span class="adm-avatar adm-avatar--lg">${initials(e.name)}</span><span><strong>${e.name}</strong></span></p>
        <ul class="contact">
          <li>${icon('mail', 16)} <a href="mailto:${e.email}">${e.email}</a></li>
          ${e.phone ? html`<li>${icon('phone', 16)} <a href="tel:${e.phone.replace(/[^\d+]/g, '')}">${e.phone}</a></li>` : ''}
        </ul>
        <div class="btn-col">
          <a class="btn btn-primary btn-sm" href="mailto:${e.email}?subject=${encodeURIComponent('Re: ' + (e.subject || 'Your enquiry'))}">${icon('send', 16)} Reply by email</a>
          <form method="post" action="/admin/enquiries/${e.id}/unread">${csrfField(ctx)}<button class="btn btn-ghost btn-sm btn-block" type="submit">${icon('inbox', 16)} Mark as unread</button></form>
        </div>
      </section>
      ${deleteForm(ctx, `/admin/enquiries/${e.id}/delete`, 'Delete enquiry', 'Delete this enquiry?')}
    </aside>
  </div>`;
  return shell(ctx, { title: e.name, active: 'enquiries', body, back: { href: '/admin/enquiries', label: 'Enquiries' } });
}

// ---------- subscribers & travellers ----------
function subscribers(ctx, { rows }) {
  const body = html`<section class="panel panel--flush">
    ${rows.length ? html`<div class="table-wrap"><table class="tbl">
      <thead><tr><th>Email</th><th>Subscribed</th><th></th></tr></thead>
      <tbody>${rows.map((r) => html`<tr><td>${r.email}</td><td>${fmtDateTime(r.created_at)}</td><td class="row-actions">${deleteForm(ctx, `/admin/subscribers/${r.id}/delete`, 'Remove', `Remove ${r.email} from the list?`, 'link-btn danger')}</td></tr>`)}</tbody>
    </table></div>` : empty('No subscribers yet', 'People who sign up to the newsletter appear here. Export the list to your email marketing tool.')}
  </section>`;
  return shell(ctx, { title: `Subscribers (${rows.length})`, active: 'subscribers', body, actions: rows.length ? html`<a class="btn btn-ghost btn-sm" href="/admin/subscribers/export.csv">${icon('download', 16)} Export CSV</a>` : '' });
}

function travellers(ctx, { rows }) {
  const body = html`<section class="panel panel--flush">
    ${rows.length ? html`<div class="table-wrap"><table class="tbl">
      <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th class="num">Bookings</th><th>Joined</th><th></th></tr></thead>
      <tbody>${rows.map((u) => html`<tr>
        <td class="strong">${u.name}</td><td><a href="mailto:${u.email}">${u.email}</a></td><td>${u.phone || html`<span class="muted">—</span>`}</td>
        <td class="num"><a href="/admin/bookings?q=${encodeURIComponent(u.email)}">${u.bookings}</a></td><td>${fmtDate(u.created_at)}</td>
        <td class="row-actions">${deleteForm(ctx, `/admin/travellers/${u.id}/delete`, 'Delete', `Delete the account for ${u.email}? Their bookings are kept.`, 'link-btn danger')}</td>
      </tr>`)}</tbody></table></div>` : empty('No traveller accounts yet', 'Travellers can create an account to see their trips. Guest bookings work without one.')}
  </section>`;
  return shell(ctx, { title: 'Travellers', active: 'travellers', body });
}

// ---------- pages ----------
const CORE_PAGES = ['about', 'booking-guide', 'terms', 'privacy'];
function pages(ctx, { rows }) {
  const body = html`<section class="panel panel--flush"><div class="table-wrap"><table class="tbl">
    <thead><tr><th>Page</th><th>Address</th><th>Last updated</th><th></th></tr></thead>
    <tbody>${rows.map((p) => html`<tr data-href="/admin/pages/${p.id}">
      <td><a class="strong" href="/admin/pages/${p.id}">${p.title}</a>${p.is_template ? html` <span class="tag tag--sun">Template, review before launch</span>` : ''}</td>
      <td><a href="/${p.slug}" target="_blank" rel="noopener">/${p.slug}</a></td><td>${fmtDateTime(p.updated_at)}</td>
      <td class="row-actions"><a href="/admin/pages/${p.id}" aria-label="Edit ${p.title}">${icon('edit', 17)}</a></td>
    </tr>`)}</tbody></table></div></section>`;
  return shell(ctx, { title: 'Pages', active: 'pages', body, actions: html`<a class="btn btn-primary btn-sm" href="/admin/pages/new">${icon('plus', 16)} Add page</a>` });
}

function pageForm(ctx, { pg, error }) {
  const isNew = !pg.id;
  const core = CORE_PAGES.includes(pg.slug);
  const body = html`${errorBox(error)}
  <form method="post" action="${isNew ? '/admin/pages/new' : `/admin/pages/${pg.id}`}" class="edit-layout">
    ${csrfField(ctx)}
    <section class="panel"><div class="form-grid">
      ${field('Title', input('title', pg.title, { required: true, maxlength: 120, data: 'data-slug-source' }), { wide: true })}
      ${core ? '' : field('Web address', html`<span class="prefix-input"><span>/</span>${input('slug', pg.slug, { maxlength: 60, data: 'data-slug-target' })}</span>`, { wide: true })}
      ${field('Content', textarea('content', pg.content, 22, { mono: true }), { wide: true })}
    </div></section>
    <aside class="stack-lg side-sticky">
      <section class="panel"><div class="stack">
        <button class="btn btn-primary btn-block" type="submit">${isNew ? 'Create page' : 'Save page'}</button>
        ${!isNew ? html`<a class="btn btn-ghost btn-block" href="/${pg.slug}" target="_blank" rel="noopener">${icon('external', 16)} View page</a>` : ''}
      </div></section>
      <section class="panel"><div class="panel-head"><h2>Formatting</h2></div>
        <ul class="md-help">
          <li><code>## Heading</code></li><li><code>### Smaller heading</code></li><li><code>**bold**</code> and <code>*italic*</code></li>
          <li><code>- item</code> for bullet lists</li><li><code>1. item</code> for numbered lists</li><li><code>[link text](/contact)</code></li><li>Blank line between paragraphs</li>
        </ul>
      </section>
      ${!isNew && !core ? html`<section class="panel panel--plain"><button class="btn btn-danger-outline btn-sm btn-block" type="submit" form="del-form">${icon('trash', 16)} Delete page</button></section>` : ''}
    </aside>
  </form>
  ${!isNew && !core ? html`<form id="del-form" method="post" action="/admin/pages/${pg.id}/delete" data-confirm="Delete this page?">${csrfField(ctx)}</form>` : ''}`;
  return shell(ctx, { title: isNew ? 'New page' : pg.title, active: 'pages', body, back: { href: '/admin/pages', label: 'Pages' } });
}

// ---------- settings ----------
function settingsPage(ctx, { tab, values, mailEnabled, mailFrom }) {
  const fields = FIELDS.filter((f) => f.group === tab);
  const body = html`
  <nav class="seg seg--tabs" aria-label="Settings sections">${GROUPS.map((g) => html`<a href="/admin/settings?tab=${g.id}"${attr(g.id === tab, 'aria-current', 'true')}>${g.label}</a>`)}<a href="/admin/settings?tab=email"${attr(tab === 'email', 'aria-current', 'true')}>Email</a><a href="/admin/team">Admin users</a></nav>
  ${tab === 'email' ? html`<section class="panel narrow-panel">
      <div class="panel-head"><h2>Email delivery</h2>${mailEnabled ? html`<span class="pill pill--confirmed">Connected</span>` : html`<span class="pill pill--pending">Not set up</span>`}</div>
      ${mailEnabled ? html`<p>Emails are sent from <strong>${mailFrom}</strong>. Booking confirmations, status updates and alerts to <strong>${values.notify_email || 'no address set'}</strong> are active.</p>
        <form method="post" action="/admin/settings/test-email" class="inline">${csrfField(ctx)}<button class="btn btn-primary btn-sm" type="submit">${icon('send', 16)} Send a test email</button></form>`
      : html`<p>The website works without email, but travellers won't receive booking confirmations and you won't get alerts. To turn it on, add your mailbox details to the <code>.env</code> file on the server (see the README) and restart the site:</p>
        <pre class="code">SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=admin@bespokeglobalescapes.co.uk
SMTP_PASS=your-app-password
MAIL_FROM=admin@bespokeglobalescapes.co.uk</pre>
        <p class="muted small">Gmail and Google Workspace need an “app password”. Microsoft 365 uses smtp.office365.com on port 587.</p>`}
    </section>`
    : html`<form method="post" action="/admin/settings?tab=${tab}" enctype="multipart/form-data" class="panel narrow-panel" data-dirty-guard>
      ${csrfField(ctx)}
      <div class="form-grid">
        ${fields.map((f) => (f.type === 'image' ? imageField(f.key, f.label, values[f.key], f.help)
          : field(f.label, f.type === 'textarea' ? textarea(f.key, values[f.key], 3) : input(f.key, values[f.key], { type: f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text', step: f.type === 'number' ? 'any' : undefined }), { hint: f.help, wide: f.type === 'textarea' || /title|subtitle|text|why_title|_points|description|address/.test(f.key) })))}
      </div>
      <div class="form-actions"><button class="btn btn-primary" type="submit">Save settings</button></div>
    </form>`}`;
  return shell(ctx, { title: 'Settings', active: 'settings', body });
}

function team(ctx, { admins, error }) {
  const body = html`
  <nav class="seg seg--tabs" aria-label="Settings sections">${GROUPS.map((g) => html`<a href="/admin/settings?tab=${g.id}">${g.label}</a>`)}<a href="/admin/settings?tab=email">Email</a><a href="/admin/team" aria-current="true">Admin users</a></nav>
  ${errorBox(error)}
  <div class="grid-2">
    <section class="panel">
      <div class="panel-head"><h2>Admin users</h2></div>
      <ul class="mini-list mini-list--rows">${admins.map((a) => html`<li><span class="adm-avatar">${initials(a.name)}</span><span><strong>${a.name}</strong><small>${a.email}</small></span>${a.id === ctx.admin.id ? html`<span class="tag">You</span>` : deleteForm(ctx, `/admin/team/${a.id}/delete`, 'Remove', `Remove admin access for ${a.email}?`, 'link-btn danger')}</li>`)}</ul>
      <h3 class="sub-h">Add an admin</h3>
      <form method="post" action="/admin/team" class="form-grid">
        ${csrfField(ctx)}
        ${field('Name', input('name', '', { required: true }))}
        ${field('Email', input('email', '', { type: 'email', required: true }))}
        ${field('Temporary password', input('password', '', { type: 'password', required: true, autocomplete: 'new-password' }), { hint: 'At least 10 characters. Share it securely and ask them to change it.' })}
        <div class="form-actions f--wide"><button class="btn btn-primary btn-sm" type="submit">Add admin</button></div>
      </form>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Change your password</h2></div>
      <form method="post" action="/admin/team/password" class="stack">
        ${csrfField(ctx)}
        ${field('Current password', input('current', '', { type: 'password', required: true, autocomplete: 'current-password' }))}
        ${field('New password', input('password', '', { type: 'password', required: true, autocomplete: 'new-password' }), { hint: 'At least 10 characters.' })}
        <button class="btn btn-primary" type="submit">Update password</button>
      </form>
    </section>
  </div>`;
  return shell(ctx, { title: 'Admin users', active: 'settings', body });
}

module.exports = {
  login, setup, dashboard, bookings, bookingDetail, bookingNew, packages, packageForm, destinations, destinationForm,
  holidayTypes, holidayTypeForm, faqsAdmin, faqForm, reviews, reviewForm, enquiries, enquiry, subscribers, travellers, pages, pageForm, settingsPage, team, CORE_PAGES,
};
