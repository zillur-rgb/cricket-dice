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
   - optional `SAVE_PASSCODE`: only needed to move history saved before profiles existed into a profile
   - optional `MONGODB_DB` (default `cricket_dice`)
3. Redeploy and open the site.

### Profiles

The first screen asks **Who's playing?** Each profile has a name and a 4–8 digit PIN, and its own seasons, history and player stats. Devices remember the last profile; **Switch** in the top bar changes it. PINs are stored only as salted hashes. Up to 20 profiles.

Database collections: `profiles`, `meta`, `competitions`, `matches`, `stats`. Every document except profiles has a `profile` field, and its `_id` starts with the profile id (for example `zillur:cup-s1-m4`).

### Playing offline

Every save is first stored on the device (IndexedDB), then sent online. Without internet the game carries on: the home page shows *Offline · N matches saved on this device*, and the site still opens (a small service worker, `public/sw.js`, keeps the app's files). When the connection comes back the results upload by themselves (also every 30 seconds, or with **Sync now**). If another device saved in the meantime and nothing clashes, both are combined. If both devices played different matches (or the same fixture differently), the app asks which version to keep.

### Keep a copy on your computer

```bash
npm run pull -- https://your-site.vercel.app   # one profile's online history → data/history.json
npm run push -- https://your-site.vercel.app   # data/history.json → one profile online (replaces it; asks first)
```

Both ask which profile and its PIN. The site address is remembered after the first time. The History page also has a *Download history.json* button.

## Competitions

20 **city clubs**, one squad of 6 each, play both competitions in one season. 18 clubs play the Städteliga, all 20 the Städtepokal (the 2 clubs that finished lowest in the last Städtepokal before the switch play only the cup).

| | Städteliga (league) | Städtepokal (tournament) |
|---|---|---|
| Teams | 18 city clubs in three divisions of 6 (1. Liga, 2. Liga, 3. Liga) | 20 city clubs |
| Players per team | 6 (same squad in both) | 6 |
| Overs | 5 (4 bowlers, max 2 each) | 6 (max 2 per bowler; batters retire not out after 12 balls) |
| Format | each division plays its own 6 clubs once (45 matches); in each division the top 4 → semifinals → final (1. Liga final = Städteliga champion, 2./3. Liga finals = division champions); by the table, the bottom 2 of the 1. and 2. Liga go down and the top 2 of the 2. and 3. Liga go up (54 matches) | 5 groups of 4 → top 2 → second round, 2 groups of 5 → top 2 → semifinals → final (53 matches) |

- **One season:** the home page's *Next up* card alternates between the two competitions so they finish together. When both are finished, one draft sets the squads for the next season and both start together.
- **Club honours:** a club's card shows both competitions, its season history, and its honours: Städteliga and division titles, Städtepokal wins, promotions, relegations and **Doubles** (division title + Städtepokal in the same season).
- **Player of the Season:** the best player across both competitions, plus the best of each division and of the Städtepokal (home page between seasons, and in History).
- **The old Länderliga** (16 states in two divisions, 7 players each) stays in History. A running Länderliga season is finished with the state squads; the switch to the city clubs happens at the next draft. Players keep their Länderliga stats as a separate "Länderliga (old)" row.

- 120 players in one shared pool. Each player belongs to one city team and (for 112 of them) one state team. The 8 not in a state squad play only the Städtepokal.
- **Cancel a season:** a running season (for example one in an old format) can be cancelled from its page; its matches are deleted and stats recalculated. Finished seasons are never touched.
- **The draft:** before every new season, each club keeps its 2 best performers of last season by Player of the Series points (Städteliga and Städtepokal together). Everyone else goes into a draft. Each player gets a temporary draft rating: their overall rating (average of bat and bowl) moved up 🔥 or down ❄️ by up to 15 for how they played last season (fewer matches count less). The team with the weakest real squad picks first, snake order; every team takes the best player left but makes sure it ends up with 2 batters and 3 bowlers. The draft is watched pick by pick (Next pick, Auto, Skip to end) and saved with the season (Draft tab). Draft ratings only count for the draft: matches always use the normal ratings. The same finished season always gives the same draft. Each season remembers its squads, so old seasons and scorecards stay correct.
- **Leaderboards** show each player's team (in that season, or their current team for all-time lists).
- Retired batters come back in (earliest first) only when everyone else is out or retired, and then bat with no limit.
- **Openers don't bowl:** in both competitions the two best batters open and never bowl. The other 4 share the overs (max 2 each, never two in a row), and a bowler's second over is bowled tired: −30 bowling rating for that over (median first innings: Städteliga about 51, Städtepokal about 62).
- **Form 🔥 ❄️:** each player's last 5 matches are compared with their own career average: batting by runs per innings (3 runs = 1 point), bowling by (20 × wickets − runs) per over (5 = 1 point). That gives up to ±4 rating points for the next competition match. 🔥 from +2, ❄️ from −2. Nothing permanent.
- **Last man stands:** in both competitions, when everyone else is out the last batter bats on alone and always keeps the strike. The innings is over when every batter is out (7 wickets in the league, 6 in the cup). Not used in Super Overs or friendly matches.
- **Toss:** the toss winner decides automatically from the pitch and its squad (green top with 2+ seamers: bowl; dusty turner: bat; flat road: chase; good pitch: bat with the stronger batting, bowl with the stronger attack, otherwise chase). The reason is shown and the match starts after 3 seconds.
- **Automatic plans:** in competition matches the computer picks shot and bowling plan from the situation (overs, wickets, required rate). When the chasers need more than 10 an over, the bowlers go fully tight only half the time, so chases are about 50/50.
- Older histories are upgraded automatically: Bonn, Essen, Augsburg and Karlsruhe left the Städtepokal and their players joined other cities. Finished seasons and a season already in progress keep the old format.
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
- `public/sw.js`: keeps the app's files so it opens offline
- `server.js`: local server, saves `data/history.json`
- `api/db.js`, `api/_handler.js`: Vercel function, saves to MongoDB
- `pull.js`, `push.js`: copy history between MongoDB and `data/history.json`
- `simulate.js`: balance check (`npm run simulate`)
- `test-competitions.js`: simulates full seasons and checks stats add up (`npm test`)
- `build-single.py`: bundles the game into one HTML file for the phone link
