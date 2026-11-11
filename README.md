# Cricket Dice 🏏

A cricket board game where each ball is decided by a **weighted probability table** instead of a flat 1–6 die, so wickets fall at realistic rates. You captain both sides.

## Run it

Needs Node.js 18+ (no `npm install` needed: zero dependencies).

```bash
npm start
```

Open **http://localhost:3000**. The terminal also prints an address like `http://192.168.x.x:3000`: open that on your phone (same Wi-Fi) and it saves to the same file.

## Play anywhere: Vercel + MongoDB Atlas

The same code runs on Vercel. There, history is saved to MongoDB instead of `data/history.json`.

1. **MongoDB Atlas** (free M0 cluster, region Frankfurt): create a database user, allow `0.0.0.0/0` under *Network Access*, and copy the `mongodb+srv://…` connection string.
2. **Vercel**: *Add New → Project*, import this GitHub repo, framework preset **Other**, no build command. Under *Settings → Environment Variables* add:
   - `MONGODB_URI`: the Atlas connection string
   - `SAVE_PASSCODE`: any passcode you choose (needed to save results; anyone with the link can still view)
   - optional `MONGODB_DB` (default `cricket_dice`)
3. Redeploy. The first time you save, the site asks for the passcode and remembers it on that device.

Database collections: `meta` (players, teams), `competitions` (one per season), `matches` (one per scorecard), `stats` (one per player).

### Keep a copy on your computer

```bash
npm run pull -- https://your-site.vercel.app   # online history → data/history.json
npm run push -- https://your-site.vercel.app   # data/history.json → online (replaces it; asks first)
```

The site address is remembered after the first time. The History page also has a *Download history.json* button.

## Competitions

| | Länderliga (league) | Städtepokal (tournament) |
|---|---|---|
| Teams | 16 German states | 24 German cities |
| Players per team | 7 | 5 |
| Overs | 10 (max 2 per bowler) | 5 (1 per bowler) |
| Format | everyone plays everyone once (120 matches), top 4 → semifinals → final | 8 groups of 3 → top 2 → Round of 16 → QF → SF → final |

- 120 players in one shared pool. Each player belongs to one city team and (for 112 of them) one state team. The 8 not in a state squad play only the Städtepokal.
- Every match can be **played** ball by ball or **quick-simmed**. Both count toward stats.
- Group/league ties give 1 point each. A tied knockout is decided on boundary count, then fewer wickets lost, then a bowl-out.

## Your saved history: `data/history.json`

Everything is saved after each match into one file:

- `players`: names, ratings, city and state team
- `competitions`: every season, fixtures, results, and for finished seasons a `summary` with champion, runner-up, final, semifinals, top run scorers and wicket takers
- `matches`: full scorecard of every match
- `stats`: every player's career totals, plus `league` and `cup` splits (all = league + cup)

`data/history.backup.json` holds the version before the last save. To start over, stop the server and delete both files.

## Files

- `public/engine.js`: ball-by-ball match engine
- `public/competition.js`: squads, fixtures, standings, history and stats
- `public/app.js`, `public/style.css`, `public/index.html`: the game UI
- `server.js`: local server, saves `data/history.json`
- `api/db.js`, `api/_handler.js`: Vercel function, saves to MongoDB
- `pull.js`, `push.js`: copy history between MongoDB and `data/history.json`
- `simulate.js`: balance check (`npm run simulate`)
- `test-competitions.js`: simulates full seasons and checks stats add up (`npm test`)
- `build-single.py`: bundles the game into one HTML file for the phone link
