'use strict';
const { html } = require('../lib/html');
const { icon } = require('../lib/icons');
const { money, fmtDate, addDays, isoDate } = require('../lib/util');
const L = require('./layout');
const { statusPill } = require('./public');

function authShell(ctx, { title, subtitle, body }) {
  const inner = html`
<section class="auth">
  <div class="auth-art">${L.img(ctx.s.hero_image, '', { w: 1400 })}<div class="auth-art-copy"><p class="script">${ctx.s.hero_script}</p><p>${ctx.s.site_name}</p></div></div>
  <div class="auth-panel">
    <div class="auth-box">
      <h1>${title}</h1>
      ${subtitle ? html`<p class="auth-sub">${subtitle}</p>` : ''}
      ${body}
    </div>
  </div>
</section>`;
  return L.page(ctx, { title, body: inner, noindex: true, bodyClass: 'is-auth' });
}

const errBox = (e) => (e ? html`<p class="form-error" role="alert">${icon('alert', 18)} ${e}</p>` : '');

function login(ctx, { error, values = {}, next = '' }) {
  return authShell(ctx, {
    title: 'Welcome back',
    subtitle: 'Sign in to see your trips and manage bookings.',
    body: html`<form method="post" action="/account/login" class="form-stack">
      <input type="hidden" name="_csrf" value="${ctx.csrf}"><input type="hidden" name="next" value="${next}">
      ${errBox(error)}
      <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required value="${values.email || ''}"></label>
      <label class="field"><span>Password</span><input type="password" name="password" autocomplete="current-password" required></label>
      <p class="form-aside"><a href="/account/forgot">Forgot your password?</a></p>
      <button class="btn btn-blue btn-block" type="submit">Sign in</button>
      <p class="form-foot">New here? <a href="/account/register${next ? `?next=${encodeURIComponent(next)}` : ''}">Create an account</a></p>
      <p class="form-foot">Booked as a guest? <a href="/booking/lookup">Find your booking</a></p>
    </form>`,
  });
}

function register(ctx, { error, values = {}, next = '' }) {
  return authShell(ctx, {
    title: 'Create your account',
    subtitle: 'Keep all your trips in one place and book faster next time.',
    body: html`<form method="post" action="/account/register" class="form-stack">
      <input type="hidden" name="_csrf" value="${ctx.csrf}"><input type="hidden" name="next" value="${next}">
      <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      ${errBox(error)}
      <label class="field"><span>Full name</span><input name="name" autocomplete="name" required maxlength="120" value="${values.name || ''}"></label>
      <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required maxlength="160" value="${values.email || ''}"></label>
      <label class="field"><span>Phone <small>(optional)</small></span><input type="tel" name="phone" autocomplete="tel" maxlength="40" value="${values.phone || ''}"></label>
      <label class="field"><span>Password</span><input type="password" name="password" autocomplete="new-password" minlength="8" required><small class="field-hint">At least 8 characters.</small></label>
      <button class="btn btn-blue btn-block" type="submit">Create account</button>
      <p class="form-foot">Already have an account? <a href="/account/login">Sign in</a></p>
    </form>`,
  });
}

function forgot(ctx, { sent, mailEnabled }) {
  return authShell(ctx, {
    title: 'Reset your password',
    subtitle: sent ? null : 'Enter your email and we will send you a link to choose a new password.',
    body: sent
      ? html`<div class="notice">${icon('mail', 22)}<p>If an account exists for that email, a reset link is on its way. It expires in one hour.</p></div><p class="form-foot"><a href="/account/login">Back to sign in</a></p>`
      : html`<form method="post" action="/account/forgot" class="form-stack">
        <input type="hidden" name="_csrf" value="${ctx.csrf}">
        ${mailEnabled ? '' : html`<p class="notice notice--warn">${icon('info', 18)} Email isn't set up on this site yet. Contact us at <a href="mailto:${ctx.s.contact_email}">${ctx.s.contact_email}</a> and we'll reset it for you.</p>`}
        <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required></label>
        <button class="btn btn-blue btn-block" type="submit">Send reset link</button>
        <p class="form-foot"><a href="/account/login">Back to sign in</a></p>
      </form>`,
  });
}

function reset(ctx, { token, error, invalid }) {
  return authShell(ctx, {
    title: 'Choose a new password',
    body: invalid
      ? html`<p class="form-error">${icon('alert', 18)} This reset link is invalid or has expired.</p><p class="form-foot"><a href="/account/forgot">Request a new link</a></p>`
      : html`<form method="post" action="/account/reset" class="form-stack">
        <input type="hidden" name="_csrf" value="${ctx.csrf}"><input type="hidden" name="token" value="${token}">
        ${errBox(error)}
        <label class="field"><span>New password</span><input type="password" name="password" autocomplete="new-password" minlength="8" required></label>
        <button class="btn btn-blue btn-block" type="submit">Save password</button>
      </form>`,
  });
}

function dashboard(ctx, { bookings, sign, tab = 'trips', error }) {
  const { s, user } = ctx;
  const today = isoDate();
  const upcoming = bookings.filter((b) => b.travel_date >= today && b.status !== 'cancelled');
  const past = bookings.filter((b) => !(b.travel_date >= today && b.status !== 'cancelled'));
  const card = (b) => html`<article class="trip-card">
    ${b.image ? L.img(b.image, '', { w: 500 }) : html`<div class="img-fallback">${icon('image', 28)}</div>`}
    <div class="trip-body">
      <p class="trip-ref">${b.ref} ${statusPill(b.status)}</p>
      <h3>${b.package_title}</h3>
      <p class="trip-meta">${icon('calendar', 15)} ${fmtDate(b.travel_date)}${b.days ? ` – ${fmtDate(addDays(b.travel_date, b.days - 1))}` : ''} · ${b.adults + b.children} ${b.adults + b.children === 1 ? 'traveller' : 'travellers'}</p>
      <p class="trip-total">${money(b.total, s.currency_symbol)} <small>estimated total</small></p>
    </div>
    <a class="btn btn-outline btn-sm" href="/booking/${b.ref}?t=${sign(b.ref)}">View booking</a>
  </article>`;
  const body = html`
<section class="banner banner--plain">
  <div class="container banner-inner account-banner">
    <div><p class="banner-kicker">My account</p><h1>Hello, ${user.name.split(' ')[0]}</h1></div>
    <form method="post" action="/account/logout"><input type="hidden" name="_csrf" value="${ctx.csrf}"><button class="btn btn-ghost-light btn-sm" type="submit">${icon('logout', 16)} Sign out</button></form>
  </div>
</section>
<section class="section">
  <div class="container account">
    <nav class="account-tabs" aria-label="Account">
      <a href="/account"${tab === 'trips' ? ' aria-current="page"' : ''}>${icon('ticket', 18)} My trips</a>
      <a href="/account?tab=profile"${tab === 'profile' ? ' aria-current="page"' : ''}>${icon('user', 18)} Profile &amp; password</a>
      <a href="/saved">${icon('heart', 18)} Saved</a>
    </nav>
    <div class="account-main">
      ${tab === 'profile' ? html`
        <div class="card form-card">
          <h2>Your details</h2>
          ${errBox(error)}
          <form method="post" action="/account/profile" class="form-stack">
            <input type="hidden" name="_csrf" value="${ctx.csrf}">
            <label class="field"><span>Full name</span><input name="name" required maxlength="120" value="${user.name}"></label>
            <label class="field"><span>Email</span><input type="email" name="email" required maxlength="160" value="${user.email}"></label>
            <label class="field"><span>Phone</span><input type="tel" name="phone" maxlength="40" value="${user.phone || ''}"></label>
            <button class="btn btn-blue" type="submit">Save details</button>
          </form>
        </div>
        <div class="card form-card">
          <h2>Change password</h2>
          <form method="post" action="/account/password" class="form-stack">
            <input type="hidden" name="_csrf" value="${ctx.csrf}">
            <label class="field"><span>Current password</span><input type="password" name="current" autocomplete="current-password" required></label>
            <label class="field"><span>New password</span><input type="password" name="password" autocomplete="new-password" minlength="8" required></label>
            <button class="btn btn-blue" type="submit">Update password</button>
          </form>
        </div>` : html`
        <h2 class="account-h">Upcoming trips</h2>
        ${upcoming.length ? html`<div class="trip-list">${upcoming.map(card)}</div>` : L.emptyState({ title: 'No upcoming trips', text: 'When you send a booking request it will appear here.', action: html`<a class="btn btn-blue" href="/packages">Find your next trip</a>` })}
        ${past.length ? html`<h2 class="account-h">Past and cancelled</h2><div class="trip-list">${past.map(card)}</div>` : ''}`}
    </div>
  </div>
</section>`;
  return L.page(ctx, { title: 'My trips', body, noindex: true });
}

module.exports = { login, register, forgot, reset, dashboard };
