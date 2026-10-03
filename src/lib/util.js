'use strict';
const crypto = require('node:crypto');
const { esc } = require('./html');

function slugify(s) {
  return String(s || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

function money(n, symbol = '£') {
  const v = Number(n) || 0;
  const hasPence = Math.round(v * 100) % 100 !== 0;
  return symbol + v.toLocaleString('en-GB', { minimumFractionDigits: hasPence ? 2 : 0, maximumFractionDigits: 2 });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(String(d).length === 10 ? d + 'T00:00:00Z' : d);
  if (isNaN(dt)) return String(d);
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}
const DISPLAY_TZ = process.env.DISPLAY_TIMEZONE || 'Europe/London';
const dtFmt = new Intl.DateTimeFormat('en-GB', { timeZone: DISPLAY_TZ, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
function fmtDateTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  const parts = Object.fromEntries(dtFmt.formatToParts(dt).map((p) => [p.type, p.value]));
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}`;
}
const isoDate = (d = new Date()) => d.toISOString().slice(0, 10);
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return isoDate(d); }
const nowIso = () => new Date().toISOString();

const lines = (s) => String(s || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const arr = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const str = (v, max = 5000) => String(Array.isArray(v) ? v[0] : (v ?? '')).trim().slice(0, max);
const int = (v, def = 0, min = -Infinity, max = Infinity) => { const n = parseInt(Array.isArray(v) ? v[0] : v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const num = (v, def = 0) => { const n = parseFloat(String(Array.isArray(v) ? v[0] : (v ?? '')).replace(/[£$,\s]/g, '')); return Number.isFinite(n) ? n : def; };
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || ''));
const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(new Date(s + 'T00:00:00Z'));

function parseJson(s, def) { try { const v = JSON.parse(s); return v ?? def; } catch { return def; } }

function bookingRef(prefix = 'BGE') {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = '';
  for (const b of crypto.randomBytes(6)) r += alphabet[b % alphabet.length];
  return `${prefix}-${r}`;
}

function truncate(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }

function discountPct(price, old) {
  const p = Number(price), o = Number(old);
  if (!o || !p || o <= p) return 0;
  return Math.round((1 - p / o) * 100);
}

function youtubeEmbed(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  let m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(u);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0`;
  m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u);
  if (m) return `https://player.vimeo.com/video/${m[1]}?autoplay=1`;
  return '';
}

// Small, safe Markdown renderer for admin-edited pages: headings, paragraphs,
// bullet/numbered lists, bold, italics, links and horizontal rules.
function inline(s) {
  let t = esc(s);
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
  t = t.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:|\/)[^)\s]*)\)/g, (_, text, href) => `<a href="${href}">${text}</a>`);
  return t;
}
function markdown(src) {
  const out = [];
  const ls = String(src || '').replace(/\r/g, '').split('\n');
  let para = [];
  let list = null;
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; } };
  for (const line of ls) {
    const l = line.trim();
    let m;
    if (!l) { flushPara(); flushList(); continue; }
    if ((m = /^(#{1,4})\s+(.*)$/.exec(l))) { flushPara(); flushList(); const lvl = Math.min(4, m[1].length + 1); out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`); continue; }
    if (/^(-{3,}|\*{3,})$/.test(l)) { flushPara(); flushList(); out.push('<hr>'); continue; }
    if ((m = /^[-*]\s+(.*)$/.exec(l))) { flushPara(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = /^\d+[.)]\s+(.*)$/.exec(l))) { flushPara(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    flushList();
    para.push(l);
  }
  flushPara(); flushList();
  return out.join('\n');
}

function csv(rows) {
  const cell = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s; };
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

function initials(name) {
  return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
}

module.exports = {
  slugify, money, fmtDate, fmtDateTime, isoDate, addDays, nowIso, lines, arr, str, int, num,
  isEmail, isIsoDate, parseJson, bookingRef, truncate, discountPct, youtubeEmbed, markdown, csv, initials,
};
