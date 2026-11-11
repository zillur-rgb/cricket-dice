// Vercel serverless function: game history in MongoDB Atlas.
// Needs two environment variables in Vercel: MONGODB_URI and SAVE_PASSCODE (optional: MONGODB_DB).
const { MongoClient } = require('mongodb');
const { handle } = require('./_handler');

// Reuse one connection across requests while the function stays warm
let clientPromise = null;
function getDb() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set in Vercel environment variables');
  if (!clientPromise) {
    clientPromise = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5 }).connect()
      .catch(err => { clientPromise = null; throw err; });
  }
  return clientPromise.then(c => c.db(process.env.MONGODB_DB || 'cricket_dice'));
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const db = await getDb();
    const out = await handle(db, req, process.env);
    res.status(out.status).json(out.body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};
