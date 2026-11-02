import http from 'node:http';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { readFile, stat } from 'node:fs/promises';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Transport only. Geometry, presets, editing, import and certificates live in Lean.
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 8000);
const sessions = new Map();
const queue = [];
let alive = true;
const lean = spawn(path.join(ROOT, '.lake/build/bin/kapla'), [], {
  cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'],
});
lean.stderr.on('data', (data) => process.stderr.write(data));
lean.on('error', fail);
lean.on('exit', (code) => fail(new Error(`Lean engine stopped (${code}). Restart the server.`)));
createInterface({ input: lean.stdout }).on('line', (line) => {
  const job = queue.shift();
  if (!job) return fail(new Error('Unexpected engine response.'));
  clearTimeout(job.timeout);
  try { job.resolve(JSON.parse(line)); } catch (error) { job.reject(error); }
});
function fail(error) {
  alive = false;
  for (const job of queue.splice(0)) {
    clearTimeout(job.timeout);
    job.reject(error);
  }
}
function command(data) {
  if (!alive) return Promise.reject(new Error('Lean engine is unavailable. No edit was made.'));
  if (queue.length > 64) return Promise.reject(new Error('Workshop is busy. Try again shortly.'));
  return new Promise((resolve, reject) => {
    const job = { resolve, reject, timeout: setTimeout(() => {
      fail(new Error('Lean engine timed out. Reload the workshop after restarting the server.'));
      lean.kill();
    }, 20000) };
    queue.push(job);
    lean.stdin.write(JSON.stringify(data) + '\n');
  });
}
function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(data));
}
async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error('Construction file is larger than 1 MB.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
function tokenMatches(a, b) {
  const aa = Buffer.from(a || ''), bb = Buffer.from(b || '');
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.md': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    // The private preview proxy supplies identity. A high-entropy per-tab token
    // additionally isolates tabs and the local standalone server.
    const visitor = String(req.headers['x-visitor-id'] || 'local');
    if (url.pathname === '/api/health') {
      return json(res, alive ? 200 : 503, { ok: alive, engine: 'Lean 4.35.0' });
    }
    if (url.pathname === '/api/session' && req.method === 'POST') {
      if (sessions.size >= 1000) return json(res, 429, { ok: false, error: 'Workshop capacity reached.' });
      const id = randomUUID(), token = randomUUID() + randomUUID();
      const result = await command({ cmd: 'init', session: id });
      if (!result.ok) return json(res, 422, result);
      sessions.set(id, { token, visitor, touched: Date.now() });
      return json(res, 200, { ...result, session: id, token });
    }
    if (url.pathname === '/api/command' && req.method === 'POST') {
      const data = await body(req);
      const entry = sessions.get(data.session);
      if (!entry || entry.visitor !== visitor ||
          !tokenMatches(String(req.headers['x-session-token'] || ''), entry.token)) {
        return json(res, 403, { ok: false, error: 'Session expired or belongs to a different visitor. Reload to start a new workshop.' });
      }
      if (data.cmd === 'init' || data.cmd === 'close') {
        return json(res, 400, { ok: false, error: 'Reserved transport command.' });
      }
      entry.touched = Date.now();
      const result = await command(data);
      return json(res, result.ok ? 200 : 422, result);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return json(res, 405, { ok: false, error: 'Method not allowed.' });
    }
    const pathname = decodeURIComponent(url.pathname);
    const file = path.resolve(DIST, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(DIST + path.sep)) return json(res, 403, { ok: false, error: 'Forbidden path.' });
    if (!(await stat(file)).isFile()) return json(res, 404, { ok: false, error: 'Not found.' });
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    json(res, error.code === 'ENOENT' ? 404 : 422, { ok: false, error: error.message });
  }
});
const cleanup = setInterval(() => {
  for (const [id, session] of sessions) {
    if (Date.now() - session.touched > 4 * 60 * 60 * 1000) {
      sessions.delete(id);
      command({ cmd: 'close', session: id }).catch(() => {});
    }
  }
}, 60_000);
cleanup.unref();
server.listen(PORT, '0.0.0.0', () => console.log(`Kapla Atelier: http://localhost:${PORT} (Lean-authoritative)`));
function shutdown() { clearInterval(cleanup); lean.kill(); server.close(); }
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
