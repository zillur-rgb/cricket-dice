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

21 **city clubs**, one squad of 6 each, all play both competitions in one season. Dresden joined as the 21st club (players: Jordynne Grace, Austin Theorie, El Grande Americano, Johnny Gargano, Tatum Paxley, Ivy Nile).

| | Städteliga (league) | Städtepokal (tournament) |
|---|---|---|
| Teams | 21 city clubs in three divisions of 7 (1. Liga, 2. Liga, 3. Liga) | 21 city clubs |
| Players per team | 6 (same squad in both) | 6 |
| Overs | 5 (4 bowlers, max 2 each) | 6 (max 2 per bowler; batters retire not out after 12 balls) |
| Format | each division plays its own 7 clubs once (6 matches each, one club rests each round; 63 matches); the top of each table is the division champion (1. Liga = Städteliga champion), no semifinals or finals (most points, then net run rate); by the table, the bottom 2 of the 1. and 2. Liga go down and the top 2 of the 2. and 3. Liga go up. Seasons started before this change still had the top 4 → semifinals → final (72 matches) | 7 groups of 3 (21 matches) → the 7 group winners, 7 runners-up and the 2 best third-placed clubs, seeded 1–16 → Round of 16 (1 v 16, 2 v 15 …, no rematch from the same group) → quarterfinals → semifinals → final (36 matches) |

- **Changeover to 21 clubs:** the last season with divisions of 6 (18 clubs; 20 in the Städtepokal, in 5 groups of 4 and a second round) is finished as it is. In that season only the bottom club of the 1. Liga goes down and nobody goes down from the 2. Liga; the top 2 of the 2. and 3. Liga go up as usual. The 3. Liga is then filled up with the 2 former cup-only clubs and Dresden. Dresden goes into the draft like every club (keeps its 2 best, the rest are drafted).
- **One season:** the home page's *Next up* card alternates between the two competitions so they finish together. When both are finished, one draft sets the squads for the next season and both start together.
- **Club honours:** a club's card shows both competitions, its season history, its honours (Städteliga and division titles, Städtepokal wins, promotions, relegations and **Doubles**: division title + Städtepokal in the same season) and its last 5 seasons: Städteliga division and place, Städtepokal stage reached and final place.
- **Club ranking:** Elo-style points. Every club starts at 1000; after each Städteliga or Städtepokal match the winner takes points from the loser (K = 30, semifinal 36, final 40; × up to 1.5 for a big win: runs margin / 30 or balls left / 24; more points for beating a stronger club). Points carry over between seasons. Shown on the home page (top 5 / all 20), next to the club name in its card and in the hover / long-press quick look, with ▲/▼ for places moved since the start of the current round. The ranking list also shows the points each club won or lost in its latest match (Last).
- **Award ceremony:** after the last match of a season (usually the Städtepokal final) a full-screen ceremony opens before the draft, revealing one award per click (with confetti for the big ones). For the 1. Liga, 2. Liga, 3. Liga and Städtepokal: champion, runner-up, player of the competition (Player of the Match points added up), best batter (most runs, strike rate breaks ties) and best bowler (most wickets, economy breaks ties). Then: promoted and relegated clubs, moments of the season (highest score, best bowling, fastest fifty or thirty, closest finish), Golden Bat and Golden Ball (all competitions together), Club of the Season (biggest climb in the club ranking over the season), the Double (division title + Städtepokal), the Team of the Season (2 batters, 2 all-rounders, 2 bowlers by season points; the best is captain) and finally the Player of the Season. Award winners get badges on their player card; History has a Hall of Fame with every season and a button to watch each ceremony again.
- **Over summary:** at the end of every over (on screen and on top of the bowler picker): runs, wickets, the balls of the over, the score and the bowler's figures.
- **Season story:** a news feed on the home page. Every round (one round of the Städteliga or the Städtepokal) adds its best 5 headlines: titles, finals and semifinals, records that fell, the best innings and bowling, the closest finish and the biggest win, unbeaten runs and losing streaks, collapses, players on a hot streak 🔥 (last 3 innings 15+ each and 70+ together; bowlers: a wicket in each of the last 3 and 6+ together) or out of touch ❄️, and big movers in the club ranking. The same story (e.g. a club's unbeaten run) only appears in its newest version. The newest 5 headlines are shown (normally all from the latest round), each with the round it came from. Tap a headline for the scorecard, player or club.
- **Records and trophy cabinet:** the History page lists all-time records (highest/lowest total, highest chase, biggest wins, highest score, highest partnership, fastest thirty and fifty, most sixes in an innings, best bowling, and career runs, wickets, sixes and Player of the Match awards) and a trophy cabinet of every club's titles. A pop-up announces any record that falls. The engine now notes the ball on which a batter reaches 30 and 50; older matches use the balls faced in the whole innings.
- **Achievement banners:** a banner with the name and numbers slides in for every thirty and fifty, hat-trick and 3+ wicket haul in a match you play, the Player of the Match when it ends, and the best performances (fifties, hat-tricks, 3+ wicket hauls; up to 3) after simulated matches. Tap it to open the player.
- **Team of the Round:** when every match of a round is finished (a Städteliga round across all three divisions, or a Städtepokal matchday, Round of 16, quarterfinal, semifinal or final), the 2 best batters, 2 best all-rounders and 2 best bowlers by Player of the Match points make the Team of the Round. It gets a pop-up when the round ends (close it with Close), a panel on the home page, its own tab in each competition, and a count on the player card.
- **Derbies:** neighbouring clubs (e.g. Hamburg v Bremen, the Nordderby; Leipzig v Dresden, the Sachsenderby) get a 🔥 derby tag on fixtures, the next-up card, the scoreboard and the scorecard. Next matches show the clubs' head-to-head record. Derbies are only labels: they don't change how the match is played.
- **Match reports:** every Städteliga and Städtepokal scorecard (and the result screen) has a short report: a headline and a few lines on the top scorers, best bowling, the key partnership and, in derbies, the head-to-head.
- **Partnerships:** the engine records every partnership (runs, balls and the two batters, the last one unbroken \*). They're listed under each innings and count for the "Highest partnership" record.
- **Head-to-head:** the engine records runs, balls and dismissals for each batter v bowler. The player card shows the opponents they've faced most, with bat and ball. Only matches played since this update count.
- **Player of the Season:** the best player across both competitions, plus the best of each division and of the Städtepokal (home page between seasons, and in History).
- **The old Länderliga** (16 states in two divisions, 7 players each) stays in History. A running Länderliga season is finished with the state squads; the switch to the city clubs happens at the next draft. Players keep their Länderliga stats as a separate "Länderliga (old)" row.

- 120 players in one shared pool. Each player belongs to one city team and (for 112 of them) one state team. The 8 not in a state squad play only the Städtepokal.
- **Cancel a season:** a running season (for example one in an old format) can be cancelled from its page; its matches are deleted and stats recalculated. Finished seasons are never touched.
- **The draft:** before every new season, each club keeps its 2 best performers of last season by Player of the Series points (Städteliga and Städtepokal together). Everyone else goes into a draft. Each player gets a temporary draft rating: their overall rating (average of bat and bowl) moved up 🔥 or down ❄️ by up to 15 for how they played last season (fewer matches count less). The team with the weakest real squad picks first, snake order; every team takes the best player left but makes sure it ends up with 2 batters and 3 bowlers. The draft is revealed in stages: first every club's 1st keeper, then its 2nd keeper, then one full round of picks at a time (Pick next round, or Skip to end). Every player shows last season's numbers for the Städteliga and the Städtepokal separately ("did not play" if they missed one). The draft is saved with the season (Draft tab). Draft ratings only count for the draft: matches always use the normal ratings. The same finished season always gives the same draft. Each season remembers its squads, so old seasons and scorecards stay correct.
- **Leaderboards** show each player's team (in that season, or their current team for all-time lists).
- Retired batters come back in (earliest first) only when everyone else is out or retired, and then bat with no limit.
- **Openers don't bowl:** in both competitions the two best batters open and never bowl. The other 4 share the overs (max 2 each, never two in a row), and a bowler's second over is bowled tired: −30 bowling rating for that over (median first innings: Städteliga about 55, Städtepokal about 66).
- **Getting set:** a batter is set after 25 balls (less likely out, more boundaries); openers are set after 12 balls. (The old nervous first 2 balls for new batters was removed because it caused too many collapses.)
- **What's at stake:** under each Städteliga table, the race for the title (or for the semifinals in seasons that still have them) and the relegation fight: what each club needs, and who is safe, in danger or down.
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
