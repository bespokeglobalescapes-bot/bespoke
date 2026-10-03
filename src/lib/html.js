'use strict';
// Auto-escaping HTML template tag. Interpolated values are escaped unless
// they were produced by html`` or wrapped with raw().

class Safe {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ESC[c]);

function render(v) {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += render(vals[i]) + strings[i + 1];
  return new Safe(out);
}

const raw = (s) => new Safe(String(s ?? ''));
const attr = (cond, name, value = '') => (cond ? raw(value === '' ? ` ${name}` : ` ${name}="${esc(value)}"`) : '');
const sel = (a, b) => (String(a) === String(b) ? raw(' selected') : '');
const chk = (c) => (c ? raw(' checked') : '');

module.exports = { html, raw, esc, render, attr, sel, chk, Safe };
