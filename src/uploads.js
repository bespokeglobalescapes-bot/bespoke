'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');

const MAX_BYTES = 8 * 1024 * 1024;

function detectType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  const ftyp = buf.toString('ascii', 4, 12);
  if (ftyp === 'ftypavif' || ftyp === 'ftypavis') return 'avif';
  return null;
}

// Saves an uploaded image and returns its public URL. Throws a friendly error for bad files.
function saveImage(file) {
  if (!file || !file.data || !file.data.length) return null;
  if (file.data.length > MAX_BYTES) throw new Error(`“${file.filename}” is larger than 8 MB. Resize it and try again.`);
  const ext = detectType(file.data);
  if (!ext) throw new Error(`“${file.filename}” isn't a JPG, PNG, WebP, GIF or AVIF image.`);
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(config.uploadsDir, name), file.data);
  return `/uploads/${name}`;
}

module.exports = { saveImage };
