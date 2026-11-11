// Shared logic for /api/db, kept separate from the MongoDB connection so it can be tested.
//
// Every profile has its own game history. Collections:
//   profiles      one document per profile: name, salted PIN hash (the PIN itself is never stored)
//   meta          one document per profile {_id:'meta:<profile>'}: rev, timestamps, players, teams
//   competitions  one document per season   (_id = '<profile>:<competition id>')
//   matches       one document per scorecard (_id = '<profile>:<match id>')
//   stats         one document per player    (_id = '<profile>:<player id>')
//
// GET  /api/db?part=profiles                    → { storage:'mongo', profiles:[{id,name}], legacy }
// GET  /api/db?part=core      (x-profile, x-pin) → { meta, competitions, stats, matchCount } or { empty:true }
// GET  /api/db?part=matches&skip=&limit= (same)  → { matches }
// POST /api/db?action=create-profile  { name, pin, claimLegacy, legacyPasscode }
// POST /api/db?action=login           { profile, pin }
// POST /api/db                (x-profile, x-pin) → save; body { baseRev, meta, competitions, matches, stats, mode }
//        mode 'save' (refused if someone saved in between), 'replace' (wipe this profile first), 'append'
//        deleteCompetitions: [ids] removes those seasons and their matches (cancel a running season)

const crypto = require('crypto');

const PAGE_MAX = 400;
const MAX_PROFILES = 20;
const DATA = ['competitions', 'matches', 'stats'];

function strip(doc) { if (!doc) return doc; const { _id, profile, ...rest } = doc; return rest; }
function hashPin(pin, salt) { return crypto.scryptSync(String(pin), salt, 32).toString('hex'); }
function slug(name) {
  return String(name).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'player';
}
const validPin = pin => /^\d{4,8}$/.test(String(pin || ''));

async function checkPin(db, profileId, pin) {
  if (!profileId || !pin) return null;
  const p = await db.collection('profiles').findOne({ _id: String(profileId) });
  if (!p) return null;
  const given = Buffer.from(hashPin(pin, p.salt), 'hex');
  const stored = Buffer.from(p.pinHash, 'hex');
  return given.length === stored.length && crypto.timingSafeEqual(given, stored) ? p : null;
}

async function wipeProfile(db, prof) {
  for (const c of DATA) await db.collection(c).deleteMany({ profile: prof });
  await db.collection('meta').deleteMany({ _id: 'meta:' + prof });
}

// Move the history saved before profiles existed (documents without a profile) into one profile
async function claimLegacy(db, prof) {
  const legacyMeta = await db.collection('meta').findOne({ _id: 'main' });
  if (!legacyMeta) return 0;
  let moved = 0;
  for (const c of DATA) {
    const docs = await db.collection(c).find({ profile: { $exists: false } }).toArray();
    if (docs.length) {
      await db.collection(c).bulkWrite(docs.map(d => ({
        replaceOne: { filter: { _id: `${prof}:${d._id}` }, replacement: { ...d, _id: `${prof}:${d._id}`, profile: prof }, upsert: true },
      })));
      await db.collection(c).deleteMany({ profile: { $exists: false } });
      if (c === 'matches') moved = docs.length;
    }
  }
  const { _id, ...rest } = legacyMeta;
  await db.collection('meta').updateOne({ _id: 'meta:' + prof }, { $set: { ...rest, rev: 1 } }, { upsert: true });
  await db.collection('meta').deleteMany({ _id: 'main' });
  return moved;
}

async function handle(db, req, env) {
  const method = req.method;
  const q = req.query || {};
  const h = req.headers || {};

  // ---------- profiles ----------
  if (method === 'GET' && q.part === 'profiles') {
    const list = await db.collection('profiles').find({}).sort({ createdAt: 1 }).toArray();
    const legacy = !!(await db.collection('meta').findOne({ _id: 'main' }));
    return { status: 200, body: { storage: 'mongo', profiles: list.map(p => ({ id: p._id, name: p.name })), legacy } };
  }

  if (method === 'POST' && q.action === 'create-profile') {
    const b = req.body || {};
    const name = String(b.name || '').trim().slice(0, 24);
    if (!name) return { status: 400, body: { error: 'Enter a name.' } };
    if (!validPin(b.pin)) return { status: 400, body: { error: 'The PIN must be 4 to 8 digits.' } };
    const col = db.collection('profiles');
    if ((await col.countDocuments({})) >= MAX_PROFILES) return { status: 400, body: { error: `There are already ${MAX_PROFILES} profiles.` } };
    let id = slug(name), n = 2;
    while (await col.findOne({ _id: id })) id = `${slug(name)}-${n++}`;
    const existing = await col.find({}).toArray();
    if (existing.some(p => p.name.toLowerCase() === name.toLowerCase())) return { status: 400, body: { error: 'That name is already taken.' } };
    if (b.claimLegacy && (!env.SAVE_PASSCODE || b.legacyPasscode !== env.SAVE_PASSCODE)) {
      return { status: 401, body: { error: 'The old passcode is not correct, so the existing history was not moved.' } };
    }
    const salt = crypto.randomBytes(16).toString('hex');
    await col.updateOne({ _id: id }, { $set: { name, salt, pinHash: hashPin(b.pin, salt), createdAt: new Date().toISOString() } }, { upsert: true });
    const moved = b.claimLegacy ? await claimLegacy(db, id) : 0;
    return { status: 200, body: { ok: true, profile: { id, name }, moved } };
  }

  if (method === 'POST' && q.action === 'login') {
    const b = req.body || {};
    const p = await checkPin(db, b.profile, b.pin);
    if (!p) return { status: 401, body: { error: 'Wrong PIN.' } };
    return { status: 200, body: { ok: true, profile: { id: p._id, name: p.name } } };
  }

  // ---------- everything below belongs to one profile ----------
  const prof = await checkPin(db, h['x-profile'], h['x-pin']);
  if (!prof) return { status: 401, body: { error: 'Wrong profile or PIN.' } };
  const P = prof._id;

  if (method === 'GET') {
    if (q.part === 'matches') {
      const skip = Math.max(0, parseInt(q.skip, 10) || 0);
      const limit = Math.min(PAGE_MAX, Math.max(1, parseInt(q.limit, 10) || 300));
      const docs = await db.collection('matches').find({ profile: P }).sort({ seq: 1 }).skip(skip).limit(limit).toArray();
      return { status: 200, body: { matches: docs.map(strip) } };
    }
    const meta = await db.collection('meta').findOne({ _id: 'meta:' + P });
    if (!meta) return { status: 200, body: { storage: 'mongo', empty: true, profile: { id: P, name: prof.name } } };
    const competitions = (await db.collection('competitions').find({ profile: P }).sort({ seq: 1 }).toArray()).map(strip);
    const stats = {};
    for (const s of await db.collection('stats').find({ profile: P }).toArray()) stats[s._id.slice(P.length + 1)] = strip(s);
    const matchCount = await db.collection('matches').countDocuments({ profile: P });
    return { status: 200, body: { storage: 'mongo', profile: { id: P, name: prof.name }, meta: strip(meta), competitions, stats, matchCount } };
  }

  if (method === 'POST') {
    const b = req.body || {};
    const mode = b.mode || 'save';
    const metaCol = db.collection('meta');
    const current = await metaCol.findOne({ _id: 'meta:' + P });
    const currentRev = current ? current.rev || 0 : 0;
    if (mode !== 'replace' && current && b.baseRev !== currentRev) {
      return { status: 409, body: { error: 'conflict', rev: currentRev } };
    }
    if (mode === 'replace') await wipeProfile(db, P);
    if (Array.isArray(b.deleteCompetitions)) {
      for (const id of b.deleteCompetitions.map(String)) {
        await db.collection('competitions').deleteMany({ _id: `${P}:${id}` });
        await db.collection('matches').deleteMany({ profile: P, compId: id });
      }
    }

    const now = new Date().toISOString();
    if (Array.isArray(b.competitions) && b.competitions.length) {
      await db.collection('competitions').bulkWrite(b.competitions.map((c, i) => ({
        replaceOne: { filter: { _id: `${P}:${c.id}` }, replacement: { ...c, _id: `${P}:${c.id}`, profile: P, seq: c.seq != null ? c.seq : i }, upsert: true },
      })));
    }
    if (Array.isArray(b.matches) && b.matches.length) {
      const base = await db.collection('matches').countDocuments({ profile: P });
      await db.collection('matches').bulkWrite(b.matches.map((m, i) => ({
        replaceOne: { filter: { _id: `${P}:${m.id}` }, replacement: { ...m, _id: `${P}:${m.id}`, profile: P, seq: m.seq != null ? m.seq : base + i }, upsert: true },
      })));
    }
    if (b.stats && typeof b.stats === 'object') {
      const ops = Object.entries(b.stats).map(([pid, s]) => ({
        replaceOne: { filter: { _id: `${P}:${pid}` }, replacement: { ...s, _id: `${P}:${pid}`, profile: P }, upsert: true },
      }));
      if (ops.length) await db.collection('stats').bulkWrite(ops);
    }
    const rev = (mode === 'replace' ? 0 : currentRev) + 1;
    await metaCol.updateOne({ _id: 'meta:' + P }, {
      $set: { ...(b.meta || {}), rev, updatedAt: now, createdAt: (current && current.createdAt) || (b.meta && b.meta.createdAt) || now },
    }, { upsert: true });
    return { status: 200, body: { ok: true, rev } };
  }

  return { status: 405, body: { error: 'Method not allowed' } };
}

module.exports = { handle, slug };
