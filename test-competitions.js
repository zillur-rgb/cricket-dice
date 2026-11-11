const C = require('./public/competition.js');
const E = require('./public/engine.js');
const db = C.newDB();
// squads
const sizes = db.teams.league.map(t => t.players.length), csz = db.teams.cup.map(t => t.players.length);
console.log('players', db.players.length, 'league squads', [...new Set(sizes)], 'cup squads', [...new Set(csz)], 'reserves (no state team)', db.players.filter(p => !p.state).length);
const pm = C.playerMap(db);
const str = t => Math.round(t.players.reduce((s, id) => s + pm[id].bat + pm[id].bowl, 0) / t.players.length);
console.log('state strength', db.teams.league.map(t => t.short + ':' + str(t)).join(' '));
for (const kind of ['league', 'cup']) {
  for (let season = 0; season < 2; season++) {
    const comp = C.startCompetition(db, kind);
    let g = 0;
    while (comp.status !== 'complete' && g++ < 500) {
      const f = C.pendingFixtures(comp)[0];
      C.recordMatch(db, comp.id, f.id, C.simulateFixture(db, comp, f), 'sim');
    }
    const s = comp.summary;
    console.log(comp.name, 'S' + comp.season, comp.fixtures.length, 'matches | champion', s.champion, '| final:', s.final.result, '| top runs', s.topRuns[0].name, s.topRuns[0].runs, '| top wkts', s.topWkts[0].name, s.topWkts[0].wkts);
  }
}
// consistency: all == league + cup for every player
let bad = 0;
for (const [pid, s] of Object.entries(db.stats)) for (const k of ['mat', 'runs', 'balls', 'f4', 's6', 'wkts', 'ballsBowled'])
  if (s.all[k] !== s.league[k] + s.cup[k]) bad++;
console.log('stat mismatches', bad);
// runs in stats equal runs in scorecards minus extras
const scRuns = db.matches.reduce((t, m) => t + m.innings.reduce((u, I) => u + I.runs - I.extras, 0), 0);
const stRuns = Object.values(db.stats).reduce((t, s) => t + s.all.runs, 0);
console.log('runs check', scRuns, stRuns);
const avgScore = k => { const ms = db.matches.filter(m => m.comp === k); return (ms.reduce((t, m) => t + m.innings[0].runs, 0) / ms.length).toFixed(1) + ' / ' + (ms.reduce((t, m) => t + m.innings[0].wkts, 0) / ms.length).toFixed(1) + 'w'; };
console.log('avg 1st inns league', avgScore('league'), '| cup', avgScore('cup'));
const top = Object.entries(db.stats).sort((a, b) => b[1].all.runs - a[1].all.runs)[0];
console.log('career top', top[1].name, C.fmtStats(top[1].all).runs, 'runs', top[1].all.mat, 'mat');
console.log('file size KB', Math.round(JSON.stringify(db).length / 1024));
