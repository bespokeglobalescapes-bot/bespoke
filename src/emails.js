'use strict';
// Email content for booking and account events.
const { esc } = require('./lib/html');
const { money, fmtDate } = require('./lib/util');
const { BOOKING_STATUSES } = require('./models');
const { queueMail } = require('./mail');

// Email header logo. Images need a full web address, so it is taken from the first link in the email
// (every email has one); without one the header shows the name only.
function logoHeader(s, bodyHtml) {
  const m = /href="(https?:\/\/[^"/]+)/.exec(bodyHtml);
  const parts = String(s.site_name || '').trim().split(/\s+/);
  const top = esc((parts[0] || '').toUpperCase()), rest = esc(parts.slice(1).join(' ').toUpperCase());
  const icon = m ? `<td style="padding-right:12px;vertical-align:middle"><img src="${esc(m[1])}/static/img/logo-mark-light.png" width="54" height="45" alt="" style="display:block;border:0"></td>` : '';
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>${icon}<td style="vertical-align:middle;font-family:Georgia,'Times New Roman',serif;color:#ffffff;line-height:1.15">
    <div style="font-size:22px;letter-spacing:4px">${top}</div>${rest ? `<div style="font-size:11px;letter-spacing:3px;color:#e2b968;padding-top:3px">${rest}</div>` : ''}</td></tr></table>`;
}

function wrap(s, title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7fc;font-family:Arial,Helvetica,sans-serif;color:#121a33">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fc;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden">
    <tr><td style="background:#0b1f4a;padding:18px 28px">${logoHeader(s, bodyHtml)}</td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 16px;font-size:22px;color:#0a2463">${esc(title)}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:18px 28px;background:#f5f7fc;color:#5e6782;font-size:13px">
      ${esc(s.site_name)}${s.contact_phone ? ' · ' + esc(s.contact_phone) : ''}${s.contact_email ? ' · ' + esc(s.contact_email) : ''}
    </td></tr>
  </table></td></tr></table></body></html>`;
}

function rows(pairs) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;font-size:15px">${pairs
    .filter(([, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e3e8f2;color:#5e6782;width:42%">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #e3e8f2;font-weight:bold">${esc(v)}</td></tr>`).join('')}</table>`;
}

const button = (href, label) => `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#1f4fd8;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;display:inline-block">${esc(label)}</a></p>`;

function bookingPairs(b, s) {
  return [
    ['Reference', b.ref], ['Trip', b.package_title], ['Departure', fmtDate(b.travel_date)],
    ['Travellers', `${b.adults} adult${b.adults === 1 ? '' : 's'}${b.children ? `, ${b.children} child${b.children === 1 ? '' : 'ren'}` : ''}`],
    ['Estimated total', money(b.total, s.currency_symbol)], ['Deposit to confirm', b.deposit ? money(b.deposit, s.currency_symbol) : ''],
  ];
}

function bookingReceived(b, s, link) {
  const pairs = bookingPairs(b, s);
  queueMail({
    siteName: s.site_name, to: b.email, replyTo: s.contact_email,
    subject: `We've received your booking request ${b.ref}`,
    text: `Hi ${b.name},\n\nThanks for your booking request. We'll check availability and contact you to confirm.\n\n${pairs.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nView your booking: ${link}\n\n${s.site_name}`,
    html: wrap(s, 'Booking request received', `<p>Hi ${esc(b.name.split(' ')[0])},</p><p>Thanks for your booking request. We'll check availability with our partners and contact you to confirm your trip and arrange payment.</p>${rows(pairs)}${button(link, 'View your booking')}<p style="color:#5e6782;font-size:14px">This is not yet a confirmed booking. Please quote ${esc(b.ref)} if you contact us.</p>`),
  });
}

function newBookingAlert(b, s, adminLink) {
  if (!s.notify_email) return;
  const pairs = [...bookingPairs(b, s), ['Name', b.name], ['Email', b.email], ['Phone', b.phone], ['Requests', b.notes]];
  queueMail({
    siteName: s.site_name, to: s.notify_email, replyTo: b.email,
    subject: `New booking request ${b.ref}: ${b.package_title}`,
    text: `New booking request\n\n${pairs.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nOpen in admin: ${adminLink}`,
    html: wrap(s, 'New booking request', `${rows(pairs)}${button(adminLink, 'Open in admin')}`),
  });
}

function statusChanged(b, s, link) {
  const label = BOOKING_STATUSES[b.status] || b.status;
  const intro = {
    confirmed: 'Great news: your booking is confirmed. We will be in touch with your travel documents before departure.',
    cancelled: 'Your booking has been cancelled. If you did not expect this, please contact us.',
    completed: 'Welcome home! We hope you had a wonderful trip. We would love to hear how it went.',
  }[b.status] || `Your booking status is now: ${label}.`;
  queueMail({
    siteName: s.site_name, to: b.email, replyTo: s.contact_email,
    subject: `Booking ${b.ref}: ${label}`,
    text: `Hi ${b.name},\n\n${intro}\n\n${bookingPairs(b, s).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nView your booking: ${link}`,
    html: wrap(s, `Booking ${label.toLowerCase()}`, `<p>Hi ${esc(b.name.split(' ')[0])},</p><p>${esc(intro)}</p>${rows(bookingPairs(b, s))}${button(link, 'View your booking')}`),
  });
}

function cancelRequestAlert(b, s, adminLink) {
  if (!s.notify_email) return;
  queueMail({
    siteName: s.site_name, to: s.notify_email, replyTo: b.email,
    subject: `Cancellation requested: ${b.ref}`,
    text: `${b.name} has requested cancellation of ${b.ref} (${b.package_title}, departing ${fmtDate(b.travel_date)}).\n\nOpen in admin: ${adminLink}`,
    html: wrap(s, 'Cancellation requested', `<p>${esc(b.name)} has requested cancellation of this booking.</p>${rows(bookingPairs(b, s))}${button(adminLink, 'Open in admin')}`),
  });
}

function enquiryAlert(e, s, adminLink) {
  if (!s.notify_email) return;
  queueMail({
    siteName: s.site_name, to: s.notify_email, replyTo: e.email,
    subject: `New enquiry from ${e.name}${e.subject ? `: ${e.subject}` : ''}`,
    text: `${e.name} <${e.email}> ${e.phone || ''}\n\n${e.subject}\n\n${e.message}\n\nOpen in admin: ${adminLink}`,
    html: wrap(s, 'New website enquiry', `${rows([['Name', e.name], ['Email', e.email], ['Phone', e.phone], ['Subject', e.subject]])}<p style="white-space:pre-wrap">${esc(e.message)}</p>${button(adminLink, 'Open in admin')}`),
  });
}

function passwordReset(user, s, link) {
  queueMail({
    siteName: s.site_name, to: user.email,
    subject: `Reset your ${s.site_name} password`,
    text: `Hi ${user.name},\n\nUse this link to choose a new password. It expires in one hour.\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    html: wrap(s, 'Reset your password', `<p>Hi ${esc(user.name.split(' ')[0])},</p><p>Use the button below to choose a new password. The link expires in one hour.</p>${button(link, 'Choose a new password')}<p style="color:#5e6782;font-size:14px">If you didn't ask for this, you can ignore this email.</p>`),
  });
}

module.exports = { bookingReceived, newBookingAlert, statusChanged, cancelRequestAlert, enquiryAlert, passwordReset };
