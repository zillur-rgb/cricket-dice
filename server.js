// Cricket Dice server (no dependencies): node server.js  →  http://localhost:3000
// Serves the game and saves all league/tournament history to data/history.json
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'history.json');
const BACKUP_FILE = path.join(DATA_DIR, 'history.backup.json');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

fs.mkdirSync(DATA_DIR, { recursive: true });

function readDB() {
  try { return fs.readFileSync(DB_FILE, 'utf8'); } catch { return null; }
}

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json', 'Cache-Control': 'no-cache' });
  res.end(body);
}

function handleApi(req, res) {
  if (req.method === 'GET') {
    const raw = readDB();
    return send(res, 200, raw || 'null');
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 50e6) req.destroy(); });
    req.on('end', () => {
      let db;
      try { db = JSON.parse(body); } catch { return send(res, 400, JSON.stringify({ error: 'Invalid JSON' })); }
      // Refuse to overwrite newer data saved from another device
      const current = readDB();
      const currentRev = current ? (JSON.parse(current).rev || 0) : 0;
      if (current && db.baseRev !== currentRev) {
        return send(res, 409, JSON.stringify({ error: 'conflict', rev: currentRev }));
      }
      delete db.baseRev;
      db.rev = currentRev + 1;
      db.updatedAt = new Date().toISOString();
      const text = JSON.stringify(db, null, 1);
      if (current) fs.writeFileSync(BACKUP_FILE, current);
      const tmp = DB_FILE + '.tmp';
      fs.writeFileSync(tmp, text);
      fs.renameSync(tmp, DB_FILE);
      send(res, 200, JSON.stringify({ ok: true, rev: db.rev }));
    });
    return;
  }
  send(res, 405, JSON.stringify({ error: 'Method not allowed' }));
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/api/db') return handleApi(req, res);
  const file = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream');
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`🏏 Cricket Dice running at http://localhost:${PORT}`);
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  for (const ip of ips) console.log(`   On your phone (same Wi-Fi): http://${ip}:${PORT}`);
  console.log(`   History file: ${DB_FILE}`);
});
