'use strict';
const { html, raw, sel, chk, attr } = require('../lib/html');
const { icon } = require('../lib/icons');
const { money, fmtDate, discountPct, lines, markdown, initials, addDays, isoDate, youtubeEmbed } = require('../lib/util');

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function hotelStars(n, size = 15) {
  const v = Math.max(0, Math.min(5, Math.round((Number(n) || 0) * 2) / 2));
  const row = [1, 2, 3, 4, 5].map(() => icon('star', size));
  return html`<span class="hstars hs-${v * 10}" role="img" aria-label="${v} out of 5 stars"><span class="hstars-base">${row}</span><span class="hstars-fill">${row}</span></span>`;
}
// The next 12 months from today, with this package's price (or closed) for each.
function upcomingMonths(p) {
  const tomorrow = addDays(isoDate(), 1);
  const out = [];
  const d = new Date(tomorrow + 'T00:00:00Z');
  let y = d.getUTCFullYear(), m = d.getUTCMonth();
  for (let i = 0; i < 12; i++) {
    const row = p.months[m];
    out.push({ ym: `${y}-${String(m + 1).padStart(2, '0')}`, label: `${SHORT_MONTHS[m]} ${y}`, long: `${row.name} ${y}`, closed: row.closed, price: row.price });
    m++; if (m > 11) { m = 0; y++; }
  }
  const open = out.filter((x) => !x.closed).map((x) => x.price);
  const min = open.length ? Math.min(...open) : null;
  const varies = open.length && Math.max(...open) !== min;
  const minCount = open.filter((v) => v === min).length;
  // Only highlight cheapest months when they stand out (not when most months share the price).
  out.forEach((x) => { x.best = varies && minCount <= 3 && !x.closed && x.price === min; });
  return out;
}
const L = require('./layout');
const { STYLES, BOOKING_STATUSES } = require('../models');

const WHY_ICONS = [['sparkles', 'sun'], ['bed', 'blue'], ['headset', 'sky'], ['shield', 'green'], ['tag', 'amber']];

function videoBtn(s, cls = 'btn btn-ghost-light') {
  const embed = youtubeEmbed(s.hero_video_url);
  if (!embed) return '';
  return html`<button type="button" class="${cls}" data-video="${embed}"><span class="play-dot">${icon('play', 14)}</span> Watch video</button>`;
}

// "Popular choices" slider in the homepage hero: every package ticked as a popular choice.
function popularSlider(list, s) {
  if (!list.length) return '';
  const n = list.length;
  const secs = Math.max(0, Math.min(30, parseInt(s.popular_interval, 10) || 0));
  const many = n > 1;
  return html`<aside class="pop-slider${many ? '' : ' pop-slider--single'}" aria-roledescription="carousel" aria-label="${s.popular_title || 'Popular choices'}" data-pop-slider data-interval="${many ? secs : 0}">
    <div class="pop-head">
      <span class="pop-title">${icon('flame', 16)} ${s.popular_title || 'Popular choices'}</span>
      ${many ? html`<div class="pop-nav">
        ${secs ? html`<button type="button" class="pop-btn pop-btn--play" data-pop-toggle aria-label="Pause slides"><span class="pop-ic-pause">${icon('pause', 14)}</span><span class="pop-ic-play">${icon('play', 14)}</span></button>` : ''}
        <button type="button" class="pop-btn" data-pop-prev aria-label="Previous trip">${icon('left', 18)}</button>
        <span class="pop-count" aria-hidden="true"><b data-pop-index>1</b> / ${n}</span>
        <button type="button" class="pop-btn" data-pop-next aria-label="Next trip">${icon('right', 18)}</button>
      </div>` : ''}
    </div>
    <div class="pop-viewport" data-pop-viewport tabindex="-1">
      ${list.map((p, i) => {
        const off = p.offer_active ? discountPct(p.price, p.old_price) : 0;
        const label = off ? `Save ${off}%` : (p.offer_active ? 'Special offer' : (/^popular choices?$/i.test(String(p.badge || '').trim()) ? '' : p.badge));
        return html`<article class="pop-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${n}: ${p.title}" data-pop-slide>
        <a class="pop-media" href="/packages/${p.slug}" tabindex="-1" aria-hidden="true">
          ${L.img(p.image, '', { w: 760, loading: i === 0 ? 'eager' : 'lazy' })}
          ${label ? html`<span class="pop-badge${off || p.offer_active ? ' pop-badge--deal' : ''}">${label}</span>` : ''}
        </a>
        <div class="pop-body">
          ${p.dest_name ? html`<p class="pop-dest">${icon('pin', 14)} ${p.dest_name}</p>` : ''}
          <h2 class="pop-name"><a href="/packages/${p.slug}">${p.title}</a></h2>
          <ul class="pop-facts">
            <li>${icon('calendar', 15)} ${p.days} days / ${p.nights} nights</li>
            ${p.board ? html`<li>${icon('meals', 15)} ${p.board}</li>` : ''}
          </ul>
          <div class="pop-foot">
            <p class="pop-price"><small>From</small>
              <span>${p.old_price && p.old_price > p.price ? html`<s>${money(p.old_price, s.currency_symbol)}</s> ` : ''}<strong>${money(p.price, s.currency_symbol)}</strong></span>
              <small>per person</small></p>
            <a class="btn btn-navy" href="/packages/${p.slug}">Book now ${icon('arrow', 16)}</a>
          </div>
        </div>
      </article>`;
      })}
    </div>
    ${many ? html`<div class="pop-dots">${list.map((p, i) => html`<button type="button" class="pop-dot" data-pop-dot="${i}" aria-label="Show trip ${i + 1}: ${p.title}"${attr(i === 0, 'aria-current', 'true')}></button>`)}</div>` : ''}
  </aside>`;
}

function recommendIllustration() {
  return raw(`<svg class="reco-art" viewBox="0 0 160 130" aria-hidden="true">
    <ellipse cx="80" cy="118" rx="62" ry="7" fill="#c9d6f7"/>
    <rect x="34" y="34" width="62" height="80" rx="10" fill="#1f4fd8"/>
    <rect x="34" y="34" width="62" height="80" rx="10" fill="url(#rg)"/>
    <rect x="52" y="20" width="26" height="16" rx="5" fill="none" stroke="#0a2463" stroke-width="5"/>
    <rect x="44" y="50" width="6" height="52" rx="3" fill="#ffffff" opacity=".35"/>
    <rect x="80" y="50" width="6" height="52" rx="3" fill="#ffffff" opacity=".35"/>
    <circle cx="44" cy="116" r="5" fill="#0a2463"/><circle cx="86" cy="116" r="5" fill="#0a2463"/>
    <path d="M86 88c8-16 30-20 46-12-2 6-6 10-12 12l18 6c-16 10-40 10-52-6Z" fill="#ffc21a"/>
    <path d="M98 86c10-4 22-4 30 0" stroke="#d99a00" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="104" y="98" width="30" height="20" rx="4" fill="#0a2463"/><circle cx="119" cy="108" r="6" fill="#5b8cff"/><rect x="108" y="95" width="9" height="5" rx="2" fill="#0a2463"/>
    <defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="#3d6cf0"/><stop offset="1" stop-color="#1f4fd8" stop-opacity="0"/></linearGradient></defs>
  </svg>`);
}

function faqList(faqs, { open = 0 } = {}) {
  return html`<div class="faq-list">${faqs.map((f, i) => html`<details class="faq"${attr(i === open, 'open')}>
    <summary><span>${f.question}</span><span class="faq-ic" aria-hidden="true">${icon('plus', 18)}</span></summary>
    <div class="faq-a">${String(f.answer || '').split(/\n\s*\n/).filter(Boolean).map((para) => html`<p>${para}</p>`)}</div>
  </details>`)}</div>`;
}

function faqSchema(faqs) {
  if (!faqs.length) return '';
  const data = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) };
  return raw(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`);
}

function faqHelp(s) {
  return html`<div class="faq-help">
    <span class="faq-help-ic">${icon('headset', 22)}</span>
    <div>
      <strong>Still have a question?</strong>
      <p>${s.contact_phone ? html`Call <a href="tel:${s.contact_phone.replace(/[^\d+]/g, '')}">${s.contact_phone}</a> or send us a message.` : 'Send us a message and we’ll get back to you.'}</p>
      <a class="btn btn-blue btn-sm" href="/contact">Ask our team</a>
    </div>
  </div>`;
}

function home(ctx, data) {
  const { s } = ctx;
  const { picks = [], popular, deals, reviews, destinations, types, faqs = [] } = data;
  const stats = [1, 2, 3].map((n) => ({ value: s[`stat_${n}_value`], label: s[`stat_${n}_label`], ic: ['users', 'pin', 'award'][n - 1] })).filter((x) => x.value);
  const why = [1, 2, 3, 4, 5].map((n) => ({ title: s[`why_${n}_title`], text: s[`why_${n}_text`], ic: WHY_ICONS[n - 1] })).filter((x) => x.title);
  const promoPoints = lines(s.promo_points);

  const body = html`
<section class="hero">
  <div class="hero-bg">${L.img(s.hero_image, '', { loading: 'eager', w: 2200 })}</div>
  <div class="container hero-inner">
    <div class="hero-copy">
      <h1><span>${s.hero_title}</span> <span class="script">${s.hero_script}</span></h1>
      <p class="hero-sub">${s.hero_subtitle}</p>
      <div class="hero-ctas">
        <a class="btn btn-sun btn-lg" href="/packages">Explore now ${icon('arrow', 18)}</a>
        ${videoBtn(s)}
      </div>
      ${s.rating_text ? html`<p class="hero-rating"><span class="stars-gold">${[1, 2, 3, 4, 5].map(() => icon('star', 16))}</span> ${s.rating_text}</p>` : ''}
    </div>
    ${popularSlider(picks, s)}
  </div>
  <div class="container hero-search">${L.searchBar({ s, destinations })}</div>
</section>

${popular.length ? html`<section class="section" aria-labelledby="pop-title">
  <div class="container">
    ${L.sectionHead(html`Popular destinations <span class="wave" aria-hidden="true">≈</span>`, '/destinations', 'View all destinations', { id: 'pop-title' })}
    <div class="dest-row" data-scroll-row>${popular.map((d) => L.destCard(d, s))}</div>
  </div>
</section>` : ''}

${why.length ? html`<section class="section section--tight">
  <div class="container">
    <div class="why">
      <p class="why-kicker">Why travel with us</p>
      <h2>${s.why_title}</h2>
      <ul class="why-list">
        ${why.map((w) => html`<li><span class="why-ic why-ic--${w.ic[1]}">${icon(w.ic[0], 24)}</span><div><h3>${w.title}</h3><p>${w.text}</p></div></li>`)}
      </ul>
    </div>
  </div>
</section>` : ''}

<section class="section section--tight">
  <div class="container">
    <form class="reco" action="/packages" method="get">
      ${recommendIllustration()}
      <div class="reco-copy">
        <h2>Not sure where to go?</h2>
        <p>Get personalised recommendations just for you.</p>
      </div>
      <label class="reco-field"><span>I want to go</span>
        <select name="type">
          <option value="">Any kind of holiday</option>
          ${types.map((t) => html`<option value="${t.slug}">${t.name}</option>`)}
        </select>
      </label>
      <label class="reco-field"><span>Budget</span>
        <select name="max">
          <option value="">Any budget</option>
          <option value="1000">Under ${money(1000, s.currency_symbol)}</option>
          <option value="1500">Under ${money(1500, s.currency_symbol)}</option>
          <option value="2500">Under ${money(2500, s.currency_symbol)}</option>
          <option value="5000">Under ${money(5000, s.currency_symbol)}</option>
        </select>
      </label>
      <button class="btn btn-blue" type="submit">Show me ideas ${icon('send', 16)}</button>
    </form>
  </div>
</section>

${deals.length ? html`<section class="section" aria-labelledby="deals-title">
  <div class="container">
    ${L.sectionHead('Special offers', '/special-offers', 'View all offers', { id: 'deals-title' })}
    <div class="pkg-grid pkg-grid--4">${deals.map((p) => L.packageCard(p, s, { gallery: true }))}</div>
  </div>
</section>` : ''}

<section class="section section--tight">
  <div class="container">
    <div class="promo">
      <div class="promo-bg">${L.img(s.promo_image, '', { w: 1800 })}</div>
      <div class="promo-copy">
        <h2><span>${s.promo_title}</span> <span class="script">${s.promo_script}</span></h2>
      </div>
      ${youtubeEmbed(s.hero_video_url) ? html`<button type="button" class="promo-play" data-video="${youtubeEmbed(s.hero_video_url)}" aria-label="Play video">${icon('play', 28)}</button>` : html`<span class="promo-play promo-play--static" aria-hidden="true">${icon('plane', 28)}</span>`}
      <div class="promo-side">
        ${promoPoints.length ? html`<ul>${promoPoints.map((p) => html`<li>${p}</li>`)}</ul>` : ''}
        <a class="btn btn-white btn-sm" href="/packages">Explore now ${icon('send', 15)}</a>
      </div>
    </div>
  </div>
</section>

${reviews.length ? html`<section class="section" aria-labelledby="rev-title">
  <div class="container">
    ${L.sectionHead('What travellers say', null, null, { id: 'rev-title' })}
    <div class="reviews${stats.length ? '' : ' reviews--full'}">
      <div class="review-track-wrap">
        <button class="carousel-btn prev" type="button" aria-label="Previous reviews" data-carousel-prev>${icon('left', 18)}</button>
        <div class="review-track" data-carousel tabindex="0" aria-label="Traveller reviews">
          ${reviews.map((r) => html`<figure class="review-card">
            <span class="quote-mark">${icon('quote', 26)}</span>
            <blockquote>${r.text}</blockquote>
            ${L.stars(r.rating)}
            <figcaption>
              ${r.avatar ? html`<img class="avatar" src="${r.avatar}" alt="" loading="lazy">` : html`<span class="avatar avatar--initials" aria-hidden="true">${initials(r.name)}</span>`}
              <span><strong>${r.name}</strong>${r.location ? html`<small>${r.location}</small>` : ''}</span>
            </figcaption>
          </figure>`)}
        </div>
        <button class="carousel-btn next" type="button" aria-label="Next reviews" data-carousel-next>${icon('right', 18)}</button>
      </div>
      ${stats.length ? html`<div class="stats-card">${stats.map((st) => html`<div class="stat">${icon(st.ic, 26)}<strong>${st.value}</strong><span>${st.label}</span></div>`)}</div>` : ''}
    </div>
  </div>
</section>` : stats.length ? html`<section class="section section--tight"><div class="container"><div class="stats-card stats-card--wide">${stats.map((st) => html`<div class="stat">${icon(st.ic, 26)}<strong>${st.value}</strong><span>${st.label}</span></div>`)}</div></div></section>` : ''}

${faqs.length ? html`<section class="section" aria-labelledby="faq-title">
  <div class="container faq-wrap">
    <div class="faq-intro">
      <h2 id="faq-title">${s.faq_title || 'Frequently asked questions'}</h2>
      ${s.faq_text ? html`<p>${s.faq_text}</p>` : ''}
      ${faqHelp(s)}
      ${faqs.length > 6 ? html`<a class="link-more" href="/faqs">See all ${faqs.length} questions ${icon('right', 16)}</a>` : ''}
    </div>
    ${faqList(faqs.slice(0, 6))}
  </div>
</section>` : ''}`;

  return L.page(ctx, { body, active: '/', bodyClass: 'is-home', image: s.hero_image });
}

// ---------- listings ----------

function destinationsPage(ctx, { destinations }) {
  const { s } = ctx;
  const body = html`
${L.banner({ title: 'Destinations', subtitle: 'From island hideaways to safari plains, find the place that fits your trip.', image: destinations[0]?.image, crumbs: [{ label: 'Destinations' }] })}
<section class="section">
  <div class="container">
    ${destinations.length ? html`<div class="dest-grid">${destinations.map((d) => L.destCard(d, s))}</div>` : L.emptyState({ title: 'No destinations yet', text: 'Check back soon.' })}
  </div>
</section>`;
  return L.page(ctx, { title: 'Destinations', body, active: '/destinations' });
}

function destinationPage(ctx, { d, packages, others }) {
  const { s } = ctx;
  const paras = String(d.description || '').split(/\n\s*\n/).filter(Boolean);
  const body = html`
${L.banner({ title: d.name, subtitle: d.summary, image: d.image, kicker: d.region, crumbs: [{ label: 'Destinations', href: '/destinations' }, { label: d.name }] })}
<section class="section">
  <div class="container dest-detail">
    <div class="prose">
      <h2>About ${d.name}</h2>
      ${paras.map((p) => html`<p>${p}</p>`)}
    </div>
    <aside class="side-card">
      <ul class="fact-list">
        <li>${icon('pin', 18)}<span><small>Region</small>${d.region || '—'}</span></li>
        <li>${icon('box', 18)}<span><small>Packages</small>${packages.length}</span></li>
        ${d.from_price != null ? html`<li>${icon('tag', 18)}<span><small>Prices from</small>${money(d.from_price, s.currency_symbol)} pp</span></li>` : ''}
        ${d.rating ? html`<li>${icon('star', 18)}<span><small>Traveller rating</small>${d.rating} / 5</span></li>` : ''}
      </ul>
      <a class="btn btn-blue btn-block" href="/contact?subject=${encodeURIComponent('Tailor-made trip to ' + d.name)}">Plan a tailor-made trip</a>
      ${L.saveBtn('d:' + d.slug, d.name)}
    </aside>
  </div>
</section>
<section class="section section--alt" aria-labelledby="dp-title">
  <div class="container">
    ${L.sectionHead(`Holidays in ${d.name}`, null, null, { id: 'dp-title' })}
    ${packages.length ? html`<div class="pkg-grid">${packages.map((p) => L.packageCard(p, s))}</div>`
      : L.emptyState({ title: 'No packages listed yet', text: `We can still build a trip to ${d.name} around you.`, action: html`<a class="btn btn-blue" href="/contact?subject=${encodeURIComponent('Trip to ' + d.name)}">Ask our team</a>` })}
  </div>
</section>
${others.length ? html`<section class="section"><div class="container">${L.sectionHead('More destinations', '/destinations', 'View all')}<div class="dest-row" data-scroll-row>${others.map((o) => L.destCard(o, s))}</div></div></section>` : ''}`;
  return L.page(ctx, { title: `${d.name} holidays`, description: d.summary, image: d.image, body, active: '/destinations' });
}

const BUDGETS = [['', 'Any budget'], ['1000', 'Under £1,000'], ['1500', 'Under £1,500'], ['2500', 'Under £2,500'], ['5000', 'Under £5,000']];

function packagesPage(ctx, { packages, filters, destinations, types, title = 'Holiday packages', subtitle, active = '/packages', dealsOnly = false, carry = '' }) {
  const { s } = ctx;
  const f = filters;
  const budgets = BUDGETS.map(([v, l]) => [v, v ? l.replace('£', s.currency_symbol) : l]);
  const filterCount = ['destination', 'type', 'style', 'max', 'duration'].filter((k) => f[k]).length + (f.deal && !dealsOnly ? 1 : 0);
  const body = html`
${L.banner({ title, subtitle: subtitle || 'Every trip can be tailored. Pick a starting point and send us a free booking request.', image: packages[0]?.image, crumbs: [{ label: title }] })}
<section class="section section--search">
  <div class="container">${L.searchBar({ s, destinations, values: f, compact: true })}</div>
</section>
<section class="section section--flush">
  <div class="container listing">
    <details class="filters" ${filterCount ? raw('open') : ''} data-filters>
      <summary>${icon('sliders', 18)} Filters ${filterCount ? html`<span class="count-pill">${filterCount}</span>` : ''}</summary>
      <form method="get" action="${dealsOnly ? '/special-offers' : '/packages'}" data-autosubmit>
        ${f.q ? html`<input type="hidden" name="q" value="${f.q}">` : ''}
        ${f.from ? html`<input type="hidden" name="from" value="${f.from}">` : ''}
        ${f.to ? html`<input type="hidden" name="to" value="${f.to}">` : ''}
        <input type="hidden" name="adults" value="${f.adults || 2}"><input type="hidden" name="children" value="${f.children || 0}">
        <input type="hidden" name="sort" value="${f.sort || ''}">
        <label class="field"><span>Destination</span>
          <select name="destination"><option value="">All destinations</option>${destinations.map((d) => html`<option value="${d.slug}"${sel(f.destination, d.slug)}>${d.name}</option>`)}</select>
        </label>
        <label class="field"><span>Holiday type</span>
          <select name="type"><option value="">All holiday types</option>${types.map((t) => html`<option value="${t.slug}"${sel(f.type, t.slug)}>${t.name}</option>`)}</select>
        </label>
        <fieldset class="field"><legend>Trip style</legend>
          <div class="chips">
            <label class="chip"><input type="radio" name="style" value=""${chk(!f.style)}><span>Any</span></label>
            ${['solo', 'couple', 'family', 'group'].map((k) => html`<label class="chip"><input type="radio" name="style" value="${k}"${chk(f.style === k)}><span>${STYLES[k].label.split(' ')[0]}</span></label>`)}
          </div>
        </fieldset>
        <label class="field"><span>Budget per person</span>
          <select name="max">${budgets.map(([v, l]) => html`<option value="${v}"${sel(f.max || '', v)}>${l}</option>`)}</select>
        </label>
        <fieldset class="field"><legend>Trip length</legend>
          <div class="chips">
            ${[['', 'Any'], ['short', 'Up to 5 nights'], ['week', '6–8 nights'], ['long', '9+ nights']].map(([v, l]) => html`<label class="chip"><input type="radio" name="duration" value="${v}"${chk((f.duration || '') === v)}><span>${l}</span></label>`)}
          </div>
        </fieldset>
        ${dealsOnly ? '' : html`<label class="check"><input type="checkbox" name="deal" value="1"${chk(f.deal)}> <span>Special offers only</span></label>`}
        <div class="filter-actions">
          <button class="btn btn-blue btn-sm" type="submit">Apply filters</button>
          <a class="btn btn-text btn-sm" href="${dealsOnly ? '/special-offers' : '/packages'}">Clear all</a>
        </div>
      </form>
    </details>
    <div class="results">
      <div class="results-head">
        <p><strong>${packages.length}</strong> ${packages.length === 1 ? 'trip' : 'trips'}${f.q ? html` matching “${f.q}”` : ''}${f.from ? html` · travelling ${fmtDate(f.from)}` : ''}</p>
        <form method="get" action="${dealsOnly ? '/special-offers' : '/packages'}" class="sort-form" data-autosubmit>
          ${Object.entries(f).filter(([k, v]) => v && k !== 'sort').map(([k, v]) => html`<input type="hidden" name="${k}" value="${v}">`)}
          <label><span class="visually-hidden">Sort by</span>
            <select name="sort">
              ${[['recommended', 'Recommended'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['duration', 'Shortest first'], ['newest', 'Newest']].map(([v, l]) => html`<option value="${v}"${sel(f.sort || 'recommended', v)}>${l}</option>`)}
            </select>
          </label>
        </form>
      </div>
      ${packages.length ? html`<div class="pkg-grid">${packages.map((p) => L.packageCard(p, s, { query: carry, gallery: dealsOnly }))}</div>`
        : L.emptyState({ title: 'No trips match those filters', text: 'Try removing a filter or searching for a different destination. We can also tailor a trip for you.', action: html`<a class="btn btn-blue" href="/contact">Ask for a tailor-made trip</a>` })}
    </div>
  </div>
</section>`;
  return L.page(ctx, { title, body, active });
}

function holidayTypesPage(ctx, { types }) {
  const { s } = ctx;
  const body = html`
${L.banner({ title: 'Holiday types', subtitle: 'Choose the kind of holiday you want and we will show you the trips that fit.', image: types[0]?.image, crumbs: [{ label: 'Holiday types' }] })}
<section class="section">
  <div class="container exp-grid">
    ${types.map((t) => html`<a class="exp-card" href="/holidays/${t.slug}">
      ${L.img(t.image, '', { w: 900 })}
      <div class="exp-body">
        <span class="exp-ic">${icon(t.icon, 22)}</span>
        <h2>${t.name}</h2>
        <p>${t.description}</p>
        <p class="exp-meta">${t.package_count} ${t.package_count === 1 ? 'trip' : 'trips'}${t.from_price != null ? html` · from ${money(t.from_price, s.currency_symbol)}` : ''} <span class="exp-go">${icon('arrow', 18)}</span></p>
      </div>
    </a>`)}
  </div>
</section>`;
  return L.page(ctx, { title: 'Holiday types', body, active: '/holiday-types' });
}

function sortSelect(action, keep, current, options) {
  return html`<form method="get" action="${action}" class="sort-form" data-autosubmit>
    ${Object.entries(keep).filter(([, v]) => v).map(([k, v]) => html`<input type="hidden" name="${k}" value="${v}">`)}
    <label><span class="visually-hidden">Sort by</span>
      <select name="sort">${options.map(([v, l]) => html`<option value="${v}"${sel(current || options[0][0], v)}>${l}</option>`)}</select>
    </label>
  </form>`;
}

function holidayTypePage(ctx, { t, packages, types, sort }) {
  const { s } = ctx;
  const others = types.filter((x) => x.id !== t.id);
  const body = html`
${L.banner({ title: t.name, subtitle: t.description, image: t.image, crumbs: [{ label: 'Holiday types', href: '/holiday-types' }, { label: t.name }] })}
<section class="section section--tight">
  <div class="container type-intro">
    <span class="type-ic">${icon(t.icon, 26)}</span>
    <div><p class="lead">${t.intro || t.description}</p>
    ${t.from_price != null ? html`<p class="type-from">${t.package_count} ${t.package_count === 1 ? 'trip' : 'trips'} from <strong>${money(t.from_price, s.currency_symbol)}</strong> per person</p>` : ''}</div>
  </div>
</section>
<section class="section section--flush">
  <div class="container">
    <div class="results-head">
      <p><strong>${packages.length}</strong> ${packages.length === 1 ? 'holiday' : 'holidays'}</p>
      ${sortSelect(`/holidays/${t.slug}`, {}, sort, [['recommended', 'Recommended'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['duration', 'Shortest first']])}
    </div>
    ${packages.length ? html`<div class="pkg-grid">${packages.map((p) => L.packageCard(p, s, { gallery: true }))}</div>`
      : L.emptyState({ title: `No ${t.name.toLowerCase()} listed yet`, text: 'We can still tailor one for you.', action: html`<a class="btn btn-blue" href="/contact?subject=${encodeURIComponent(t.name)}">Ask our team</a>` })}
  </div>
</section>
${others.length ? html`<section class="section"><div class="container">
  ${L.sectionHead('More holiday types', '/holiday-types', 'View all')}
  <div class="type-chips">${others.map((o) => html`<a class="type-chip" href="/holidays/${o.slug}">${icon(o.icon, 18)} ${o.name}</a>`)}</div>
</div></section>` : ''}`;
  return L.page(ctx, { title: t.name, description: t.intro || t.description, image: t.image, body, active: '/holidays' });
}

function specialOffersPage(ctx, { packages, destinations, types, filters }) {
  const { s } = ctx;
  const f = filters;
  const keep = { destination: f.destination, type: f.type };
  const chip = (label, params, on) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return html`<a class="chip-link${on ? ' is-on' : ''}" href="/special-offers${qs ? `?${qs}` : ''}"${on ? raw(' aria-current="true"') : ''}>${label}</a>`;
  };
  const body = html`
${L.banner({ title: 'Special offers', subtitle: 'Limited-time savings and extras on handpicked holidays. Prices are per person and subject to availability.', image: packages[0]?.image, crumbs: [{ label: 'Special offers' }] })}
<section class="section">
  <div class="container">
    <div class="offer-filters">
      <nav class="chip-row" aria-label="Filter offers by destination">
        ${chip('All destinations', { type: f.type, sort: f.sort }, !f.destination)}
        ${destinations.map((d) => chip(d.name, { destination: d.slug, type: f.type, sort: f.sort }, f.destination === d.slug))}
      </nav>
      <div class="offer-tools">
        <form method="get" action="/special-offers" class="sort-form" data-autosubmit>
          ${f.destination ? html`<input type="hidden" name="destination" value="${f.destination}">` : ''}
          ${f.sort ? html`<input type="hidden" name="sort" value="${f.sort}">` : ''}
          <label><span class="visually-hidden">Holiday type</span>
            <select name="type"><option value="">All holiday types</option>${types.map((t) => html`<option value="${t.slug}"${sel(f.type, t.slug)}>${t.name}</option>`)}</select>
          </label>
        </form>
        ${sortSelect('/special-offers', keep, f.sort, [['ending', 'Ending soonest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['recommended', 'Recommended']])}
      </div>
    </div>
    <p class="results-count"><strong>${packages.length}</strong> ${packages.length === 1 ? 'offer' : 'offers'}</p>
    ${packages.length ? html`<div class="pkg-grid">${packages.map((p) => L.packageCard(p, s, { gallery: true }))}</div>`
      : L.emptyState({ title: 'No offers match right now', text: 'New offers are added regularly. Try another destination or ask us for the latest prices.', action: html`<a class="btn btn-blue" href="/contact?subject=${encodeURIComponent('Latest offers')}">Ask for the latest offers</a>` })}
  </div>
</section>`;
  return L.page(ctx, { title: 'Special offers', body, active: '/special-offers' });
}

// ---------- package detail & booking ----------

function packagePage(ctx, { p, related, reviews, prices, prefill, types = [] }) {
  const { s } = ctx;
  const off = discountPct(p.price, p.old_price);
  const tomorrow = addDays(isoDate(), 1);
  const imgs = p.images.length ? p.images : [''];
  const dep = Number(s.deposit_percent) || 0;
  const u = ctx.user || {};
  const body = html`
<section class="pkg-hero">
  <div class="container">
    <nav class="crumbs crumbs--dark" aria-label="Breadcrumb"><ol>
      <li><a href="/">Home</a></li><li>${icon('right', 14)}<a href="/packages">Packages</a></li>
      ${p.dest_slug ? html`<li>${icon('right', 14)}<a href="/destinations/${p.dest_slug}">${p.dest_name}</a></li>` : ''}
      <li>${icon('right', 14)}<span aria-current="page">${p.title}</span></li>
    </ol></nav>
    <div class="pkg-title-row">
      <div>
        ${p.badge || p.offer_active ? html`<p class="pkg-tags">${p.offer_active ? html`<span class="badge badge--deal">${off ? `${off}% off` : 'Special offer'}</span>` : ''}${p.badge ? html`<span class="badge badge--sun">${p.badge}</span>` : ''}</p>` : ''}
        <h1>${p.title}</h1>
        <ul class="pkg-meta">
          ${p.dest_name ? html`<li>${icon('pin', 16)} ${p.dest_name}${p.dest_region ? `, ${p.dest_region}` : ''}</li>` : ''}
          <li>${icon('clock', 16)} ${p.days} days / ${p.nights} nights</li>
          ${p.board ? html`<li>${icon('meals', 16)} ${p.board}</li>` : ''}
          ${p.style && STYLES[p.style] ? html`<li>${icon(STYLES[p.style].icon, 16)} ${STYLES[p.style].label}</li>` : ''}
          ${p.rating ? html`<li>${icon('star', 16, 'gold')} ${p.rating} (${p.review_count} ${p.review_count === 1 ? 'review' : 'reviews'})</li>` : ''}
        </ul>
        ${types.length ? html`<p class="pkg-types">${types.map((t) => html`<a href="/holidays/${t.slug}">${icon(t.icon, 14)} ${t.name}</a>`)}</p>` : ''}
      </div>
      <div class="pkg-actions">
        <button class="btn btn-outline btn-sm save-inline" type="button" data-save="p:${p.slug}" aria-pressed="false">${icon('heart', 16)} <span data-save-label>Save</span></button>
        <button class="btn btn-outline btn-sm" type="button" data-share data-title="${p.title}">${icon('send', 16)} Share</button>
      </div>
    </div>
    <div class="gallery gallery--${Math.min(imgs.length, 5)}" data-gallery>
      ${imgs.slice(0, 5).map((src, i) => html`<button type="button" class="gallery-item" data-gallery-open="${i}" aria-label="View photo ${i + 1} of ${imgs.length}">${L.img(src, i === 0 ? p.title : '', { loading: i === 0 ? 'eager' : 'lazy', w: i === 0 ? 1600 : 800 })}${i === 4 && imgs.length > 5 ? html`<span class="more">+${imgs.length - 5}</span>` : ''}</button>`)}
    </div>
  </div>
</section>

<section class="section section--flush-top">
  <div class="container pkg-layout">
    <div class="pkg-content">
      <nav class="tabs" aria-label="Trip sections">
        <a href="#overview">Overview</a>${p.itinerary.length ? html`<a href="#itinerary">Itinerary</a>` : ''}${p.hotels.length ? html`<a href="#hotels">Hotels</a>` : ''}<a href="#dates">Dates &amp; prices</a><a href="#included">What's included</a>${p.faqs.length ? html`<a href="#faqs">FAQs</a>` : ''}${reviews.length ? html`<a href="#reviews">Reviews</a>` : ''}
      </nav>
      <section id="overview" class="block">
        <h2>Overview</h2>
        <p class="lead">${p.overview || p.summary}</p>
        ${lines(p.highlights).length ? html`<h3>Highlights</h3><ul class="ticks">${lines(p.highlights).map((h) => html`<li>${icon('check', 18)} ${h}</li>`)}</ul>` : ''}
      </section>
      ${p.itinerary.length ? html`<section id="itinerary" class="block">
        <h2>Itinerary</h2>
        <ol class="itinerary">
          ${p.itinerary.map((d, i) => html`<li>
            <details${attr(i === 0, 'open')}>
              <summary><span class="it-day">${d.label || `Day ${i + 1}`}</span><span class="it-title">${d.title}</span>${icon('down', 18, 'it-chev')}</summary>
              <p>${d.text}</p>
            </details>
          </li>`)}
        </ol>
      </section>` : ''}
      ${p.hotels.length ? html`<section id="hotels" class="block">
        <h2>${p.hotels.length > 1 ? 'Your hotels' : 'Your hotel'}</h2>
        ${p.hotels.length > 1 ? html`<p class="block-sub">This trip includes ${p.hotels.length} stays, in the order below.</p>` : ''}
        <div class="hotels">
          ${p.hotels.map((h, i) => {
            const imgs = (h.images || []).filter(Boolean);
            const fac = lines(h.facilities);
            return html`<article class="hotel">
              ${imgs.length ? html`<div class="hotel-gallery hotel-gallery--${Math.min(imgs.length, 3)}">
                ${imgs.slice(0, 3).map((src, j) => html`<button type="button" class="hg-item" data-gallery-images="${JSON.stringify(imgs)}" data-gallery-start="${j}" data-gallery-title="${h.name}" aria-label="View photo ${j + 1} of ${imgs.length} of ${h.name}">${L.img(src, j === 0 ? h.name : '', { w: j === 0 ? 1000 : 600 })}${j === 2 && imgs.length > 3 ? html`<span class="more">+${imgs.length - 3}</span>` : ''}</button>`)}
              </div>` : ''}
              <div class="hotel-body">
                ${p.hotels.length > 1 ? html`<p class="hotel-step">Stay ${i + 1}${h.nights ? html` · ${h.nights} ${h.nights === 1 ? 'night' : 'nights'}` : ''}</p>` : ''}
                <h3>${h.name}</h3>
                ${h.stars ? html`<p class="hotel-stars">${hotelStars(h.stars)} <span>${h.stars}-star</span></p>` : ''}
                ${h.location ? html`<p class="hotel-loc">${icon('pin', 15)} ${h.location}</p>` : ''}
                <dl class="hotel-facts">
                  ${h.nights ? html`<div><dt>${icon('moon', 15)} Nights</dt><dd>${h.nights}</dd></div>` : ''}
                  ${h.room ? html`<div><dt>${icon('bed', 15)} Room</dt><dd>${h.room}</dd></div>` : ''}
                  ${h.board ? html`<div><dt>${icon('meals', 15)} Board</dt><dd>${h.board}</dd></div>` : ''}
                  ${h.stars ? html`<div><dt>${icon('star', 15)} Rating</dt><dd>${h.stars} stars</dd></div>` : ''}
                </dl>
                ${h.description ? html`<p class="hotel-desc">${h.description}</p>` : ''}
                ${fac.length ? html`<ul class="hotel-fac">${fac.map((f) => html`<li>${icon('check', 14)} ${f}</li>`)}</ul>` : ''}
              </div>
            </article>`;
          })}
        </div>
      </section>` : ''}
      <section id="dates" class="block">
        <h2>Dates &amp; prices</h2>
        <p class="block-sub">Prices are per adult, based on two sharing. Choose your month to see the price, then pick your departure date.</p>
        <div class="months">
          ${upcomingMonths(p).map((m) => html`<button type="button" class="month${m.closed ? ' is-closed' : ''}${m.best ? ' is-best' : ''}" data-month="${m.ym}"${attr(m.closed, 'disabled')} aria-label="${m.long}: ${m.closed ? 'not available' : money(m.price, s.currency_symbol) + ' per adult'}">
            <span class="m-name">${m.label}</span>
            <strong>${m.closed ? 'Not available' : money(m.price, s.currency_symbol)}</strong>
            ${m.best ? html`<em>Best price</em>` : m.closed ? '' : html`<small>per adult</small>`}
          </button>`)}
        </div>
      </section>
      <section id="included" class="block">
        <h2>What's included</h2>
        <div class="incl-grid">
          <div><h3>Included</h3><ul class="ticks">${lines(p.inclusions).map((x) => html`<li>${icon('check', 18)} ${x}</li>`)}</ul></div>
          ${lines(p.exclusions).length ? html`<div><h3>Not included</h3><ul class="crosses">${lines(p.exclusions).map((x) => html`<li>${icon('x', 18)} ${x}</li>`)}</ul></div>` : ''}
        </div>
      </section>
      ${p.faqs.length ? html`<section id="faqs" class="block">
        <h2>Questions about this trip</h2>
        ${faqList(p.faqs, { open: -1 })}
        <p class="faq-more">Have another question? <a href="/contact?subject=${encodeURIComponent('Question about ' + p.title)}">Ask our team</a>${s.contact_phone ? html` or call ${s.contact_phone}` : ''}.</p>
      </section>
      ${faqSchema(p.faqs)}` : ''}
      ${reviews.length ? html`<section id="reviews" class="block">
        <h2>Reviews</h2>
        <div class="review-list">${reviews.map((r) => html`<figure class="review-card review-card--flat">
          ${L.stars(r.rating)}<blockquote>${r.text}</blockquote>
          <figcaption>${r.avatar ? html`<img class="avatar" src="${r.avatar}" alt="" loading="lazy">` : html`<span class="avatar avatar--initials" aria-hidden="true">${initials(r.name)}</span>`}<span><strong>${r.name}</strong>${r.location ? html`<small>${r.location}</small>` : ''}</span></figcaption>
        </figure>`)}</div>
      </section>` : ''}
    </div>

    <aside class="book-card" id="book" aria-labelledby="book-title">
      ${p.offer_active ? html`<div class="book-offer">${icon('tag', 16)} <span><strong>${p.offer_label || 'Special offer'}</strong>${p.offer_ends ? html` · ends ${fmtDate(p.offer_ends)}` : ''}</span></div>` : ''}
      <div class="book-price">
        <p><small>From</small> ${p.old_price && p.old_price > p.price ? html`<s>${money(p.old_price, s.currency_symbol)}</s>` : ''} <strong>${money(p.price, s.currency_symbol)}</strong> <small>per person</small></p>
      </div>
      <h2 id="book-title" class="visually-hidden">Request this trip</h2>
      <form method="post" action="/packages/${p.slug}/book" class="book-form" data-booking
        data-adult="${prices.adult}" data-child="${prices.child}" data-deposit="${dep}" data-currency="${s.currency_symbol}" data-nights="${p.nights}" data-days="${p.days}" data-max="${p.max_travellers || 16}"
        data-months="${JSON.stringify(p.months.map((m) => (m.closed ? null : m.price)))}" data-child-fixed="${p.child_price != null ? p.child_price : ''}" data-child-pct="${s.child_price_percent}">
        <input type="hidden" name="_csrf" value="${ctx.csrf}">
        <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label class="field"><span>Departure date</span>
          <input type="date" name="travel_date" min="${tomorrow}" value="${prefill.date && prefill.date >= tomorrow ? prefill.date : ''}" required data-book-date>
          <small class="field-hint" data-return-date></small>
        </label>
        <div class="field">
          <span>Travellers</span>
          <div class="trav-box">
            ${L.stepper('adults', 'Adults', 'Age 12+', prefill.adults || 2, 1, p.max_travellers || 16)}
            ${L.stepper('children', 'Children', 'Age 2–11', prefill.children || 0, 0, 10)}
          </div>
        </div>
        <p class="price-month" data-price-month aria-live="polite">Choose a departure date to see the price for your month.</p>
        <dl class="price-lines" data-price-lines aria-live="polite">
          <div><dt data-line-adults>Adults</dt><dd data-amt-adults>—</dd></div>
          <div data-row-children hidden><dt data-line-children>Children</dt><dd data-amt-children>—</dd></div>
          <div class="total"><dt>Estimated total</dt><dd data-amt-total>—</dd></div>
          ${dep ? html`<div class="deposit"><dt>Deposit to confirm (${dep}%)</dt><dd data-amt-deposit>—</dd></div>` : ''}
        </dl>
        <fieldset class="contact-fields">
          <legend>Your details</legend>
          <label class="field"><span>Full name</span><input name="name" autocomplete="name" required maxlength="120" value="${u.name || ''}"></label>
          <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required maxlength="160" value="${u.email || ''}"></label>
          <label class="field"><span>Phone</span><input type="tel" name="phone" autocomplete="tel" required maxlength="40" value="${u.phone || ''}"></label>
          <label class="field"><span>Requests or questions <small>(optional)</small></span><textarea name="notes" rows="3" maxlength="2000" placeholder="Room type, flight times, celebrations…"></textarea></label>
        </fieldset>
        <label class="check"><input type="checkbox" name="agree" value="1" required> <span>I agree to the <a href="/terms" target="_blank">terms</a> and <a href="/privacy" target="_blank">privacy policy</a>.</span></label>
        <button class="btn btn-sun btn-block btn-lg" type="submit">Request booking</button>
        <p class="book-note">${icon('shield', 16)} ${s.booking_note}</p>
      </form>
      ${s.contact_phone ? html`<p class="book-help">Prefer to talk? Call <a href="tel:${s.contact_phone.replace(/[^\d+]/g, '')}">${s.contact_phone}</a></p>` : ''}
    </aside>
  </div>
</section>

${related.length ? html`<section class="section section--alt" aria-labelledby="rel-title"><div class="container">${L.sectionHead('You might also like', '/packages', 'View all packages', { id: 'rel-title' })}<div class="pkg-grid pkg-grid--4">${related.map((r) => L.packageCard(r, s))}</div></div></section>` : ''}

<div class="mobile-book-bar">
  <p><small>From</small> <strong>${money(p.price, s.currency_symbol)}</strong> <small>pp</small></p>
  <a class="btn btn-sun" href="#book">Request booking</a>
</div>

<script type="application/json" id="gallery-data">${raw(JSON.stringify(imgs).replace(/</g, '\\u003c'))}</script>`;

  return L.page(ctx, { title: p.title, description: p.summary, image: p.image, body, active: '/packages', bodyClass: 'is-package' });
}

function statusPill(status) {
  return html`<span class="status status--${status}">${BOOKING_STATUSES[status] || status}</span>`;
}

function bookingPage(ctx, { b, pkg, token, justBooked }) {
  const { s } = ctx;
  const steps = lines(s.booking_next_steps);
  const returnDate = pkg ? addDays(b.travel_date, Math.max(0, (pkg.days || 1) - 1)) : null;
  const canCancel = ['pending', 'confirmed'].includes(b.status);
  const heading = justBooked ? 'Booking request sent'
    : b.status === 'confirmed' ? 'Your booking is confirmed'
      : b.status === 'cancelled' ? 'This booking was cancelled'
        : b.status === 'cancel_requested' ? 'Cancellation requested'
          : b.status === 'completed' ? 'Hope you had a great trip' : 'Your booking request';
  const body = html`
<section class="banner banner--plain">
  <div class="container banner-inner">
    <p class="banner-kicker">Booking reference</p>
    <h1>${b.ref}</h1>
  </div>
</section>
<section class="section">
  <div class="container narrow">
    <div class="confirm-card">
      <div class="confirm-head ${justBooked || b.status === 'confirmed' ? 'is-ok' : ''}">
        <span class="confirm-ic">${icon(b.status === 'cancelled' ? 'x' : 'check', 28)}</span>
        <div>
          <h2>${heading}</h2>
          <p>${justBooked ? html`Thank you, ${b.name.split(' ')[0]}. We have emailed a copy to <strong>${b.email}</strong>. Keep your reference handy.` : html`Status: ${statusPill(b.status)}`}</p>
        </div>
      </div>
      <div class="confirm-body">
        <div class="confirm-trip">
          ${pkg && pkg.image ? L.img(pkg.image, '', { w: 600 }) : ''}
          <div>
            <h3>${pkg ? html`<a href="/packages/${pkg.slug}">${b.package_title}</a>` : b.package_title}</h3>
            ${pkg ? html`<p>${pkg.dest_name ? `${pkg.dest_name} · ` : ''}${pkg.days} days / ${pkg.nights} nights</p>` : ''}
            ${justBooked ? statusPill(b.status) : ''}
          </div>
        </div>
        <dl class="summary">
          <div><dt>Departure</dt><dd>${fmtDate(b.travel_date)}</dd></div>
          ${returnDate ? html`<div><dt>Return</dt><dd>${fmtDate(returnDate)}</dd></div>` : ''}
          <div><dt>Travellers</dt><dd>${b.adults} ${b.adults === 1 ? 'adult' : 'adults'}${b.children ? `, ${b.children} ${b.children === 1 ? 'child' : 'children'}` : ''}</dd></div>
          <div><dt>Lead traveller</dt><dd>${b.name}<br><small>${b.email} · ${b.phone}</small></dd></div>
          <div><dt>Adults</dt><dd>${b.adults} × ${money(b.price_adult, s.currency_symbol)}</dd></div>
          ${b.children ? html`<div><dt>Children</dt><dd>${b.children} × ${money(b.price_child, s.currency_symbol)}</dd></div>` : ''}
          <div class="total"><dt>Estimated total</dt><dd>${money(b.total, s.currency_symbol)}</dd></div>
          ${b.deposit ? html`<div><dt>Deposit to confirm</dt><dd>${money(b.deposit, s.currency_symbol)}</dd></div>` : ''}
          ${b.amount_paid ? html`<div><dt>Paid so far</dt><dd>${money(b.amount_paid, s.currency_symbol)}</dd></div>` : ''}
          ${b.notes ? html`<div class="wide"><dt>Your requests</dt><dd>${b.notes}</dd></div>` : ''}
        </dl>
        ${justBooked && steps.length ? html`<h3>What happens next</h3><ol class="steps">${steps.map((st) => html`<li>${st}</li>`)}</ol>` : ''}
      </div>
      <div class="confirm-actions">
        <button class="btn btn-outline" type="button" data-print>${icon('printer', 18)} Print</button>
        ${ctx.user ? html`<a class="btn btn-outline" href="/account">${icon('user', 18)} My trips</a>` : justBooked ? html`<a class="btn btn-outline" href="/account/register?email=${encodeURIComponent(b.email)}&name=${encodeURIComponent(b.name)}">${icon('user', 18)} Create an account to track trips</a>` : ''}
        <a class="btn btn-blue" href="/packages">Browse more trips</a>
        ${canCancel && token ? html`<form method="post" action="/booking/${b.ref}/cancel" data-confirm="Request cancellation of ${b.ref}? Our team will contact you about any charges.">
          <input type="hidden" name="_csrf" value="${ctx.csrf}"><input type="hidden" name="t" value="${token}">
          <button class="btn btn-text btn-danger" type="submit">Request cancellation</button>
        </form>` : ''}
      </div>
    </div>
    <p class="help-line">Questions about this booking? ${s.contact_phone ? html`Call <a href="tel:${s.contact_phone.replace(/[^\d+]/g, '')}">${s.contact_phone}</a> or ` : ''}<a href="mailto:${s.contact_email}?subject=${encodeURIComponent('Booking ' + b.ref)}">email us</a> quoting ${b.ref}.</p>
  </div>
</section>`;
  return L.page(ctx, { title: `Booking ${b.ref}`, body, noindex: true });
}

function lookupPage(ctx, { values = {}, error }) {
  const body = html`
${L.banner({ title: 'Manage my booking', subtitle: 'Enter your booking reference and the email you booked with.', crumbs: [{ label: 'Manage my booking' }] })}
<section class="section">
  <div class="container narrow-sm">
    <form class="card form-card" method="post" action="/booking/lookup">
      <input type="hidden" name="_csrf" value="${ctx.csrf}">
      ${error ? html`<p class="form-error" role="alert">${icon('alert', 18)} ${error}</p>` : ''}
      <label class="field"><span>Booking reference</span><input name="ref" required placeholder="e.g. BGE-7K3P9Q" value="${values.ref || ''}" autocapitalize="characters"></label>
      <label class="field"><span>Email address</span><input type="email" name="email" required value="${values.email || ''}" autocomplete="email"></label>
      <button class="btn btn-blue btn-block" type="submit">Find my booking</button>
      <p class="form-foot">Have an account? <a href="/account/login">Sign in</a> to see all your trips.</p>
    </form>
  </div>
</section>`;
  return L.page(ctx, { title: 'Manage my booking', body, noindex: true });
}

// ---------- content ----------

function contentPage(ctx, { pg }) {
  const body = html`
${L.banner({ title: pg.title, crumbs: [{ label: pg.title }] })}
<section class="section">
  <div class="container narrow prose">${raw(markdown(pg.content))}</div>
</section>`;
  return L.page(ctx, { title: pg.title, body, active: '/' + pg.slug });
}

function faqsPage(ctx, { faqs }) {
  const { s } = ctx;
  const body = html`
${L.banner({ title: s.faq_title || 'Frequently asked questions', subtitle: s.faq_text, crumbs: [{ label: 'FAQs' }] })}
<section class="section">
  <div class="container faq-wrap faq-wrap--page">
    ${faqs.length ? faqList(faqs) : L.emptyState({ title: 'No questions yet', text: 'Contact us with any question about your trip.' })}
    <aside class="faq-intro">${faqHelp(s)}</aside>
  </div>
</section>
${faqSchema(faqs)}`;
  return L.page(ctx, { title: 'FAQs', body, active: '/faqs' });
}

function contactPage(ctx, { values = {}, errors = {} }) {
  const { s } = ctx;
  const err = (k) => (errors[k] ? html`<small class="field-error">${errors[k]}</small>` : '');
  const body = html`
${L.banner({ title: 'Contact us', subtitle: 'Tell us about the trip you have in mind and we will get back to you.', crumbs: [{ label: 'Contact' }] })}
<section class="section">
  <div class="container contact-grid">
    <form class="card form-card" method="post" action="/contact" novalidate>
      <h2>Send us a message</h2>
      <input type="hidden" name="_csrf" value="${ctx.csrf}">
      <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="field-row">
        <label class="field"><span>Full name</span><input name="name" required maxlength="120" autocomplete="name" value="${values.name || ''}">${err('name')}</label>
        <label class="field"><span>Email</span><input type="email" name="email" required maxlength="160" autocomplete="email" value="${values.email || ''}">${err('email')}</label>
      </div>
      <div class="field-row">
        <label class="field"><span>Phone <small>(optional)</small></span><input type="tel" name="phone" maxlength="40" autocomplete="tel" value="${values.phone || ''}"></label>
        <label class="field"><span>Subject</span><input name="subject" maxlength="160" value="${values.subject || ''}"></label>
      </div>
      <label class="field"><span>Message</span><textarea name="message" rows="6" required maxlength="5000" placeholder="Where would you like to go, when, and who is travelling?">${values.message || ''}</textarea>${err('message')}</label>
      <button class="btn btn-blue" type="submit">Send message ${icon('send', 16)}</button>
    </form>
    <aside class="contact-side">
      <div class="side-card">
        <h2>Get in touch</h2>
        <ul class="fact-list">
          ${s.contact_phone ? html`<li>${icon('phone', 18)}<span><small>Phone</small><a href="tel:${s.contact_phone.replace(/[^\d+]/g, '')}">${s.contact_phone}</a></span></li>` : ''}
          ${s.contact_email ? html`<li>${icon('mail', 18)}<span><small>Email</small><a href="mailto:${s.contact_email}">${s.contact_email}</a></span></li>` : ''}
          ${s.contact_whatsapp ? html`<li>${icon('whatsapp', 18)}<span><small>WhatsApp</small><a href="https://wa.me/${s.contact_whatsapp.replace(/\D/g, '')}" target="_blank" rel="noopener">Chat with us</a></span></li>` : ''}
          ${s.contact_address ? html`<li>${icon('pin', 18)}<span><small>Address</small>${s.contact_address}</span></li>` : ''}
          ${s.contact_hours ? html`<li>${icon('clock', 18)}<span><small>Opening hours</small>${s.contact_hours}</span></li>` : ''}
        </ul>
      </div>
      <div class="side-card side-card--blue">
        <h2>Already booked?</h2>
        <p>Look up your booking with your reference and email.</p>
        <a class="btn btn-white btn-sm" href="/booking/lookup">Manage my booking</a>
      </div>
    </aside>
  </div>
</section>`;
  return L.page(ctx, { title: 'Contact us', body, active: '/contact' });
}

function savedPage(ctx) {
  const body = html`
${L.banner({ title: 'Saved trips', subtitle: 'Trips and destinations you have saved on this device.', crumbs: [{ label: 'Saved' }] })}
<section class="section">
  <div class="container">
    <div data-saved-list><p class="loading">Loading your saved trips…</p></div>
    <template id="saved-empty">${L.emptyState({ title: 'Nothing saved yet', text: 'Tap the heart on any trip or destination to save it here.', action: html`<a class="btn btn-blue" href="/packages">Browse trips</a>` })}</template>
  </div>
</section>`;
  return L.page(ctx, { title: 'Saved trips', body, noindex: true });
}

function errorPage(ctx, { status, title, message }) {
  const body = html`
<section class="banner banner--plain"><div class="container banner-inner"><p class="banner-kicker">Error ${status}</p><h1>${title}</h1></div></section>
<section class="section"><div class="container narrow">${L.emptyState({ title: message, text: 'Use the links below to get back on track.', action: html`<div class="btn-row"><a class="btn btn-blue" href="/">Go to homepage</a><a class="btn btn-outline" href="/packages">Browse packages</a></div>` })}</div></section>`;
  return L.page(ctx, { title, body, noindex: true });
}

module.exports = {
  home, destinationsPage, destinationPage, packagesPage, holidayTypesPage, holidayTypePage, specialOffersPage, packagePage, bookingPage, lookupPage,
  contentPage, contactPage, faqsPage, savedPage, errorPage, statusPill,
};
