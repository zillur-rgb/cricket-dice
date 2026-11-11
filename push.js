// Upload data/history.json to the online database, REPLACING what is there.
// Use it once to move seasons you played locally to your Vercel site.
//   SAVE_PASSCODE=yourpasscode npm run push -- https://your-site.vercel.app
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const URL_FILE = path.join(__dirname, '.cricket-url');
const FILE = path.join(__dirname, 'data', 'history.json');

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, a => { rl.close(); r(a.trim()); }));
}

(async () => {
  let base = process.argv[2] || process.env.CRICKET_URL || (fs.existsSync(URL_FILE) ? fs.readFileSync(URL_FILE, 'utf8').trim() : '');
  if (!base) { console.error('Usage: npm run push -- https://your-site.vercel.app'); process.exit(1); }
  base = base.replace(/\/+$/, '');
  fs.writeFileSync(URL_FILE, base + '\n');
  if (!fs.existsSync(FILE)) { console.error('No data/history.json to upload.'); process.exit(1); }
  const db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const pass = process.env.SAVE_PASSCODE || await ask('Passcode (SAVE_PASSCODE): ');
  const ok = await ask(`This replaces ALL online history with ${db.matches.length} matches from data/history.json. Type yes to continue: `);
  if (ok.toLowerCase() !== 'yes') { console.log('Cancelled.'); return; }

  const post = async body => {
    const res = await fetch(`${base}/api/db`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-passcode': pass }, body: JSON.stringify(body) });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || res.status);
    return j.rev;
  };
  const meta = { app: db.app, version: db.version, createdAt: db.createdAt, players: db.players, teams: db.teams };
  const matches = db.matches.map((m, i) => ({ ...m, seq: i }));
  const CHUNK = 250;
  let rev = await post({ mode: 'replace', meta, competitions: db.competitions.map((c, i) => ({ ...c, seq: i })), stats: db.stats, matches: matches.slice(0, CHUNK) });
  for (let i = CHUNK; i < matches.length; i += CHUNK) {
    rev = await post({ mode: 'append', baseRev: rev, meta, matches: matches.slice(i, i + CHUNK) });
    process.stdout.write(`\rUploaded ${Math.min(i + CHUNK, matches.length)}/${matches.length} matches`);
  }
  console.log(`\nDone. Online history now has ${matches.length} matches.`);
})().catch(e => { console.error('Push failed:', e.message); process.exit(1); });
