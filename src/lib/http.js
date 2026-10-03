'use strict';
// Minimal, dependency-free web framework: routing, body/cookie parsing,
// multipart uploads, static files and response helpers.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    try { out[k] = decodeURIComponent(v); } catch { out[k] = v; }
  }
  return out;
}

function addField(obj, key, value) {
  if (Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = [].concat(obj[key], value);
  else obj[key] = value;
}

function parseQuery(searchParams) {
  const o = Object.create(null);
  for (const [k, v] of searchParams) addField(o, k, v);
  return o;
}

function parseMultipart(buf, boundary) {
  const fields = Object.create(null);
  const files = [];
  const delim = Buffer.from('--' + boundary);
  let pos = buf.indexOf(delim);
  if (pos < 0) return { fields, files };
  pos += delim.length;
  for (;;) {
    if (buf[pos] === 45 && buf[pos + 1] === 45) break; // "--" closing delimiter
    pos += 2; // CRLF
    const headerEnd = buf.indexOf('\r\n\r\n', pos);
    if (headerEnd < 0) break;
    const headers = buf.subarray(pos, headerEnd).toString('utf8');
    const next = buf.indexOf(delim, headerEnd + 4);
    if (next < 0) break;
    const data = buf.subarray(headerEnd + 4, next - 2);
    const disp = /content-disposition:[^\r\n]*?\bname="([^"]*)"(?:;\s*filename="([^"]*)")?/i.exec(headers);
    const ctype = /content-type:\s*([^\r\n]+)/i.exec(headers);
    if (disp) {
      const name = disp[1];
      if (disp[2] !== undefined) {
        if (disp[2] && data.length) {
          files.push({ field: name, filename: disp[2], type: ctype ? ctype[1].trim().toLowerCase() : 'application/octet-stream', data: Buffer.from(data) });
        }
      } else {
        addField(fields, name, data.toString('utf8'));
      }
    }
    pos = next + delim.length;
  }
  return { fields, files };
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'The upload is too large.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function compile(pattern) {
  const keys = [];
  const src = pattern.replace(/\/+$/, '').replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:([a-zA-Z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; });
  return { re: new RegExp('^' + src + '/?$'), keys };
}

class App {
  constructor({ trustProxy = false, bodyLimit = 1024 * 1024, uploadLimit = 25 * 1024 * 1024 } = {}) {
    this.routes = [];
    this.middleware = [];
    this.statics = [];
    this.trustProxy = trustProxy;
    this.bodyLimit = bodyLimit;
    this.uploadLimit = uploadLimit;
    this.notFoundHandler = (req, res) => res.status(404).send('Not found', 'text/plain; charset=utf-8');
    this.errorHandler = (err, req, res) => res.status(500).send('Server error', 'text/plain; charset=utf-8');
  }

  use(fn) { this.middleware.push(fn); }
  static(prefix, dir, { maxAge = 0 } = {}) { this.statics.push({ prefix, dir: path.resolve(dir), maxAge }); }
  route(method, pattern, ...handlers) { const { re, keys } = compile(pattern); this.routes.push({ method, re, keys, handlers }); }
  get(p, ...h) { this.route('GET', p, ...h); }
  post(p, ...h) { this.route('POST', p, ...h); }
  notFound(fn) { this.notFoundHandler = fn; }
  onError(fn) { this.errorHandler = fn; }

  decorate(req, res) {
    const url = new URL(req.url, 'http://localhost');
    try { req.path = decodeURIComponent(url.pathname); } catch { req.path = url.pathname; }
    req.query = parseQuery(url.searchParams);
    req.search = url.search;
    req.cookies = parseCookies(req.headers.cookie);
    req.body = Object.create(null);
    req.files = [];
    req.params = Object.create(null);
    const fwdFor = this.trustProxy && req.headers['x-forwarded-for'];
    req.ip = fwdFor ? String(fwdFor).split(',')[0].trim() : (req.socket.remoteAddress || '');
    const fwdProto = this.trustProxy && req.headers['x-forwarded-proto'];
    req.secure = fwdProto ? String(fwdProto).split(',')[0].trim() === 'https' : !!req.socket.encrypted;
    req.locals = Object.create(null);

    res.statusCode = 200;
    const cookies = [];
    res.status = (code) => { res.statusCode = code; return res; };
    res.cookie = (name, value, opts = {}) => {
      let c = `${name}=${encodeURIComponent(value)}; Path=${opts.path || '/'}`;
      if (opts.maxAge !== undefined) c += `; Max-Age=${Math.floor(opts.maxAge)}`;
      if (opts.httpOnly !== false) c += '; HttpOnly';
      c += `; SameSite=${opts.sameSite || 'Lax'}`;
      if (opts.secure ?? req.secure) c += '; Secure';
      cookies.push(c);
      res.setHeader('Set-Cookie', cookies);
      return res;
    };
    res.clearCookie = (name) => res.cookie(name, '', { maxAge: 0 });
    res.send = (body, type = 'text/html; charset=utf-8') => {
      if (res.writableEnded) return;
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body ?? ''));
      if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', type);
      res.setHeader('Content-Length', buf.length);
      res.end(req.method === 'HEAD' ? undefined : buf);
    };
    res.json = (obj) => res.send(JSON.stringify(obj), 'application/json; charset=utf-8');
    res.redirect = (location, code = 303) => {
      if (res.writableEnded) return;
      res.statusCode = code;
      res.setHeader('Location', location);
      res.setHeader('Content-Length', 0);
      res.end();
    };
  }

  serveStatic(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    for (const s of this.statics) {
      if (!req.path.startsWith(s.prefix + '/')) continue;
      const rel = req.path.slice(s.prefix.length);
      const file = path.join(s.dir, path.normalize(rel));
      if (!file.startsWith(s.dir + path.sep)) return false;
      let stat;
      try { stat = fs.statSync(file); } catch { return false; }
      if (!stat.isFile()) return false;
      const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
      res.setHeader('ETag', etag);
      res.setHeader('Last-Modified', stat.mtime.toUTCString());
      res.setHeader('Cache-Control', s.maxAge ? `public, max-age=${s.maxAge}` : 'public, no-cache');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (req.headers['if-none-match'] === etag) { res.statusCode = 304; res.end(); return true; }
      res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);
      if (req.method === 'HEAD') { res.end(); return true; }
      fs.createReadStream(file).pipe(res);
      return true;
    }
    return false;
  }

  async parseBody(req) {
    if (req.method !== 'POST') return;
    const type = String(req.headers['content-type'] || '').toLowerCase();
    if (type.startsWith('multipart/form-data')) {
      const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(req.headers['content-type']);
      const buf = await readBody(req, this.uploadLimit);
      if (!m) return;
      const { fields, files } = parseMultipart(buf, m[1] || m[2]);
      req.body = fields;
      req.files = files;
    } else if (type.startsWith('application/json')) {
      const buf = await readBody(req, this.bodyLimit);
      try { req.body = JSON.parse(buf.toString('utf8') || '{}'); } catch { throw new HttpError(400, 'Invalid JSON'); }
    } else {
      const buf = await readBody(req, this.bodyLimit);
      req.body = parseQuery(new URLSearchParams(buf.toString('utf8')));
    }
  }

  async handle(req, res) {
    this.decorate(req, res);
    try {
      if (this.serveStatic(req, res)) return;
      await this.parseBody(req);
      for (const mw of this.middleware) {
        await mw(req, res);
        if (res.writableEnded) return;
      }
      const method = req.method === 'HEAD' ? 'GET' : req.method;
      for (const r of this.routes) {
        if (r.method !== method) continue;
        const m = r.re.exec(req.path);
        if (!m) continue;
        r.keys.forEach((k, i) => { try { req.params[k] = decodeURIComponent(m[i + 1]); } catch { req.params[k] = m[i + 1]; } });
        for (const h of r.handlers) {
          await h(req, res);
          if (res.writableEnded) return;
        }
        if (!res.writableEnded) await this.notFoundHandler(req, res);
        return;
      }
      await this.notFoundHandler(req, res);
    } catch (err) {
      if (res.writableEnded) { console.error(err); return; }
      try { await this.errorHandler(err, req, res); } catch (e) { console.error(e); if (!res.writableEnded) { res.statusCode = 500; res.end('Server error'); } }
    }
  }

  listen(port, host, cb) {
    const server = http.createServer((req, res) => this.handle(req, res));
    server.listen(port, host, cb);
    return server;
  }
}

module.exports = { App, HttpError, MIME };
