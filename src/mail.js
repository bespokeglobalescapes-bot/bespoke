'use strict';
// Tiny SMTP client (implicit TLS on 465, STARTTLS on 587/25) so the site can
// send booking emails without extra packages. If SMTP isn't configured,
// emails are written to the server log instead.
const net = require('node:net');
const tls = require('node:tls');
const crypto = require('node:crypto');
const os = require('node:os');
const config = require('./config');

function smtpSend({ host, port, secure, user, pass }, from, to, data) {
  return new Promise((resolve, reject) => {
    let socket;
    let buffer = '';
    let waiter = null;
    const timeout = setTimeout(() => fail(new Error('SMTP timeout')), 30000);

    function fail(err) { clearTimeout(timeout); try { socket && socket.destroy(); } catch {} reject(err); }
    function onData(chunk) {
      buffer += chunk.toString('utf8');
      if (!waiter) return; // keep it until someone is reading
      const lines = buffer.split('\r\n');
      // A complete reply ends with a line "NNN text" (space after code).
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) {
          const reply = lines.slice(0, i + 1).join('\n');
          buffer = lines.slice(i + 1).join('\r\n');
          const w = waiter; waiter = null;
          if (w) w(reply);
          return;
        }
      }
    }
    const read = () => new Promise((res) => { waiter = res; if (buffer) onData(Buffer.alloc(0)); });
    async function cmd(line, expect) {
      if (line !== null) socket.write(line + '\r\n');
      const reply = await read();
      const code = parseInt(reply.slice(0, 3), 10);
      if (!expect.includes(code)) throw new Error(`SMTP ${code}: ${reply.split('\n').pop()}`);
      return reply;
    }
    function attach(s) { socket = s; socket.on('data', onData); socket.on('error', fail); }

    const run = async () => {
      await cmd(null, [220]);
      const helo = os.hostname() || 'localhost';
      let ehlo = await cmd(`EHLO ${helo}`, [250]);
      if (!secure && /STARTTLS/i.test(ehlo)) {
        await cmd('STARTTLS', [220]);
        socket.removeListener('data', onData);
        await new Promise((res, rej) => {
          const t = tls.connect({ socket, servername: host }, res);
          t.on('error', rej);
          attach(t);
        });
        ehlo = await cmd(`EHLO ${helo}`, [250]);
      }
      if (user) {
        if (/AUTH[^\n]*PLAIN/i.test(ehlo)) {
          await cmd('AUTH PLAIN ' + Buffer.from(`\0${user}\0${pass}`).toString('base64'), [235]);
        } else {
          await cmd('AUTH LOGIN', [334]);
          await cmd(Buffer.from(user).toString('base64'), [334]);
          await cmd(Buffer.from(pass).toString('base64'), [235]);
        }
      }
      await cmd(`MAIL FROM:<${from}>`, [250]);
      for (const r of to) await cmd(`RCPT TO:<${r}>`, [250, 251]);
      await cmd('DATA', [354]);
      await cmd(data.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..') + '\r\n.', [250]);
      socket.write('QUIT\r\n');
      clearTimeout(timeout);
      socket.end();
      resolve();
    };

    if (secure) attach(tls.connect({ host, port, servername: host }, () => run().catch(fail)));
    else { const s = net.connect({ host, port }, () => run().catch(fail)); attach(s); }
  });
}

const encodeHeader = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`);
const addr = (s) => (String(s).match(/<([^>]+)>/) || [null, String(s).trim()])[1];

function buildMessage({ fromName, from, to, replyTo, subject, text, html }) {
  const boundary = 'b' + crypto.randomBytes(12).toString('hex');
  const b64 = (s) => Buffer.from(s).toString('base64').replace(/.{76}/g, '$&\r\n');
  const headers = [
    `From: ${encodeHeader(fromName)} <${from}>`,
    `To: ${to.join(', ')}`,
    replyTo ? `Reply-To: ${replyTo}` : null,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomBytes(12).toString('hex')}@${from.split('@')[1] || 'localhost'}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean);
  return headers.join('\r\n') + '\r\n\r\n' +
    `--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(text)}\r\n` +
    `--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(html)}\r\n` +
    `--${boundary}--`;
}

const enabled = () => !!(config.smtp.host && config.smtp.from);

async function sendMail({ to, subject, text, html, replyTo, siteName = 'Bespoke Global Escapes' }) {
  const recipients = [].concat(to).filter(Boolean).map(addr);
  if (!recipients.length) return;
  if (!enabled()) {
    console.log(`[email not sent: SMTP not configured] To: ${recipients.join(', ')} | Subject: ${subject}`);
    return;
  }
  const from = addr(config.smtp.from);
  const data = buildMessage({ fromName: siteName, from, to: recipients, replyTo, subject, text, html: html || `<pre>${text}</pre>` });
  try {
    await smtpSend(config.smtp, from, recipients, data);
    console.log(`[email sent] To: ${recipients.join(', ')} | ${subject}`);
  } catch (err) {
    console.error(`[email failed] To: ${recipients.join(', ')} | ${subject} | ${err.message}`);
  }
}

// Fire-and-forget so a slow mail server never delays the page.
const queueMail = (opts) => { setImmediate(() => sendMail(opts)); };

module.exports = { sendMail, queueMail, enabled, smtpSend, buildMessage };
