'use strict';
const { html, raw, attr } = require('../lib/html');
const { icon } = require('../lib/icons');
const { money, discountPct, fmtDate } = require('../lib/util');

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/destinations', label: 'Destinations', menu: 'destinations' },
  { href: '/holiday-types', label: 'Holiday types', menu: 'types' },
  { href: '/special-offers', label: 'Special offers' },
  { href: '/about', label: 'About us' },
  { href: '/contact', label: 'Contact' },
];

// Company logo icon (from the Bespoke Global Escapes logo): navy version for light backgrounds,
// white version for dark backgrounds. CSS shows the right one for where the logo sits.
const MARK_RATIO = 171 / 144;
function brandMark(size = 40, tone = 'auto') {
  const h = size, w = Math.round(size * MARK_RATIO);
  const navy = html`<img class="bi-navy" src="/static/img/logo-mark.png" width="${w}" height="${h}" alt="" decoding="async">`;
  const white = html`<img class="bi-white" src="/static/img/logo-mark-light.png" width="${w}" height="${h}" alt="" decoding="async">`;
  if (tone === 'navy') return html`<span class="brand-icon brand-icon--navy" aria-hidden="true">${navy}</span>`;
  if (tone === 'white') return html`<span class="brand-icon brand-icon--white" aria-hidden="true">${white}</span>`;
  return html`<span class="brand-icon" aria-hidden="true">${navy}${white}</span>`;
}

// Logo text: first word large ("BESPOKE"), the rest small in gold between rules ("GLOBAL ESCAPES").
function brandWords(name) {
  const parts = String(name || '').trim().split(/\s+/);
  const top = parts[0] || '';
  const rest = parts.slice(1).join(' ');
  return html`<span class="brand-words"><span class="bw-top">${top}</span>${rest ? html`<span class="bw-sub">${rest}</span>` : ''}</span>`;
}

function logo(s, { tagline = false } = {}) {
  if (s.logo) return html`<a class="brand brand--img" href="/" aria-label="${s.site_name} home"><img src="${s.logo}" alt="${s.site_name}"></a>`;
  return html`<a class="brand" href="/" aria-label="${s.site_name} home">
    ${brandMark(56)}${brandWords(s.site_name)}
  </a>${tagline && s.site_tagline ? html`<p class="brand-tagline">${s.site_tagline}</p>` : ''}`;
}

function faviconLinks() {
  return raw(`<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/static/img/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/static/img/favicon-16.png">
<link rel="apple-touch-icon" href="/static/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`);
}

function head({ title, description, s, image, canonical, noindex }) {
  const fullTitle = title ? `${title} | ${s.site_name}` : `${s.site_name} | ${s.site_tagline}`;
  return html`<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${fullTitle}</title>
<meta name="description" content="${description || s.seo_description}">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${description || s.seo_description}">
<meta property="og:type" content="website">
${image ? html`<meta property="og:image" content="${image}">` : ''}
${canonical ? html`<link rel="canonical" href="${canonical}">` : ''}
${noindex ? html`<meta name="robots" content="noindex">` : ''}
<meta name="theme-color" content="#0A2463">
${faviconLinks()}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://images.unsplash.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Kaushan+Script&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/css/site.css?v=${ASSET_V}">
</head>`;
}

const ASSET_V = Date.now().toString(36);

function thumb(src) {
  if (!src) return html`<span class="mm-thumb mm-thumb--empty">${icon('pin', 16)}</span>`;
  const t = /images\.unsplash\.com/.test(src) ? src.replace(/([?&])w=\d+/, '$1w=160') : src;
  return html`<img class="mm-thumb" src="${t}" alt="" loading="lazy">`;
}

function dropdown(n, menu, s, open) {
  if (n.menu === 'destinations') {
    const items = menu.destinations || [];
    return html`<div class="mega mega--dest" id="mm-${n.menu}">
      <ul>${items.map((d) => html`<li><a href="/destinations/${d.slug}">${thumb(d.image)}<span><strong>${d.name}</strong><small>${d.from_price != null ? `From ${money(d.from_price, s.currency_symbol)}` : d.region}</small></span></a></li>`)}</ul>
      <a class="mega-all" href="/destinations">All destinations ${icon('arrow', 16)}</a>
    </div>`;
  }
  const items = menu.types || [];
  return html`<div class="mega mega--types" id="mm-${n.menu}">
    <ul>${items.map((t) => html`<li><a href="/holidays/${t.slug}"><span class="mm-ic">${icon(t.icon, 18)}</span><span><strong>${t.name}</strong></span></a></li>`)}</ul>
    <a class="mega-all" href="/packages">View all holidays ${icon('arrow', 16)}</a>
  </div>`;
}

function header({ s, active, user, menu = {} }) {
  const isActive = (n) => (n.href === '/' ? active === '/' : active && (active.startsWith(n.href) || (n.menu === 'destinations' && active.startsWith('/destinations')) || (n.menu === 'types' && active.startsWith('/holidays'))));
  const hasItems = (n) => (n.menu === 'destinations' ? (menu.destinations || []).length : (menu.types || []).length);
  return html`<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header" data-header>
  <div class="container header-inner">
    ${logo(s)}
    <nav class="main-nav" id="main-nav" aria-label="Main">
      <ul>
        ${NAV.map((n) => (n.menu && hasItems(n)
          ? html`<li class="has-menu" data-menu>
              <a href="${n.href}" class="menu-link"${attr(isActive(n), 'aria-current', 'page')}>${n.label}</a>
              <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mm-${n.menu}" aria-label="Show ${n.label.toLowerCase()} menu" data-menu-toggle>${icon('down', 16)}</button>
              ${dropdown(n, menu, s)}
            </li>`
          : html`<li><a href="${n.href}"${attr(isActive(n), 'aria-current', 'page')}>${n.label}</a></li>`))}
      </ul>
      <div class="nav-extra">
        <a href="/saved" class="nav-saved">${icon('heart', 18)} Saved <span class="saved-count" data-saved-count hidden></span></a>
        ${user
          ? html`<a class="btn btn-pill btn-white" href="/account">${icon('user', 18)} My trips</a>`
          : html`<a class="btn btn-pill btn-white" href="/account/login">${icon('user', 18)} Sign in</a>`}
      </div>
    </nav>
    <div class="header-actions">
      <a href="/saved" class="icon-btn header-saved" aria-label="Saved trips">${icon('heart', 20)}<span class="saved-dot" data-saved-dot hidden></span></a>
      ${user
        ? html`<a class="btn btn-pill btn-white header-account" href="/account">${icon('user', 18)} <span>My trips</span></a>`
        : html`<a class="btn btn-pill btn-white header-account" href="/account/login">${icon('user', 18)} <span>Sign in</span></a>`}
      <button class="icon-btn nav-toggle" type="button" aria-controls="main-nav" aria-expanded="false" aria-label="Open menu" data-nav-toggle>${icon('menu', 24)}</button>
    </div>
  </div>
</header>`;
}

function socialLinks(s) {
  const items = [
    ['social_facebook', 'facebook', 'Facebook'], ['social_instagram', 'instagram', 'Instagram'], ['social_tiktok', 'tiktok', 'TikTok'],
    ['social_youtube', 'youtube', 'YouTube'], ['social_x', 'xsocial', 'X'],
  ].filter(([k]) => s[k]);
  if (!items.length) return '';
  return html`<ul class="social">${items.map(([k, ic, label]) => html`<li><a href="${s[k]}" target="_blank" rel="noopener" aria-label="${label}">${icon(ic, 18)}</a></li>`)}</ul>`;
}

function footer({ s, destinations = [], types = [], csrf }) {
  const year = new Date().getFullYear();
  return html`
<section class="newsletter-wrap" aria-labelledby="nl-title">
  <div class="container">
    <div class="newsletter">
      <div class="nl-icon" aria-hidden="true">${icon('mail', 30)}</div>
      <div class="nl-copy">
        <h2 id="nl-title">${s.newsletter_title}</h2>
        <p>${s.newsletter_text}</p>
      </div>
      <form class="nl-form" method="post" action="/subscribe" data-subscribe>
        <input type="hidden" name="_csrf" value="${csrf}">
        <label class="visually-hidden" for="nl-email">Email address</label>
        <div class="nl-field">
          <input id="nl-email" type="email" name="email" placeholder="Enter your email" autocomplete="email" required>
          <span class="nl-send" aria-hidden="true">${icon('send', 18)}</span>
        </div>
        <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button class="btn btn-sun" type="submit">Subscribe</button>
        <p class="nl-msg" role="status" aria-live="polite"></p>
      </form>
    </div>
  </div>
</section>
<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      ${logo(s, { tagline: true })}
      <p>${s.footer_about}</p>
      ${socialLinks(s)}
    </div>
    <nav aria-label="Quick links">
      <h3>Quick links</h3>
      <ul>
        <li><a href="/">Home</a></li><li><a href="/about">About us</a></li><li><a href="/destinations">Destinations</a></li>
        <li><a href="/holiday-types">Holiday types</a></li><li><a href="/special-offers">Special offers</a></li><li><a href="/contact">Contact us</a></li>
      </ul>
    </nav>
    <nav aria-label="Top destinations">
      <h3>Top destinations</h3>
      <ul>${destinations.slice(0, 6).map((d) => html`<li><a href="/destinations/${d.slug}">${d.name}</a></li>`)}</ul>
    </nav>
    <nav aria-label="Support">
      <h3>Support</h3>
      <ul>
        <li><a href="/faqs">FAQs</a></li><li><a href="/booking-guide">Booking guide</a></li><li><a href="/booking/lookup">Manage my booking</a></li>
        <li><a href="/terms">Terms &amp; conditions</a></li><li><a href="/privacy">Privacy policy</a></li>
      </ul>
    </nav>
    <div>
      <h3>Contact us</h3>
      <ul class="contact-list">
        ${s.contact_phone ? html`<li>${icon('phone', 18)}<a href="tel:${s.contact_phone.replace(/[^\d+]/g, '')}">${s.contact_phone}</a></li>` : ''}
        ${s.contact_email ? html`<li>${icon('mail', 18)}<a href="mailto:${s.contact_email}">${s.contact_email}</a></li>` : ''}
        ${s.contact_address ? html`<li>${icon('pin', 18)}<span>${s.contact_address}</span></li>` : ''}
        ${s.contact_hours ? html`<li>${icon('clock', 18)}<span>${s.contact_hours}</span></li>` : ''}
      </ul>
    </div>
  </div>
  <div class="container footer-bottom">
    <p>© ${year} ${s.site_name}. All rights reserved.</p>
    ${s.company_info ? html`<p class="company-info">${s.company_info}</p>` : ''}
  </div>
</footer>
${s.contact_whatsapp ? html`<a class="whatsapp-fab" href="https://wa.me/${s.contact_whatsapp.replace(/\D/g, '')}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${icon('whatsapp', 26)}</a>` : ''}`;
}

function flashBox(flash) {
  if (!flash) return '';
  return html`<div class="flash flash--${flash.type === 'error' ? 'error' : 'ok'}" role="status">${icon(flash.type === 'error' ? 'alert' : 'check', 18)}<span>${flash.msg}</span><button type="button" class="flash-close" aria-label="Dismiss" data-dismiss>${icon('x', 16)}</button></div>`;
}

function page(ctx, { title, description, image, body, active, bodyClass = '', noindex = false, scripts = '' }) {
  const { s } = ctx;
  return html`${head({ title, description, s, image, noindex })}
<body class="${bodyClass}">
${header({ s, active, user: ctx.user, menu: ctx.menu || {} })}
${ctx.flash ? html`<div class="flash-wrap container">${flashBox(ctx.flash)}</div>` : ''}
<main id="main">
${body}
</main>
${footer({ s, destinations: (ctx.menu && ctx.menu.destinations) || ctx.footerDestinations || [], csrf: ctx.csrf })}
<div class="modal" id="video-modal" hidden data-modal>
  <div class="modal-backdrop" data-close></div>
  <div class="modal-dialog modal-video" role="dialog" aria-modal="true" aria-label="Video">
    <button class="modal-close" type="button" data-close aria-label="Close video">${icon('x', 22)}</button>
    <div class="video-frame" data-video-frame></div>
  </div>
</div>
<div class="modal" id="lightbox" hidden data-modal>
  <div class="modal-backdrop" data-close></div>
  <div class="modal-dialog modal-lightbox" role="dialog" aria-modal="true" aria-label="Photo gallery">
    <button class="modal-close" type="button" data-close aria-label="Close gallery">${icon('x', 22)}</button>
    <button class="lb-nav lb-prev" type="button" data-lb-prev aria-label="Previous photo">${icon('left', 26)}</button>
    <img data-lb-img alt="">
    <button class="lb-nav lb-next" type="button" data-lb-next aria-label="Next photo">${icon('right', 26)}</button>
    <p class="lb-count" data-lb-count></p>
  </div>
</div>
<script src="/static/js/site.js?v=${ASSET_V}" defer></script>
${scripts}
</body>
</html>`;
}

// ---- reusable components ----

function stars(rating, size = 14) {
  const r = Math.round(Number(rating) || 0);
  return html`<span class="stars" aria-label="${rating} out of 5 stars">${[1, 2, 3, 4, 5].map((n) => html`<span class="${n <= r ? 'on' : 'off'}">${icon('star', size)}</span>`)}</span>`;
}

function img(src, alt, { cls = '', sizes = '', loading = 'lazy', w } = {}) {
  if (!src) return html`<div class="img-fallback ${cls}" role="img" aria-label="${alt}">${icon('image', 32)}</div>`;
  let s = src;
  if (w && /images\.unsplash\.com/.test(src)) s = src.replace(/([?&])w=\d+/, `$1w=${w}`);
  return html`<img class="${cls}" src="${s}" alt="${alt}" loading="${loading}" decoding="async"${attr(!!sizes, 'sizes', sizes)} onerror="this.onerror=null;this.classList.add('img-broken')">`;
}

function saveBtn(key, label) {
  return html`<button class="save-btn" type="button" data-save="${key}" aria-pressed="false" aria-label="Save ${label}">${icon('heart', 18)}</button>`;
}

function destCard(d, s) {
  return html`<article class="dest-card">
    <a href="/destinations/${d.slug}" class="dest-link">
      ${img(d.image, '', { w: 700 })}
      <div class="dest-info">
        <h3>${d.name}</h3>
        <p class="dest-region">${d.region}</p>
        <div class="dest-meta">
          ${d.rating ? html`<span class="rating">${icon('star', 13)} ${d.rating}</span>` : html`<span class="rating rating--muted">${d.package_count || 0} ${d.package_count === 1 ? 'trip' : 'trips'}</span>`}
          ${d.from_price != null ? html`<span class="dest-price"><small>from</small> ${money(d.from_price, s.currency_symbol)}</span>` : ''}
        </div>
      </div>
    </a>
    ${saveBtn('d:' + d.slug, d.name)}
  </article>`;
}

function offerBadge(p) {
  if (!p.offer_active) return p.badge ? html`<span class="badge badge--sun">${p.badge}</span>` : '';
  const off = discountPct(p.price, p.old_price);
  return html`<span class="badge badge--deal">${off ? `${off}% off` : 'Special offer'}</span>`;
}

function galleryBtn(p) {
  const imgs = (p.images || []).filter(Boolean);
  if (imgs.length < 2) return '';
  return html`<button class="gallery-btn" type="button" data-gallery-images="${JSON.stringify(imgs)}" data-gallery-title="${p.title}">${icon('image', 16)} ${imgs.length} photos</button>`;
}

function packageCard(p, s, { query = '', gallery = false } = {}) {
  return html`<article class="pkg-card${p.offer_active ? ' pkg-card--offer' : ''}">
    <div class="pkg-media">
      <a href="/packages/${p.slug}${query}" tabindex="-1" aria-hidden="true">${img(p.image, '', { w: 800 })}</a>
      ${offerBadge(p)}
      ${saveBtn('p:' + p.slug, p.title)}
      ${gallery ? galleryBtn(p) : ''}
    </div>
    <div class="pkg-body">
      <h3><a href="/packages/${p.slug}${query}">${p.title}</a></h3>
      <p class="pkg-sub">${p.dest_name ? html`${icon('pin', 14)} ${p.dest_name} · ` : ''}${p.days} days / ${p.nights} nights</p>
      ${p.offer_active && (p.offer_label || p.offer_ends) ? html`<p class="pkg-offer">${icon('tag', 14)} <span>${p.offer_label || 'Special offer'}${p.offer_ends ? html` <em>· ends ${fmtDate(p.offer_ends)}</em>` : ''}</span></p>` : ''}
      <div class="pkg-row">
        <p class="pkg-includes">${p.includes ? html`<span>Includes:</span> ${p.includes}` : ''}</p>
        <p class="pkg-price">
          ${p.old_price && p.old_price > p.price ? html`<s>${money(p.old_price, s.currency_symbol)}</s>` : ''}
          <strong>${money(p.price, s.currency_symbol)}</strong><small>per person</small>
        </p>
      </div>
      ${p.rating ? html`<p class="pkg-rating">${stars(p.rating, 12)} <span>${p.rating} (${p.review_count})</span></p>` : ''}
    </div>
    <a class="pkg-cta" href="/packages/${p.slug}${query}">${p.offer_active ? 'View offer' : 'View details'}</a>
  </article>`;
}

function banner({ title, subtitle, image, crumbs = [], kicker }) {
  return html`<section class="banner">
    ${image ? html`<div class="banner-bg">${img(image, '', { loading: 'eager', w: 2000 })}</div>` : ''}
    <div class="container banner-inner">
      ${crumbs.length ? html`<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li>${crumbs.map((c, i) => html`<li>${icon('right', 14)}${c.href && i < crumbs.length - 1 ? html`<a href="${c.href}">${c.label}</a>` : html`<span aria-current="page">${c.label}</span>`}</li>`)}</ol></nav>` : ''}
      ${kicker ? html`<p class="banner-kicker">${kicker}</p>` : ''}
      <h1>${title}</h1>
      ${subtitle ? html`<p class="banner-sub">${subtitle}</p>` : ''}
    </div>
  </section>`;
}

function searchBar({ s, destinations, values = {}, compact = false }) {
  const adults = Number(values.adults) || 2;
  const children = Number(values.children) || 0;
  return html`<form class="search-bar${compact ? ' search-bar--compact' : ''}" action="/packages" method="get" role="search" aria-label="Find a trip">
    <div class="sb-field sb-where">
      ${icon('search', 20)}
      <label><span>Where to?</span>
        <input name="q" list="dest-list" placeholder="Search destinations" value="${values.q || ''}" autocomplete="off">
      </label>
      <datalist id="dest-list">${destinations.map((d) => html`<option value="${d.name}">`)}</datalist>
    </div>
    <div class="sb-field">
      ${icon('calendar', 20)}
      <label><span>Check in</span><input type="date" name="from" value="${values.from || ''}" data-date-from></label>
    </div>
    <div class="sb-field">
      ${icon('calendar', 20)}
      <label><span>Check out</span><input type="date" name="to" value="${values.to || ''}" data-date-to></label>
    </div>
    <div class="sb-field sb-travellers" data-travellers>
      ${icon('users', 20)}
      <button type="button" class="sb-trigger" aria-expanded="false" aria-controls="trav-pop" data-trav-toggle>
        <span class="sb-label">Travellers</span>
        <span class="sb-value" data-trav-summary>${adults} ${adults === 1 ? 'Adult' : 'Adults'}${children ? `, ${children} ${children === 1 ? 'Child' : 'Children'}` : ''}</span>
        ${icon('down', 18, 'sb-chev')}
      </button>
      <div class="trav-pop" id="trav-pop" hidden>
        ${stepper('adults', 'Adults', 'Age 12+', adults, 1, 16)}
        ${stepper('children', 'Children', 'Age 2–11', children, 0, 10)}
        <button type="button" class="btn btn-blue btn-sm" data-trav-done>Done</button>
      </div>
    </div>
    <button class="btn btn-blue sb-submit" type="submit">${icon('search', 18)} <span>Search</span></button>
  </form>`;
}

function stepper(name, label, hint, value, min, max) {
  return html`<div class="stepper" data-stepper>
    <div><strong>${label}</strong><small>${hint}</small></div>
    <div class="stepper-ctrl">
      <button type="button" data-step="-1" aria-label="Fewer ${label.toLowerCase()}">${icon('minus', 16)}</button>
      <input type="number" name="${name}" value="${value}" min="${min}" max="${max}" inputmode="numeric" aria-label="${label}" data-step-input>
      <button type="button" data-step="1" aria-label="More ${label.toLowerCase()}">${icon('plus', 16)}</button>
    </div>
  </div>`;
}

function sectionHead(title, link, linkLabel, { id } = {}) {
  return html`<div class="section-head">
    <h2${attr(!!id, 'id', id)}>${title}</h2>
    ${link ? html`<a class="link-more" href="${link}">${linkLabel} ${icon('right', 16)}</a>` : ''}
  </div>`;
}

function emptyState({ title, text, action }) {
  return html`<div class="empty">${icon('compass', 40)}<h3>${title}</h3><p>${text}</p>${action || ''}</div>`;
}

module.exports = {
  page, head, header, footer, logo, brandMark, brandWords, faviconLinks, stars, img, saveBtn, destCard, packageCard, offerBadge, galleryBtn, banner, searchBar, stepper, sectionHead, emptyState, flashBox, NAV, ASSET_V,
};
