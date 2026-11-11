// Copy the online history (MongoDB, via your Vercel site) into data/history.json
//   npm run pull -- https://your-site.vercel.app
// The address is remembered in .cricket-url, so next time just: npm run pull
const fs = require('fs');
const path = require('path');

const URL_FILE = path.join(__dirname, '.cricket-url');
const DATA_DIR = path.join(__dirname, 'data');
const OUT = path.join(DATA_DIR, 'history.json');

function siteUrl() {
  let u = process.argv[2] || process.env.CRICKET_URL;
  if (!u && fs.existsSync(URL_FILE)) u = fs.readFileSync(URL_FILE, 'utf8').trim();
  if (!u) { console.error('Usage: npm run pull -- https://your-site.vercel.app'); process.exit(1); }
  u = u.replace(/\/+$/, '');
  fs.writeFileSync(URL_FILE, u + '\n');
  return u;
}

(async () => {
  const base = siteUrl();
  const core = await (await fetch(`${base}/api/db?part=core`)).json();
  if (core.error) throw new Error(core.error);
  if (core.empty) { console.log('The online database is empty. Nothing to pull.'); return; }
  const matches = [];
  while (matches.length < core.matchCount) {
    const j = await (await fetch(`${base}/api/db?part=matches&skip=${matches.length}&limit=300`)).json();
    if (!j.matches || !j.matches.length) break;
    matches.push(...j.matches);
    process.stdout.write(`\rDownloading matches ${matches.length}/${core.matchCount}`);
  }
  const db = { ...core.meta, competitions: core.competitions, matches, stats: core.stats };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(OUT)) fs.copyFileSync(OUT, path.join(DATA_DIR, 'history.backup.json'));
  fs.writeFileSync(OUT, JSON.stringify(db, null, 1));
  console.log(`\nSaved ${matches.length} matches and ${db.competitions.length} seasons to ${OUT}`);
})().catch(e => { console.error('Pull failed:', e.message); process.exit(1); });
