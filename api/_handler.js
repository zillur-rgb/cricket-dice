// Shared logic for /api/db, kept separate from the MongoDB connection so it can be tested.
//
// Collections:
//   meta          one document {_id:'main'}: rev, timestamps, players (120), teams
//   competitions  one document per season (_id = competition id)
//   matches       one document per match scorecard (_id = match id)
//   stats         one document per player (_id = player id): career, league and cup totals
//
// GET  /api/db?part=core                     → { storage:'mongo', meta, competitions, stats, matchCount }
// GET  /api/db?part=matches&skip=0&limit=300 → { matches }
// POST /api/db  (header x-passcode)          → save changes; body { baseRev, meta, competitions, matches, stats, mode }
//        mode 'save'    normal save, refused if someone else saved in between
//        mode 'replace' wipe everything first (used by `npm run push`)
//        mode 'append'  add more matches during a push

const PAGE_MAX = 400;

function strip(doc) { if (!doc) return doc; const { _id, ...rest } = doc; return rest; }

async function handle(db, req, env) {
  const method = req.method;
  const q = req.query || {};

  if (method === 'GET') {
    if (q.part === 'matches') {
      const skip = Math.max(0, parseInt(q.skip, 10) || 0);
      const limit = Math.min(PAGE_MAX, Math.max(1, parseInt(q.limit, 10) || 300));
      const docs = await db.collection('matches').find({}).sort({ seq: 1 }).skip(skip).limit(limit).toArray();
      return { status: 200, body: { matches: docs.map(strip) } };
    }
    const meta = await db.collection('meta').findOne({ _id: 'main' });
    if (!meta) return { status: 200, body: { storage: 'mongo', empty: true } };
    const competitions = (await db.collection('competitions').find({}).sort({ seq: 1 }).toArray()).map(strip);
    const statsDocs = await db.collection('stats').find({}).toArray();
    const stats = {};
    for (const s of statsDocs) stats[s._id] = strip(s);
    const matchCount = await db.collection('matches').countDocuments({});
    return { status: 200, body: { storage: 'mongo', meta: strip(meta), competitions, stats, matchCount } };
  }

  if (method === 'POST') {
    if (!env.SAVE_PASSCODE) return { status: 500, body: { error: 'SAVE_PASSCODE is not set in Vercel environment variables' } };
    const pass = req.headers['x-passcode'] || '';
    if (pass !== env.SAVE_PASSCODE) return { status: 401, body: { error: 'Wrong passcode' } };

    const b = req.body || {};
    const mode = b.mode || 'save';
    const metaCol = db.collection('meta');
    const current = await metaCol.findOne({ _id: 'main' });
    const currentRev = current ? current.rev || 0 : 0;

    if (mode !== 'replace' && current && b.baseRev !== currentRev) {
      return { status: 409, body: { error: 'conflict', rev: currentRev } };
    }
    if (mode === 'replace') {
      for (const c of ['meta', 'competitions', 'matches', 'stats']) await db.collection(c).deleteMany({});
    }

    const now = new Date().toISOString();
    if (Array.isArray(b.competitions) && b.competitions.length) {
      await db.collection('competitions').bulkWrite(b.competitions.map((c, i) => ({
        replaceOne: { filter: { _id: c.id }, replacement: { _id: c.id, seq: c.seq != null ? c.seq : i, ...c }, upsert: true },
      })));
    }
    if (Array.isArray(b.matches) && b.matches.length) {
      const base = await db.collection('matches').countDocuments({});
      await db.collection('matches').bulkWrite(b.matches.map((m, i) => ({
        replaceOne: { filter: { _id: m.id }, replacement: { _id: m.id, seq: m.seq != null ? m.seq : base + i, ...m }, upsert: true },
      })));
    }
    if (b.stats && typeof b.stats === 'object') {
      const ops = Object.entries(b.stats).map(([pid, s]) => ({ replaceOne: { filter: { _id: pid }, replacement: { _id: pid, ...s }, upsert: true } }));
      if (ops.length) await db.collection('stats').bulkWrite(ops);
    }
    const metaIn = b.meta || {};
    const rev = (mode === 'replace' ? 0 : currentRev) + 1;
    await metaCol.updateOne({ _id: 'main' }, {
      $set: {
        ...metaIn,
        rev,
        updatedAt: now,
        createdAt: (current && current.createdAt) || metaIn.createdAt || now,
      },
    }, { upsert: true });
    return { status: 200, body: { ok: true, rev } };
  }

  return { status: 405, body: { error: 'Method not allowed' } };
}

module.exports = { handle };
