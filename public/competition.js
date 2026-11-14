/* Cricket Dice — competitions, squads, history and career stats.
 * Pure logic (no DOM). Works in the browser (window.CricketComp) and Node.
 */
(function (root) {
  'use strict';
  const E = root.CricketEngine || (typeof require !== 'undefined' ? require('./engine.js') : null);

  // ---------------- Player names (120) ----------------
  const GIVEN_NAMES = [
    'Alexa Bliss', 'Aliyah', 'Asuka', 'Raquel', 'Iyo Sky', 'Dakota Kai', 'Doudrop', 'Nikki ASH', 'Natalya', 'Sonya Devil',
    'Liv Morgan', 'Bianca Belair', 'Rhea Ripley', 'Becky Lynch', 'Lana', 'Bayley', 'Sasha Banks', 'Charlotte', 'Nia Jax', 'Ronda Rousey',
    'Naomi', 'Carmella', 'Sonakshi Sinha', 'Deepika Padukone', 'Sonam Kapoor', 'Alia Bhatt', 'Bhumi Pednekar', 'Sara Ali Khan', 'Hina Khan', 'Urvashi Rautela',
    'Kangana Ranaut', 'Esha Gupta', 'Janhvi Kapoor', 'Sakshi Malik', 'Huma Qureshi', 'Ananya Pandey', 'Disha Patani', 'Neha Sharma', 'Tamanna Bhatia', 'Amyra Dastur',
    'Shraddha Das', 'Shraddha Kapoor', 'Zarine Khan', 'Sonalli Seygal', 'Anushka Sharma', 'Kriti Shannon', 'Nushrat Barucha', 'Jacqueline Fernandez', 'Nargis Fakhri', 'Tapsee Pannu',
    'Alba Fyre', 'Xia Li', 'Lacey Evans', 'Shayna Baszler', 'Shotzi', 'Nikkita Lyons', 'Toni Storm', 'Jamie Heyter', 'Saray', 'Mandy Rose',
    'Gigi Dollin', 'Katana Chance', 'Mouni Roy', 'Nusrat Faria', 'Pori Moni', 'Sabila Nur', 'Xefer', 'Nazifa Tushi',
  ];
  const WRESTLERS = [
    // WWE & NXT
    'Roman Reigns', 'Cody Rhodes', 'Seth Rollins', 'CM Punk', 'Gunther', 'Drew McIntyre', 'Jey Uso', 'Jimmy Uso', 'Solo Sikoa', 'Jacob Fatu',
    'Bron Breakker', 'Bronson Reed', 'LA Knight', 'Sami Zayn', 'Randy Orton', 'Dominik Mysterio', 'Rey Mysterio', 'Finn Balor', 'Damian Priest', 'Logan Paul',
    'Carmelo Hayes', 'Penta', 'Sheamus', 'Rusev', 'Oba Femi', "Je'Von Evans", 'Ethan Page', 'Joe Hendry', 'Ricky Saints', 'Tavion Heights',
    'Myles Borne', 'Christian Cage',
    // AEW
    'Kenny Omega', 'Will Ospreay', 'MJF', 'Jon Moxley', 'Hangman Adam Page', 'Swerve Strickland', 'Darby Allin', 'Orange Cassidy', 'Kazuchika Okada', 'Konosuke Takeshita',
    'Kyle Fletcher', 'Ricochet', 'Claudio Castagnoli', 'Samoa Joe', 'Adam Cole', 'Jay White', 'Mark Briscoe', 'Brody King', 'Mike Bailey', 'Kevin Knight',
  ];

  // ---------------- Places ----------------
  const STATES = [
    { id: 'bw', name: 'Baden-Württemberg', short: 'BW' },
    { id: 'by', name: 'Bayern', short: 'BAY' },
    { id: 'be', name: 'Berlin', short: 'BER' },
    { id: 'bb', name: 'Brandenburg', short: 'BRB' },
    { id: 'hb', name: 'Bremen', short: 'BRE' },
    { id: 'hh', name: 'Hamburg', short: 'HAM' },
    { id: 'he', name: 'Hessen', short: 'HES' },
    { id: 'mv', name: 'Mecklenburg-Vorpommern', short: 'MV' },
    { id: 'ni', name: 'Niedersachsen', short: 'NDS' },
    { id: 'nw', name: 'Nordrhein-Westfalen', short: 'NRW' },
    { id: 'rp', name: 'Rheinland-Pfalz', short: 'RLP' },
    { id: 'sl', name: 'Saarland', short: 'SAA' },
    { id: 'sn', name: 'Sachsen', short: 'SAC' },
    { id: 'st', name: 'Sachsen-Anhalt', short: 'SAN' },
    { id: 'sh', name: 'Schleswig-Holstein', short: 'SH' },
    { id: 'th', name: 'Thüringen', short: 'THÜ' },
  ];
  const CITIES = [
    { id: 'stuttgart', name: 'Stuttgart', short: 'STR', state: 'bw' },
    { id: 'mannheim', name: 'Mannheim', short: 'MAN', state: 'bw' },
    { id: 'karlsruhe', name: 'Karlsruhe', short: 'KAR', state: 'bw' },
    { id: 'muenchen', name: 'München', short: 'MUC', state: 'by' },
    { id: 'nuernberg', name: 'Nürnberg', short: 'NUE', state: 'by' },
    { id: 'augsburg', name: 'Augsburg', short: 'AUG', state: 'by' },
    { id: 'berlin', name: 'Berlin', short: 'BER', state: 'be' },
    { id: 'potsdam', name: 'Potsdam', short: 'POT', state: 'bb' },
    { id: 'bremen', name: 'Bremen', short: 'BRE', state: 'hb' },
    { id: 'hamburg', name: 'Hamburg', short: 'HAM', state: 'hh' },
    { id: 'frankfurt', name: 'Frankfurt', short: 'FRA', state: 'he' },
    { id: 'rostock', name: 'Rostock', short: 'ROS', state: 'mv' },
    { id: 'hannover', name: 'Hannover', short: 'HAN', state: 'ni' },
    { id: 'koeln', name: 'Köln', short: 'KÖL', state: 'nw' },
    { id: 'duesseldorf', name: 'Düsseldorf', short: 'DÜS', state: 'nw' },
    { id: 'dortmund', name: 'Dortmund', short: 'DOR', state: 'nw' },
    { id: 'essen', name: 'Essen', short: 'ESS', state: 'nw' },
    { id: 'bonn', name: 'Bonn', short: 'BON', state: 'nw' },
    { id: 'mainz', name: 'Mainz', short: 'MAI', state: 'rp' },
    { id: 'saarbruecken', name: 'Saarbrücken', short: 'SAA', state: 'sl' },
    { id: 'leipzig', name: 'Leipzig', short: 'LEI', state: 'sn' },
    { id: 'magdeburg', name: 'Magdeburg', short: 'MAG', state: 'st' },
    { id: 'kiel', name: 'Kiel', short: 'KIE', state: 'sh' },
    { id: 'erfurt', name: 'Erfurt', short: 'ERF', state: 'th' },
  ];

  // Länderliga (16 states) is the old league: its seasons stay in the history, no new ones start.
  // Städteliga + Städtepokal are played by the same city clubs (one squad of 6 for both).
  const COMPS = {
    league: { name: 'Länderliga', overs: 5, maxOversPerBowler: 1, squad: 7, kind: 'league', format: 'div', legacy: true },
    liga: { name: 'Städteliga', overs: 5, maxOversPerBowler: 2, squad: 6, kind: 'liga', format: 'd3', teams: 'cup', divs: 3, divSize: 6 },
    cup: { name: 'Städtepokal', overs: 6, maxOversPerBowler: 1, maxBallsPerBatter: 12, squad: 6, kind: 'cup', format: 'v2' },
  };
  const LIGA_CLUBS = 18;   // the other 2 clubs play only the Städtepokal
  const STAGE_LABEL = { league: 'League', group: 'Group stage', R2: 'Second round', R16: 'Round of 16', QF: 'Quarterfinal', SF: 'Semifinal', F: 'Final',
    SF2: '2. Liga semifinal', F2: '2. Liga final', PO: 'Play-off', playoffs: 'Playoffs' };
  // Städtepokal v2: 20 cities × 6 players. These four left the competition; their players moved.
  const RETIRED_CITIES = ['bonn', 'essen', 'augsburg', 'karlsruhe'];

  function color(i, n) { return `hsl(${Math.round((i * 360) / n + 15) % 360} 62% 58%)`; }

  // ---------------- Seeded helpers ----------------
  function rng(seed) { return E.mulberry32(seed); }
  function shuffle(arr, r) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const between = (r, a, b) => Math.round(a + r() * (b - a));

  // ---------------- Build the world ----------------
  function buildWorld(seed) {
    seed = seed || 20261111;
    const r = rng(seed);
    const names = [...new Set([...GIVEN_NAMES, ...WRESTLERS])];
    if (names.length !== 120) throw new Error('Need 120 unique names, have ' + names.length);
    const pool = shuffle(names, r);

    // 24 cities × 5 players, each city: 2 batters, 1 all-rounder, 2 bowlers
    const players = [];
    CITIES.forEach((c, ci) => {
      const roles = shuffle(['bat', 'bat', 'ar', 'bowl', 'bowl'], r);
      roles.forEach((role, k) => {
        const name = pool[ci * 5 + k];
        let bat, bowl;
        if (role === 'bat') { bat = between(r, 70, 90); bowl = between(r, 38, 58); }
        else if (role === 'ar') { bat = between(r, 60, 76); bowl = between(r, 60, 76); }
        else { bat = between(r, 22, 46); bowl = between(r, 70, 90); }
        players.push({
          id: 'p' + String(players.length + 1).padStart(3, '0'), name, role, bat, bowl,
          type: r() < 0.55 ? 'pace' : 'spin', city: c.id, state: null,
        });
      });
    });

    // State squads of 7: home players first (spread across strength), shortfall filled by draft
    const ovr = p => p.bat + p.bowl;
    const leftovers = [];
    const squads = {};
    for (const s of STATES) {
      const home = players.filter(p => CITIES.find(c => c.id === p.city).state === s.id).sort((a, b) => ovr(b) - ovr(a));
      if (home.length <= 7) { squads[s.id] = home; continue; }
      // pick 7 evenly spread through the strength list so big states aren't stacked
      const pick = [];
      for (let k = 0; k < 7; k++) pick.push(home[Math.round(k * (home.length - 1) / 6)]);
      squads[s.id] = pick;
      leftovers.push(...home.filter(p => !pick.includes(p)));
    }
    leftovers.sort((a, b) => ovr(b) - ovr(a));
    // snake draft: weakest short squad picks first
    let short = STATES.filter(s => squads[s.id].length < 7);
    let dir = 1;
    while (short.length) {
      short.sort((a, b) => squads[a.id].reduce((t, p) => t + ovr(p), 0) - squads[b.id].reduce((t, p) => t + ovr(p), 0));
      if (dir < 0) short.reverse();
      for (const s of short) {
        // prefer the role the squad lacks
        const need = squads[s.id].filter(p => p.role === 'bowl').length < 2 ? 'bowl' : squads[s.id].filter(p => p.role === 'bat').length < 3 ? 'bat' : null;
        let idx = need ? leftovers.findIndex(p => p.role === need) : 0;
        if (idx < 0) idx = 0;
        squads[s.id].push(leftovers.splice(idx, 1)[0]);
      }
      dir = -dir;
      short = STATES.filter(s => squads[s.id].length < 7);
    }
    for (const s of STATES) for (const p of squads[s.id]) p.state = s.id;

    const leagueTeams = STATES.map((s, i) => ({ id: s.id, name: s.name, short: s.short, color: color(i, 16), players: squads[s.id].map(p => p.id) }));
    const cupTeams = CITIES.map((c, i) => ({ id: c.id, name: c.name, short: c.short, color: color(i * 7, 24), state: c.state, players: players.filter(p => p.city === c.id).map(p => p.id) }));
    return { seed, players, teams: { league: leagueTeams, cup: cupTeams } };
  }

  function newDB() {
    const world = buildWorld();
    const now = new Date().toISOString();
    const db = { app: 'Cricket Dice', version: 1, rev: 0, createdAt: now, updatedAt: now, players: world.players, teams: world.teams, competitions: [], matches: [], stats: {} };
    migrate(db);
    return db;
  }

  // Bring an older history up to date. Returns true if anything changed (so it should be saved).
  //   cupVersion 2: Städtepokal goes from 24 cities × 5 players to 20 cities × 6 players.
  //   Players, ratings and Länderliga squads stay exactly the same.
  function migrate(db) {
    if ((db.cupVersion || 1) >= 2) return false;
    const pm = playerMap(db);
    const old = db.teams.cup;
    db.teams.cupV1 = JSON.parse(JSON.stringify(old));          // kept for older seasons and scorecards
    const active = old.filter(t => !RETIRED_CITIES.includes(t.id)).map(t => ({ ...t, players: t.players.slice() }));
    const ovr = pid => pm[pid].bat + pm[pid].bowl;
    const strength = t => t.players.reduce((s, pid) => s + ovr(pid), 0);
    let moving = old.filter(t => RETIRED_CITIES.includes(t.id)).flatMap(t => t.players.map(pid => ({ pid, state: t.state })));
    moving.sort((a, b) => ovr(b.pid) - ovr(a.pid));
    // 1) a city in the same state takes one player each
    for (const t of active) {
      const i = moving.findIndex(m => m.state === t.state);
      if (i >= 0 && RETIRED_CITIES.some(id => (old.find(o => o.id === id) || {}).state === t.state)) t.players.push(moving.splice(i, 1)[0].pid);
    }
    // 2) the rest go to the weakest cities that still have 5
    for (const m of moving) {
      const t = active.filter(x => x.players.length < 6).sort((a, b) => strength(a) - strength(b))[0];
      t.players.push(m.pid);
    }
    for (const t of active) for (const pid of t.players) pm[pid].city = t.id;
    db.teams.cup = active;
    db.cupVersion = 2;
    return true;
  }

  // A Städtepokal season started in the old format with no finished matches is simply
  // started again in the new format (same season number, nothing is lost).
  function refreshEmptyOldSeason(db) {
    let changed = false;
    for (const kind of ['cup', 'league']) {
      const comp = db.competitions.find(c => c.kind === kind && c.status !== 'complete');
      if (!comp || comp.format === COMPS[kind].format || comp.fixtures.some(f => f.result)) continue;
      db.competitions = db.competitions.filter(c => c !== comp);
      startCompetition(db, kind);
      changed = true;
    }
    return changed;
  }

  // A season that is still running in an old format can be cancelled: the season and its
  // matches are deleted and the player stats are recalculated without them.
  function cancelSeason(db, compId) {
    const comp = db.competitions.find(c => c.id === compId);
    if (!comp || comp.status === 'complete') return null;
    const removed = db.matches.filter(m => m.compId === compId).map(m => m.id);
    db.competitions = db.competitions.filter(c => c !== comp);
    db.matches = db.matches.filter(m => m.compId !== compId);
    db.stats = computeStats(db);
    return { compId, removed };
  }

  // ---------------- Länderliga divisions ----------------
  // Two divisions of 8. First season: the top 8 of a finished old-format Länderliga, or else the
  // 8 strongest squads, start in the 1. Liga. After that: bottom 2 down, top 2 up.
  function divisionsFor(db) {
    const done = db.competitions.filter(c => c.kind === 'league' && c.status === 'complete');
    const last = done[done.length - 1];
    if (last && last.format === 'div') {
      const d1 = divTable(db, last, 1).map(r => r.id), d2 = divTable(db, last, 2).map(r => r.id);
      const mv = divMoves(db, last);
      return { 1: d1.filter(x => !mv.down.includes(x)).concat(mv.up), 2: d2.filter(x => !mv.up.includes(x)).concat(mv.down), from: last.season };
    }
    let order;
    if (last) order = leagueTable(db, last).map(r => r.id);
    else {
      const pm = playerMap(db);
      const str = t => t.players.reduce((s, pid) => s + pm[pid].bat + pm[pid].bowl, 0) / t.players.length;
      order = db.teams.league.slice().sort((a, b) => str(b) - str(a)).map(t => t.id);
    }
    return { 1: order.slice(0, 8), 2: order.slice(8, 16), from: null, seededBy: last ? 'table' : 'strength' };
  }

  // Who goes up and down at the end of a Bundesliga season.
  //   With play-offs: 1. Liga 7th + 8th + loser of 5th v 6th go down; 2. Liga 1st + 2nd + winner of 3rd v 4th go up.
  //   Older seasons: bottom 2 down, top 2 up.
  function divMoves(db, comp) {
    const d1 = divTable(db, comp, 1).map(r => r.id), d2 = divTable(db, comp, 2).map(r => r.id);
    if (!comp.playoffs) return { up: d2.slice(0, 2), down: d1.slice(6) };
    if (comp.playoffs === 2) {
      // Bundesliga style: 1. Liga 6th v 2. Liga 3rd, the winner plays in the 1. Liga next season
      const x = comp.fixtures.find(f => f.stage === 'PO' && f.po === 'x' && f.result);
      const climbs = x && winnerOf(x) === x.away;   // away = the 2. Liga team
      return { up: d2.slice(0, 2).concat(climbs ? [x.away] : []), down: d1.slice(6).concat(climbs ? [x.home] : []) };
    }
    const rel = comp.fixtures.find(f => f.stage === 'PO' && f.po === 'rel' && f.result);
    const pro = comp.fixtures.find(f => f.stage === 'PO' && f.po === 'pro' && f.result);
    return {
      up: d2.slice(0, 2).concat(pro ? [winnerOf(pro)] : []),
      down: d1.slice(6).concat(rel ? [loserOf(rel)] : []),
    };
  }

  // The running season switches to the current play-off format (2. Liga semifinals and final,
  // Bundesliga-style play-off 1. Liga 6th v 2. Liga 3rd). Returns true if anything changed.
  //   playoffs: true = this morning's version (5th v 6th, 3rd v 4th), 2 = Bundesliga style
  function upgradeLeaguePlayoffs(db) {
    let changed = false;
    for (const comp of db.competitions) {
      if (comp.kind !== 'league' || comp.format !== 'div' || comp.status === 'complete' || comp.playoffs === 2) continue;
      if (comp.playoffs === true) {
        // an old play-off already played: this season keeps the old rule
        if (comp.fixtures.some(f => f.stage === 'PO' && f.result)) continue;
        comp.fixtures = comp.fixtures.filter(f => f.stage !== 'PO');
        comp.playoffs = 2; changed = true;
        if (comp.stage !== 'league') { addCrossPlayoff(db, comp); advanceStages(db, comp); }
        continue;
      }
      comp.playoffs = 2; changed = true;
      if (comp.stage !== 'league') {          // league stage already over: add the new matches now
        addDivPlayoffs(db, comp);
        comp.stage = 'playoffs';
        advanceStages(db, comp);
      }
    }
    return changed;
  }

  function addCrossPlayoff(db, comp) {
    const d1 = divTable(db, comp, 1).map(r => r.id), d2 = divTable(db, comp, 2).map(r => r.id);
    addFixture(comp, 'PO', 1, d1[5], d2[2], { po: 'x', label: 'Play-off: 1. Liga 6th v 2. Liga 3rd (winner plays in the 1. Liga)' });
  }

  function addDivPlayoffs(db, comp) {
    const d2 = divTable(db, comp, 2).map(r => r.id);
    addFixture(comp, 'SF2', 1, d2[0], d2[3], { div: 2, label: '2. Liga semifinal 1 (1st v 4th)' });
    addFixture(comp, 'SF2', 1, d2[1], d2[2], { div: 2, label: '2. Liga semifinal 2 (2nd v 3rd)' });
    addCrossPlayoff(db, comp);
  }


  // ---------------- Städteliga (club era) ----------------
  // How far each club got in a finished Städtepokal: champion, runner-up, semifinalists, second round
  // (by place, points, NRR), then the group stage (by place, points, NRR).
  function cupRanking(db, comp) {
    const out = [], seen = new Set();
    const push = id => { if (id && !seen.has(id)) { seen.add(id); out.push(id); } };
    const fin = comp.fixtures.find(f => f.stage === 'F' && f.result);
    if (fin) { push(winnerOf(fin)); push(loserOf(fin)); }
    const byTable = (rowsList) => rowsList.flatMap(rows => rows.map((r, i) => ({ ...r, place: i })))
      .sort((a, b) => a.place - b.place || b.pts - a.pts || b.nrr - a.nrr).forEach(r => push(r.id));
    const sfLosers = comp.fixtures.filter(f => f.stage === 'SF' && f.result).map(loserOf);
    if (comp.groups2) {
      const r2 = Object.keys(comp.groups2).map(g => round2Table(db, comp, g));
      byTable(r2.map(rows => rows.filter(r => sfLosers.includes(r.id))));
      byTable(r2);
    }
    if (comp.groups) byTable(Object.keys(comp.groups).map(g => groupTable(db, comp, g)));
    for (const t of teamsOf(db, 'cup')) push(t.id);
    return out.filter(id => teamsOf(db, 'cup').some(t => t.id === id));
  }

  // club ranking used when there is no Städteliga yet: last Städtepokal, else squad strength
  function clubOrder(db) {
    const lastCup = db.competitions.filter(c => c.kind === 'cup' && c.status === 'complete' && c.format === 'v2').pop();
    if (lastCup) return cupRanking(db, lastCup);
    const pm = playerMap(db);
    const str = t => t.players.reduce((x, pid) => x + pm[pid].bat + pm[pid].bowl, 0);
    return teamsOf(db, 'cup').slice().sort((a, b) => str(b) - str(a)).map(t => t.id);
  }

  // the 18 clubs that play the Städteliga (the other 2 are Städtepokal-only)
  function ligaClubs(db) {
    const cupOnly = db.clubs && db.clubs.cupOnly ? db.clubs.cupOnly : clubOrder(db).slice(LIGA_CLUBS);
    return teamsOf(db, 'cup').map(t => t.id).filter(id => !cupOnly.includes(id));
  }

  // Three divisions of 6. First season: seeded by the last Städtepokal. Then 2 up, 2 down.
  function ligaDivisions(db) {
    const last = db.competitions.filter(c => c.kind === 'liga' && c.status === 'complete').pop();
    const n = COMPS.liga.divSize;
    if (last) {
      const mv = ligaMoves(db, last);
      const d = {};
      for (const k of [1, 2, 3]) d[k] = divTable(db, last, k).map(r => r.id).filter(id => !mv.up.includes(id) && !mv.down.includes(id));
      d[1] = d[1].concat(mv.upTo[1]); d[2] = d[2].concat(mv.downTo[2], mv.upTo[2]); d[3] = d[3].concat(mv.downTo[3]);
      return { ...d, from: last.season, seededBy: 'table' };
    }
    const clubs = ligaClubs(db);
    const order = clubOrder(db).filter(id => clubs.includes(id));
    return { 1: order.slice(0, n), 2: order.slice(n, 2 * n), 3: order.slice(2 * n, 3 * n), from: null, seededBy: db.competitions.some(c => c.kind === 'cup' && c.status === 'complete') ? 'cup' : 'strength' };
  }

  // Städteliga: top 2 of the 2. and 3. Liga go up, bottom 2 of the 1. and 2. Liga go down (by the table)
  function ligaMoves(db, comp) {
    const t = k => divTable(db, comp, k).map(r => r.id);
    const d1 = t(1), d2 = t(2), d3 = t(3);
    const upTo = { 1: d2.slice(0, 2), 2: d3.slice(0, 2) };
    const downTo = { 2: d1.slice(-2), 3: d2.slice(-2) };
    return { upTo, downTo, up: upTo[1].concat(upTo[2]), down: downTo[2].concat(downTo[3]) };
  }

  // Start a new club season: Städteliga and Städtepokal together (same squads)
  function startClubSeason(db) {
    if (!db.clubs) db.clubs = { cupOnly: clubOrder(db).slice(LIGA_CLUBS), since: new Date().toISOString() };
    const n = (db.clubs.seasons || 0) + 1;
    const cup = activeComp(db, 'cup') || startCompetition(db, 'cup');
    const liga = startCompetition(db, 'liga');
    cup.clubSeason = liga.clubSeason = n;
    db.clubs.seasons = n;
    return { cup, liga };
  }
  // the Städteliga and Städtepokal seasons that were played together
  function clubSeasonComps(db, n) { return db.competitions.filter(c => c.clubSeason === n); }

  // Rename a player in ONE profile's history: squads, stats labels, season summaries and the
  // dismissal text on scorecards ("c Name b Name"). Returns the ids of scorecards that changed.
  function renamePlayer(db, pid, name) {
    const p = db.players.find(x => x.id === pid);
    if (!p) return [];
    const old = p.name;
    p.name = name;
    const changedMatches = [];
    if (old !== name) {
      const re = new RegExp(`(^|[^\\w])${old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\w])`, 'g');
      for (const m of db.matches) {
        let hit = false;
        for (const I of m.innings.concat(m.superOvers || [])) for (const b of I.batting) {
          if (b.how && re.test(b.how)) { re.lastIndex = 0; b.how = b.how.replace(re, (all, pre) => pre + name); hit = true; }
          re.lastIndex = 0;
        }
        if (hit) changedMatches.push(m.id);
      }
    }
    if (db.stats && db.stats[pid]) db.stats[pid].name = name;
    for (const comp of db.competitions) {
      const S = comp.summary; if (!S) continue;
      for (const x of (S.topRuns || []).concat(S.topWkts || [])) if (x.pid === pid) x.name = name;
      if (S.playerOfSeries && S.playerOfSeries.pid === pid) S.playerOfSeries.name = name;
      for (const k of [S.final, ...(S.semifinals || [])].filter(Boolean)) {
        const m = db.matches.find(x => x.id === k.id);
        if (m && m.motm === pid) k.motm = name;
      }
    }
    return changedMatches;
  }

  // ---------------- Lookups ----------------
  const playerMap = db => { const m = {}; for (const p of db.players) m[p.id] = p; return m; };
  // team list a competition uses: the Städteliga plays with the city clubs
  const teamKey = kind => (COMPS[kind] && COMPS[kind].teams) || kind;
  const teamsOf = (db, kind) => db.teams[teamKey(kind)];
  function teamOf(db, kind, id) {
    const key = teamKey(kind);
    return db.teams[key].find(t => t.id === id) || (key === 'cup' && db.teams.cupV1 ? db.teams.cupV1.find(t => t.id === id) : undefined);
  }
  // Club era: Städteliga + Städtepokal with shared squads. A profile without Länderliga seasons starts in it.
  const clubEra = db => !!db.clubs || !db.competitions.some(c => c.kind === 'league');
  const leagueKind = db => clubEra(db) ? 'liga' : 'league';
  // Squads a season was played with: seasons started before v2 keep the old 24-city squads
  function squadsFor(db, comp) {
    if (comp && comp.squads) {
      // each season remembers the squads it was played with
      const base = comp.kind === 'cup' && comp.format !== 'v2' && db.teams.cupV1 ? db.teams.cupV1 : teamsOf(db, comp.kind);
      return base.filter(t => comp.squads[t.id]).map(t => ({ ...t, players: comp.squads[t.id].slice() }));
    }
    if (comp && comp.kind === 'liga') return ligaClubs(db).map(id => teamOf(db, 'cup', id));
    return comp && comp.kind === 'cup' && comp.format !== 'v2' && db.teams.cupV1 ? db.teams.cupV1 : teamsOf(db, comp ? comp.kind : 'league');
  }
  const snapshotSquads = teams => Object.fromEntries(teams.map(t => [t.id, t.players.slice()]));

  // ---------------- Transfers between seasons: the draft ----------------
  // Every team keeps its 2 best performers of last season (by Player of the Series points);
  // everyone else goes into the pool. Each pool player gets a temporary DRAFT RATING: their overall
  // rating (average of bat and bowl) moved up or down by how well they played last season
  // (points per match vs the season average, weighted by matches played, capped at ±15).
  // Teams then pick in snake order, the side with the weakest real squad first, always taking the
  // best draft rating left unless they still need batters or bowlers to make a playable side. The draft rating is only
  // used here: once squads are full, matches use the normal ratings again.
  const KEEP = 2;
  const DRAFT_CAP = 15;
  // same finished season → same draft (so leaving and coming back shows the same picks)
  const draftSeed = (kind, compId) => { let h = 2166136261; for (const ch of kind + ':' + compId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h || 7; };

  // one season's points across its competitions (club era: Städteliga + Städtepokal together)
  function combinedRace(db, comps) {
    const by = {};
    for (const c of comps) for (const x of seriesRace(db, c.id)) {
      const y = by[x.pid] = by[x.pid] || { pid: x.pid, name: x.name, points: 0, mat: 0, runs: 0, wkts: 0, motm: 0 };
      y.points += x.points; y.mat += x.mat; y.runs += x.runs; y.wkts += x.wkts; y.motm += x.motm;
    }
    return Object.values(by).sort((a, b) => b.points - a.points);
  }

  function draftRatings(db, last) {
    const pm = playerMap(db);
    const race = combinedRace(db, Array.isArray(last) ? last : [last]);
    const per = race.filter(x => x.mat).map(x => x.points / x.mat);
    const mean = per.length ? per.reduce((a, b) => a + b, 0) / per.length : 0;
    const sd = per.length > 1 ? Math.sqrt(per.reduce((a, b) => a + (b - mean) ** 2, 0) / per.length) || 1 : 1;
    const full = Math.max(1, ...race.map(x => x.mat));
    const byPid = Object.fromEntries(race.map(x => [x.pid, x]));
    const out = {};
    for (const p of db.players) {
      const x = byPid[p.id];
      let delta = 0;
      if (x && x.mat) {
        const z = (x.points / x.mat - mean) / sd;
        const weight = Math.min(1, x.mat / Math.min(4, full));      // 1–2 matches count for less
        delta = (z * 8 + (x.motm || 0)) * weight;                    // half performance, half real rating
        delta = Math.max(-DRAFT_CAP, Math.min(DRAFT_CAP, delta));
      }
      out[p.id] = {
        // shown as one number: overall (average of bat and bowl) plus form; the ranking uses the same
        rating: Math.round((p.bat + p.bowl) / 2), delta: Math.round(delta), draft: Math.round((p.bat + p.bowl) / 2 + Math.round(delta)),
        real: p.bat + p.bowl,                            // true strength: decides who picks first
        value: p.bat + p.bowl + Math.round(delta) * 2,   // draft value: who gets picked first (both skills + form)
        role: p.bat >= p.bowl ? 'bat' : 'bowl',
        mat: x ? x.mat : 0, runs: x ? x.runs : 0, wkts: x ? x.wkts : 0, motm: x ? x.motm : 0, points: x ? x.points : 0,
      };
    }
    return out;
  }

  // The season just finished: the last Städtepokal plus the last league (Städteliga, or the
  // last Länderliga at the switch). The draft opens only when all of them are finished.
  function seasonDone(db) {
    const comps = [lastComp(db, 'cup'), lastComp(db, leagueKind(db)) || (clubEra(db) ? null : lastComp(db, 'league'))].filter(Boolean);
    if (!comps.length || comps.some(c => c.status !== 'complete')) return null;
    return comps;
  }

  // One draft for the city clubs (they play both competitions). `kind` is kept for older callers.
  function planTransfers(db, kind, seed) {
    kind = 'cup';
    const comps = seasonDone(db);
    if (!comps) return null;
    const last = comps.find(c => c.kind === 'cup') || comps[0];
    const r = rng(seed || draftSeed(kind, comps.map(c => c.id).join('+')));
    const info = draftRatings(db, comps);
    const points = {};
    for (const x of combinedRace(db, comps)) points[x.pid] = x.points;
    const teams = teamsOf(db, kind);
    const squadSize = COMPS[kind].squad;
    // every side needs two real openers and at least three real bowlers; the rest is best available
    const wantBat = 2, wantBowl = 3;
    const plan = teams.map(t => {
      const ranked = t.players.slice().sort((a, b) => (points[b] || 0) - (points[a] || 0) || info[b].value - info[a].value);
      return { id: t.id, kept: ranked.slice(0, KEEP), released: ranked.slice(KEEP), signed: [] };
    });
    const taken = new Set(plan.flatMap(t => t.kept));
    // a little luck so the order isn't fully predictable
    const pool = shuffle(db.players.map(p => p.id).filter(pid => !taken.has(pid)), r)
      .map(pid => ({ pid, score: info[pid].value + (r() - 0.5) * 10 }))
      .sort((a, b) => b.score - a.score);
    const squad = t => t.kept.concat(t.signed.map(s => s.pid));
    // pick order goes by real strength, so a hot streak can't make a side stronger than it looks
    const strength = t => squad(t).reduce((s, pid) => s + info[pid].real, 0);
    const picks = [];
    const was = {};
    for (const t of teams) for (const pid of t.players) was[pid] = t.id;
    const rounds = squadSize - KEEP;
    for (let round = 0; round < rounds; round++) {
      const order = plan.slice().sort((a, b) => strength(a) - strength(b));
      if (round % 2) order.reverse();
      for (const t of order) {
        if (!pool.length) break;
        const have = squad(t);
        const bats = have.filter(pid => info[pid].role === 'bat').length;
        const bowls = have.length - bats;
        const slots = squadSize - have.length;
        let need = null;                                   // must fill a role with the spots left?
        if (wantBat - bats >= slots) need = 'bat';
        else if (wantBowl - bowls >= slots) need = 'bowl';
        let i = need ? pool.findIndex(x => info[x.pid].role === need) : 0;
        if (i < 0) i = 0;
        const pick = pool.splice(i, 1)[0];
        t.signed.push({ pid: pick.pid, from: was[pick.pid] || null });
        picks.push({ n: picks.length + 1, round: round + 1, team: t.id, pid: pick.pid, from: was[pick.pid] || null, need });
      }
    }
    return {
      kind, club: true, fromSeason: last.season, toSeason: last.season + 1, fromComps: comps.map(c => c.id), points, keep: KEEP,
      teams: plan, picks, info,
      unsigned: pool.map(x => x.pid),
    };
  }

  function applyTransfers(db, plan) {
    const kind = 'cup';
    // seasons played before squads were remembered keep the squads they used
    for (const c of db.competitions) if ((c.kind === 'cup' || c.kind === 'liga') && !c.squads && !(c.kind === 'cup' && c.format !== 'v2')) c.squads = snapshotSquads(teamsOf(db, c.kind));
    for (const t of plan.teams) {
      const team = teamsOf(db, kind).find(x => x.id === t.id);
      team.players = t.kept.concat(t.signed.map(s => s.pid));
    }
    for (const p of db.players) {
      const t = teamsOf(db, kind).find(x => x.players.includes(p.id));
      if (t) p.city = t.id;
    }
    const { cup, liga } = startClubSeason(db);
    // the draft is kept with the season so it can be watched again later (only the players involved)
    const used = new Set(plan.picks ? plan.picks.map(x => x.pid).concat(plan.teams.flatMap(t => t.kept)) : []);
    const info = plan.info ? Object.fromEntries(Object.entries(plan.info).filter(([pid]) => used.has(pid))) : undefined;
    cup.transfers = { fromSeason: plan.fromSeason, fromComps: plan.fromComps, teams: plan.teams, unsigned: plan.unsigned, keep: plan.keep, picks: plan.picks, info };
    liga.transfers = { ref: cup.id };      // same draft, shown from the Städtepokal season
    return { cup, liga };
  }
  function activeComp(db, kind) { return db.competitions.find(c => c.kind === kind && c.status !== 'complete'); }
  function lastComp(db, kind) { const l = db.competitions.filter(c => c.kind === kind); return l[l.length - 1]; }

  // Squad in batting order, shaped for the engine
  function engineTeam(db, kind, id, comp) {
    const t = (comp ? squadsFor(db, comp).find(x => x.id === id) : null) || teamOf(db, kind, id), pm = playerMap(db);
    const fm = formMap(db);
    const players = t.players.map(pid => pm[pid]).sort((a, b) => b.bat - a.bat)
      .map((p, i) => {
        const f = fm[p.id] || { bat: 0, bowl: 0 };
        return {
          pid: p.id, name: p.name, type: p.type,
          bat: Math.max(5, Math.min(99, p.bat + f.bat)), bowl: Math.max(5, Math.min(99, p.bowl + f.bowl)),
          baseBat: p.bat, baseBowl: p.bowl, form: f,
          noBowl: i < 2,     // the two openers don't bowl
        };
      });
    return { id: t.id, name: t.name, short: t.short, color: t.color, players };
  }

  // ---------------- Form ----------------
  // Last 5 matches compared with the player's own career average gives a small temporary
  // bonus or penalty (-4 … +4 rating points). Nothing permanent: it fades as new matches come in.
  const FORM_MATCHES = 5, FORM_MAX = 4;
  let formCache = { key: null, map: {} };
  function formMap(db) {
    const key = db.matches.length + ':' + (db.matches.length ? db.matches[db.matches.length - 1].id : '');
    if (formCache.key === key && formCache.db === db) return formCache.map;
    const recent = {};   // pid -> { inn, runs, n, balls, rc, w }
    const seen = {};
    // newest first (matches are stored in the order they were played)
    for (let k = db.matches.length - 1, n = 0; k >= 0 && n < 400; k--, n++) {
      const m = db.matches[k];
      const here = new Set();
      for (const I of m.innings) {
        if (I.superOver) continue;
        for (const b of I.batting) here.add(b.pid);
        for (const b of I.bowling) here.add(b.pid);
      }
      for (const pid of here) {
        if ((seen[pid] = (seen[pid] || 0) + 1) > FORM_MATCHES) continue;
        const r = recent[pid] = recent[pid] || { inn: 0, runs: 0, balls: 0, rc: 0, w: 0 };
        for (const I of m.innings) {
          if (I.superOver) continue;
          const b = I.batting.find(x => x.pid === pid); if (b) { r.inn++; r.runs += b.r; }
          const w = I.bowling.find(x => x.pid === pid); if (w) { r.balls += w.balls; r.rc += w.r; r.w += w.w; }
        }
      }
    }
    const clampF = v => Math.max(-FORM_MAX, Math.min(FORM_MAX, Math.round(v)));
    const map = {};
    for (const pid in recent) {
      const r = recent[pid], s = db.stats[pid] && db.stats[pid].all;
      if (!s) continue;
      let bat = 0, bowl = 0;
      // batting: runs per innings, recent vs career (3 runs = 1 point)
      if (r.inn >= 3 && s.inn >= 5) bat = clampF((r.runs / r.inn - s.runs / s.inn) / 3);
      // bowling: value per over = 20 per wicket minus runs conceded, recent vs career (5 = 1 point)
      if (r.balls >= 18 && s.ballsBowled >= 30) {
        const val = (w, rc, balls) => (20 * w - rc) * 6 / balls;
        bowl = clampF((val(r.w, r.rc, r.balls) - val(s.wkts, s.runsConceded, s.ballsBowled)) / 5);
      }
      if (bat || bowl) map[pid] = { bat, bowl };
    }
    formCache = { key, db, map };
    return map;
  }
  function formOf(db, pid) { return formMap(db)[pid] || { bat: 0, bowl: 0 }; }

  // ---------------- Fixtures ----------------
  function roundRobin(ids) {
    const arr = ids.slice();
    if (arr.length % 2) arr.push(null);          // odd number of teams: one sits out each round
    const n = arr.length, rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const games = [];
      for (let i = 0; i < n / 2; i++) {
        const a = arr[i], b = arr[n - 1 - i];
        if (a === null || b === null) continue;
        games.push(r % 2 ? [b, a] : [a, b]);
      }
      rounds.push(games);
      arr.splice(1, 0, arr.pop());
    }
    return rounds;
  }

  function pickPitch(r) { const x = r(); return x < 0.45 ? 'balanced' : x < 0.65 ? 'flat' : x < 0.83 ? 'green' : 'dusty'; }

  function startCompetition(db, kind) {
    if (activeComp(db, kind)) throw new Error('Finish the current season first');
    const cfg = COMPS[kind];
    const season = db.competitions.filter(c => c.kind === kind).length + 1;
    const seed = (Date.now() % 100000) + season * 7;
    const r = rng(seed);
    const comp = {
      id: `${kind}-s${season}`, kind, name: cfg.name, season, status: 'active', stage: kind === 'cup' ? 'group' : 'league',
      overs: cfg.overs, maxOversPerBowler: cfg.maxOversPerBowler, maxBallsPerBatter: cfg.maxBallsPerBatter || null,
      format: cfg.format || null, startedAt: new Date().toISOString(),
      fixtures: [], groups: null, summary: null,
      squads: snapshotSquads(kind === 'liga' ? teamsOf(db, 'cup').filter(t => ligaClubs(db).includes(t.id)) : kind === 'cup' && cfg.format !== 'v2' && db.teams.cupV1 ? db.teams.cupV1 : teamsOf(db, kind)),
    };
    let n = 0;
    const fx = (stage, round, home, away, extra) => ({ id: `${comp.id}-m${++n}`, stage, round, home, away, pitch: pickPitch(r), matchId: null, result: null, ...(extra || {}) });
    if (kind === 'liga') {
      const dv = ligaDivisions(db);
      comp.divisions = { 1: dv[1], 2: dv[2], 3: dv[3] };
      comp.divisionsFrom = dv.from;
      comp.seededBy = dv.seededBy || null;
      const rr = {}; for (const d of [1, 2, 3]) rr[d] = roundRobin(shuffle(dv[d], r));
      for (let rd = 0; rd < rr[1].length; rd++) for (const d of [1, 2, 3]) for (const [a, b] of rr[d][rd]) comp.fixtures.push(fx('league', rd + 1, a, b, { div: d }));
    } else if (kind === 'league' && cfg.format === 'div') {
      const dv = divisionsFor(db);
      comp.divisions = { 1: dv[1], 2: dv[2] };
      comp.playoffs = 2;
      comp.divisionsFrom = dv.from;
      comp.seededBy = dv.seededBy || null;
      const rr = { 1: roundRobin(shuffle(dv[1], r)), 2: roundRobin(shuffle(dv[2], r)) };
      for (let rd = 0; rd < 7; rd++) for (const d of [1, 2]) for (const [a, b] of rr[d][rd]) comp.fixtures.push(fx('league', rd + 1, a, b, { div: d }));
    } else if (kind === 'league') {
      const ids = shuffle(db.teams.league.map(t => t.id), r);
      roundRobin(ids).forEach((games, ri) => games.forEach(([a, b]) => comp.fixtures.push(fx('league', ri + 1, a, b))));
    } else {
      // 5 groups of 4, everyone plays everyone in the group (6 matches per group)
      const ids = shuffle(teamsOf(db, 'cup').map(t => t.id), r);
      comp.groups = {};
      'ABCDE'.split('').forEach((g, gi) => { comp.groups[g] = ids.slice(gi * 4, gi * 4 + 4); });
      const perGroup = Object.fromEntries(Object.entries(comp.groups).map(([g, t]) => [g, roundRobin(t)]));
      for (let md = 0; md < 3; md++) {
        for (const g of Object.keys(comp.groups)) for (const [a, b] of perGroup[g][md]) comp.fixtures.push(fx('group', md + 1, a, b, { group: g }));
      }
    }
    comp._n = n;
    db.competitions.push(comp);
    return comp;
  }

  function addFixture(comp, stage, round, home, away, extra) {
    comp._n = (comp._n || comp.fixtures.length) + 1;
    const pitches = ['balanced', 'flat', 'green', 'dusty', 'balanced'];
    const f = { id: `${comp.id}-m${comp._n}`, stage, round, home, away, pitch: pitches[comp._n % pitches.length], matchId: null, result: null, ...(extra || {}) };
    comp.fixtures.push(f);
    return f;
  }

  // ---------------- Standings ----------------
  function table(db, comp, teamIds, filterFn) {
    const rows = {};
    for (const id of teamIds) rows[id] = { id, p: 0, w: 0, l: 0, t: 0, pts: 0, rf: 0, bf: 0, ra: 0, ba: 0, nrr: 0 };
    for (const f of comp.fixtures) {
      if (!f.result || !filterFn(f)) continue;
      const R = f.result;
      for (const side of [f.home, f.away]) {
        const me = rows[side]; if (!me) continue;
        const opp = side === f.home ? f.away : f.home;
        me.p++;
        if (R.winner === side && !R.superOverTie) { me.w++; me.pts += 2; }
        else if (R.tie) { me.t++; me.pts += 1; }
        else me.l++;
        me.rf += R.runs[side]; me.bf += R.ballsNRR[side];
        me.ra += R.runs[opp]; me.ba += R.ballsNRR[opp];
      }
    }
    const list = Object.values(rows);
    for (const x of list) x.nrr = (x.bf ? x.rf * 6 / x.bf : 0) - (x.ba ? x.ra * 6 / x.ba : 0);
    list.sort((a, b) => b.pts - a.pts || b.nrr - a.nrr || b.w - a.w || a.id.localeCompare(b.id));
    return list;
  }
  const leagueTable = (db, comp) => table(db, comp, db.teams.league.map(t => t.id), f => f.stage === 'league');
  const divTable = (db, comp, d) => table(db, comp, comp.divisions[d], f => f.stage === 'league' && f.div === d);
  const groupTable = (db, comp, g) => table(db, comp, comp.groups[g], f => f.stage === 'group' && f.group === g);
  const round2Table = (db, comp, g) => table(db, comp, comp.groups2[g], f => f.stage === 'R2' && f.group === g);

  // ---------------- Qualification race ----------------
  // Every way the remaining matches of a group / division can end (each match 50/50; with more than
  // 14 matches left, 6000 random runs). Teams level on points are split by their current net run rate.
  //   zone: { top: K } (finish in the top K) — returns per team: chance %, status, what they need.
  function race(rows, remaining, top, bottom) {
    const ids = rows.map(r => r.id), n = ids.length;
    const base = Object.fromEntries(rows.map(r => [r.id, r.pts]));
    const nrr = Object.fromEntries(rows.map(r => [r.id, r.nrr]));
    const k = remaining.length;
    const out = Object.fromEntries(ids.map(id => [id, { in: 0, down: 0, total: 0, sureIn: true, canIn: false, sureDown: true, canDown: false,
      winAll: { total: 0, sureIn: true, canIn: false }, loseCan: false, nrrTie: false, rivals: new Set(), rivalNrr: -Infinity, winSureSome: false,
      sureMasks: [], tieMasks: [], canMasks: [] }]));
    const mine = Object.fromEntries(ids.map(id => [id, remaining.filter(f => f.home === id || f.away === id)]));
    const evalOutcome = (winners, mask) => {
      const pts = { ...base };
      winners.forEach(w => { pts[w] += 2; });
      for (const id of ids) {
        const o = out[id];
        const above = ids.filter(x => x !== id && pts[x] > pts[id]).length;       // ahead whatever the NRR
        const level = ids.filter(x => x !== id && pts[x] === pts[id]).length;
        const sureInHere = above + level < top, canInHere = above < top;
        // level on points at the cut-off: the spots left are shared (net run rate decides)
        o.total++; o.in += sureInHere ? 1 : canInHere ? (top - above) / (level + 1) : 0;
        if (!sureInHere) o.sureIn = false;
        if (canInHere) o.canIn = true;
        if (canInHere && !sureInHere) o.nrrTie = true;
        if (bottom) {
          const below = ids.filter(x => x !== id && pts[x] < pts[id]).length;
          o.down += below + level < bottom ? 1 : below < bottom ? (bottom - below) / (level + 1) : 0;
          if (below + level >= bottom) o.sureDown = false;          // could finish above the drop zone
          if (below < bottom) o.canDown = true;
        }
        const wonAll = mine[id].every(f => winners[remaining.indexOf(f)] === id);
        if (wonAll) {
          o.winAll.total++; if (!sureInHere) o.winAll.sureIn = false; if (canInHere) o.winAll.canIn = true;
          if (sureInHere) o.winSureSome = true;
          if (mask !== undefined) { if (sureInHere) o.sureMasks.push(mask); else if (canInHere) o.tieMasks.push(mask); }
          // won, but level on points at the cut-off: who would they have to beat on net run rate?
          if (canInHere && !sureInHere) {
            // level with these teams for (top - above) spots: they must finish above the team in the last of those spots
            const lv = ids.filter(x => x !== id && pts[x] === pts[id]).sort((a, b) => nrr[b] - nrr[a]);
            const thr = lv[top - above - 1];
            if (thr && (o.needNrr === undefined || nrr[thr] < o.needNrr)) { o.needNrr = nrr[thr]; o.needRival = thr; }
            lv.forEach(x => o.rivals.add(x));
          }
        }
        else if (canInHere) o.loseCan = true;
        if (mask !== undefined && canInHere) o.canMasks.push(mask);
      }
    };
    if (k <= 14) {
      for (let mask = 0; mask < (1 << k); mask++) evalOutcome(remaining.map((f, i) => (mask >> i) & 1 ? f.home : f.away), mask);
    } else {
      for (let s = 0; s < 6000; s++) evalOutcome(remaining.map(f => Math.random() < 0.5 ? f.home : f.away));
      // with sampling, "sure" and "can't" only from points that are mathematically out of reach
      for (const id of ids) {
        const maxPts = base[id] + 2 * mine[id].length;
        const o = out[id];
        o.sureIn = false; o.sureDown = false;
        o.canIn = ids.filter(x => x !== id && base[x] > maxPts).length < top;
        o.winAll.sureIn = false;
      }
    }
    // other matches that end the same way in every one of these outcomes = results the team needs
    const fixed = (masks, id) => {
      if (!masks.length) return null;
      const need = [];
      remaining.forEach((f, i) => {
        if (f.home === id || f.away === id) return;
        const bit = (masks[0] >> i) & 1;
        if (masks.every(m => ((m >> i) & 1) === bit)) need.push({ winner: bit ? f.home : f.away, loser: bit ? f.away : f.home });
      });
      return need;
    };
    const res = {};
    for (const id of ids) {
      const o = out[id];
      const left = mine[id];
      res[id] = {
        chance: Math.round(100 * o.in / o.total),
        status: o.sureIn ? 'in' : !o.canIn ? 'out' : 'race',
        down: bottom ? (o.sureDown ? 'down' : !o.canDown ? 'safe' : Math.round(100 * o.down / o.total)) : null,
        left: left.map(f => f.home === id ? f.away : f.home),
        winAllSure: left.length && o.winAll.sureIn,
        winAllCan: left.length && o.winAll.canIn,
        loseCan: o.loseCan,
        nrr: o.nrrTie,
        rivals: [...o.rivals], rivalNrr: o.needNrr, rival: o.needRival, winSureSome: o.winSureSome,
        sureIf: fixed(o.sureMasks, id),    // winning their own matches + these results = through for sure
        tieIf: fixed(o.tieMasks, id),      // ... or these results = level on points, net run rate decides
        needsIf: fixed(o.canMasks, id),    // results needed in every way they can still go through
      };
    }
    return { teams: res, matchesLeft: k, exact: k <= 14 };
  }

  // Smallest win that takes a team's net run rate above `target` in its last match.
  //   Batting first: they score `par` in full overs, the opponents fall short by R runs (full overs).
  //   Chasing: the opponents score `par`, they reach par+1 with balls to spare.
  function nrrMargin(row, B, par, target) {
    const after = (rf, bf, ra, ba) => rf * 6 / bf - ra * 6 / ba;
    // batting first: NRR grows by R / (overs bowled) for every run the opponents fall short
    const base = after(row.rf + par, row.bf + B, row.ra + par, row.ba + B);
    const perRun = 6 / (row.ba + B);
    let runs = Math.floor((target - base) / perRun) + 1;
    if (runs < 1) runs = 1;
    const runsOk = runs < par;
    // chasing: fewer balls used = higher NRR
    let spare = null;
    for (let s = 0; s < B; s++) {
      if (after(row.rf + par + 1, row.bf + (B - s), row.ra + par, row.ba + B) > target) { spare = s; break; }
    }
    return { runs: runsOk ? runs : null, spare };
  }

  function raceFor(db, comp, scope) {
    let rows, remaining, top, bottom = 0;
    if (scope.type === 'group') { rows = groupTable(db, comp, scope.g); remaining = comp.fixtures.filter(f => f.stage === 'group' && f.group === scope.g && !f.result); top = 2; }
    else if (scope.type === 'r2') { rows = round2Table(db, comp, scope.g); remaining = comp.fixtures.filter(f => f.stage === 'R2' && f.group === scope.g && !f.result); top = 2; }
    else {
      rows = divTable(db, comp, scope.d); remaining = comp.fixtures.filter(f => f.stage === 'league' && f.div === scope.d && !f.result);
      if (comp.kind === 'liga') { top = scope.d === 1 ? 4 : 2; bottom = scope.d === 3 ? 0 : 2; }   // 1. Liga: semifinals; 2./3. Liga: promotion
      else { top = scope.d === 1 ? 4 : 2; bottom = scope.d === 1 ? 2 : 0; }
    }
    if (!remaining.length) return null;
    const r = { ...race(rows, remaining, top, bottom), top, bottom, order: rows.map(x => x.id) };
    // How big a win lifts a team above its rivals on net run rate (only with one match left)
    const played = db.matches.filter(m => m.compId === comp.id);
    const firsts = played.map(m => m.innings[0] && m.innings[0].runs).filter(x => x != null);
    const par = firsts.length ? Math.round(firsts.reduce((a, b) => a + b, 0) / firsts.length) : comp.overs * 10;
    for (const row of rows) {
      const t = r.teams[row.id];
      if (!r.exact || t.left.length !== 1 || !t.rivals.length) continue;
      if (t.rival === undefined) continue;
      t.margin = nrrMargin(row, comp.overs * 6, par, t.rivalNrr);
      t.margin.par = par;
      t.rivalPlays = remaining.some(f => f.home === t.rival || f.away === t.rival);
    }
    return r;
  }

  // ---------------- Season records ----------------
  function seasonRecords(db, compId) {
    const ms = db.matches.filter(m => m.compId === compId);
    if (!ms.length) return null;
    const rec = {};
    const better = (key, val, cmp, data) => { if (!rec[key] || cmp(val, rec[key].val)) rec[key] = { val, ...data }; };
    const st = {};
    for (const m of ms) {
      const main = m.innings.filter(I => !I.superOver);
      for (const I of main) {
        better('highTotal', I.runs, (a, b) => a > b, { team: I.team, wkts: I.wkts, balls: I.balls, match: m.id });
        if (main.indexOf(I) === 0 || I.wkts >= (I.batting.length + I.dnb.length) - 1) better('lowTotal', I.runs, (a, b) => a < b, { team: I.team, wkts: I.wkts, balls: I.balls, match: m.id });
        for (const b of I.batting) {
          better('topScore', b.r * 1000 - b.b, (a, b2) => a > b2, { pid: b.pid, r: b.r, b: b.b, out: b.out, match: m.id });
          const s = st[b.pid] = st[b.pid] || { r: 0, b: 0, s6: 0, f4: 0, balls: 0, rc: 0, w: 0 };
          s.r += b.r; s.b += b.b; s.s6 += b.s6; s.f4 += b.f4;
        }
        for (const w of I.bowling) {
          better('bestBowl', w.w * 1000 - w.r, (a, b2) => a > b2, { pid: w.pid, w: w.w, r: w.r, balls: w.balls, match: m.id });
          const s = st[w.pid] = st[w.pid] || { r: 0, b: 0, s6: 0, f4: 0, balls: 0, rc: 0, w: 0 };
          s.balls += w.balls; s.rc += w.r; s.w += w.w;
        }
      }
      if (main.length === 2) {
        const [a, b] = main;
        const margin = b.runs < a.runs && m.winner === a.team ? a.runs - b.runs : 0;
        if (margin) better('bigWin', margin, (x, y) => x > y, { team: a.team, opp: b.team, match: m.id });
      }
    }
    const max = (fn, filter) => Object.entries(st).filter(([, s]) => !filter || filter(s)).sort((x, y) => fn(y[1]) - fn(x[1]))[0];
    const six = max(s => s.s6); if (six && six[1].s6) rec.sixes = { pid: six[0], val: six[1].s6 };
    const sr = max(s => s.r / s.b, s => s.b >= 30); if (sr) rec.strikeRate = { pid: sr[0], val: Math.round(100 * sr[1].r / sr[1].b), balls: sr[1].b };
    const ec = max(s => -s.rc / s.balls, s => s.balls >= 18); if (ec) rec.economy = { pid: ec[0], val: (ec[1].rc * 6 / ec[1].balls).toFixed(1), balls: ec[1].balls };
    const pom = {}; for (const m of ms) if (m.motm) pom[m.motm] = (pom[m.motm] || 0) + 1;
    const pm = Object.entries(pom).sort((a, b) => b[1] - a[1])[0]; if (pm) rec.pom = { pid: pm[0], val: pm[1] };
    return rec;
  }

  // ---------------- Recording a finished match ----------------
  function summarize(db, comp, fixture, match, mode) {
    const kind = comp.kind;
    const sides = match.teams.map(t => t.id);
    // Super Overs are kept apart: like real cricket they don't count in career stats or NRR
    const superOvers = match.innings.filter(I => I.superOver).map(I => {
      const bt = match.teams[I.bat], bw = match.teams[I.bowl];
      return {
        n: I.superOver, team: bt.id, runs: I.runs, wkts: I.wkts, balls: I.balls,
        batting: I.batters.filter(b => b.batted).map(b => ({ pid: bt.players[b.idx].pid, r: b.runs, b: b.balls, f4: b.fours, s6: b.sixes, out: !!b.out, how: b.out ? b.out.text : 'not out' })),
        bowling: Object.entries(I.bowlers).map(([idx, s]) => ({ pid: bw.players[idx].pid, balls: s.balls, r: s.runs, w: s.wkts })),
      };
    });
    const innings = match.innings.filter(I => !I.superOver).map(I => {
      const bt = match.teams[I.bat], bw = match.teams[I.bowl];
      return {
        team: bt.id, runs: I.runs, wkts: I.wkts, balls: I.balls, extras: I.extras.wd + I.extras.nb,
        batting: I.batters.filter(b => b.batted).map(b => ({
          pid: bt.players[b.idx].pid, r: b.runs, b: b.balls, f4: b.fours, s6: b.sixes, out: !!b.out, how: b.out ? b.out.text : (b.retired && !b.returned ? 'retired not out' : 'not out'),
        })),
        dnb: I.batters.filter(b => !b.batted).map(b => bt.players[b.idx].pid),
        bowling: Object.entries(I.bowlers).sort((a, b) => a[1].order - b[1].order).map(([idx, s]) => ({
          pid: bw.players[idx].pid, balls: s.balls, r: s.runs, w: s.wkts, m: s.maidens || 0, dots: s.dots, wd: s.wides, nb: s.nbs,
        })),
        fow: I.fow.map(f => ({ w: f.wkt, r: f.runs, ov: f.over })),
      };
    });
    let winner = match.result.winner === null ? null : sides[match.result.winner];
    let text = match.result.text;
    let tie = winner === null, superOverTie = false;
    // Knockouts can't end level: tie-break on boundaries, then wickets lost, then a coin toss
    if (tie && fixture.stage !== 'league' && fixture.stage !== 'group') {
      const bnd = I => I.batting.reduce((s, b) => s + b.f4 + b.s6, 0);
      const [i1, i2] = innings;
      let w;
      if (bnd(i1) !== bnd(i2)) { w = bnd(i1) > bnd(i2) ? i1.team : i2.team; text = `Scores level. ${teamOf(db, kind, w).name} win on boundary count`; }
      else if (i1.wkts !== i2.wkts) { w = i1.wkts < i2.wkts ? i1.team : i2.team; text = `Scores level. ${teamOf(db, kind, w).name} win on fewer wickets lost`; }
      else { w = Math.random() < 0.5 ? i1.team : i2.team; text = `Scores level. ${teamOf(db, kind, w).name} win the bowl-out`; }
      winner = w; superOverTie = true; tie = false;
    }
    const motm = bestOf(winnersOnly(impactScores(innings, winner), winner)).pid;

    const runs = {}, ballsNRR = {};
    for (const I of innings) {
      runs[I.team] = I.runs;
      const allOut = I.wkts >= match.teams.find(t => t.id === I.team).players.length - 1;
      ballsNRR[I.team] = allOut ? comp.overs * 6 : I.balls;
    }
    return {
      summary: {
        id: fixture.id, comp: kind, compId: comp.id, compName: comp.name, season: comp.season, stage: fixture.stage, round: fixture.round, group: fixture.group || null,
        date: new Date().toISOString(), mode, pitch: match.pitch, overs: comp.overs,
        teams: sides, toss: match.toss ? sides[match.toss.winner] : null, innings, superOvers, winner, tie, result: text, motm,
      },
      result: { winner, tie, superOverTie, text, runs, ballsNRR, score: Object.fromEntries(innings.map(I => [I.team, `${I.runs}/${I.wkts} (${E.oversStr(I.balls)})`])) },
    };
  }

  function recordMatch(db, compId, fixtureId, match, mode) {
    const comp = db.competitions.find(c => c.id === compId);
    const f = comp.fixtures.find(x => x.id === fixtureId);
    if (f.result) throw new Error('Match already recorded');
    const { summary, result } = summarize(db, comp, f, match, mode);
    db.matches.push(summary);
    f.matchId = summary.id; f.result = result;
    advanceStages(db, comp);
    db.stats = computeStats(db);
    return summary;
  }

  // ---------------- Stage progression ----------------
  const stageDone = (comp, stage) => comp.fixtures.filter(f => f.stage === stage).every(f => f.result);
  const has = (comp, stage) => comp.fixtures.some(f => f.stage === stage);
  const winnerOf = f => f.result.winner;
  const loserOf = f => (f.result.winner === f.home ? f.away : f.home);

  function advanceStages(db, comp) {
    if (comp.kind === 'liga') {
      // every division: league stage → semifinals (1st v 4th, 2nd v 3rd) → final → division champion
      if (comp.stage === 'league' && stageDone(comp, 'league')) {
        for (const d of [1, 2, 3]) {
          const t = divTable(db, comp, d).map(r => r.id);
          addFixture(comp, 'SF', 1, t[0], t[3], { div: d, label: `${d}. Liga semifinal 1 (1st v 4th)` });
          addFixture(comp, 'SF', 1, t[1], t[2], { div: d, label: `${d}. Liga semifinal 2 (2nd v 3rd)` });
        }
        comp.stage = 'playoffs';
      }
      if (comp.stage === 'playoffs') {
        for (const d of [1, 2, 3]) {
          const s = comp.fixtures.filter(f => f.stage === 'SF' && f.div === d);
          if (s.length && s.every(f => f.result) && !comp.fixtures.some(f => f.stage === 'F' && f.div === d))
            addFixture(comp, 'F', 1, winnerOf(s[0]), winnerOf(s[1]), { div: d, label: d === 1 ? 'Final (1. Liga)' : `${d}. Liga final` });
        }
        const finals = comp.fixtures.filter(f => f.stage === 'F');
        if (finals.length === 3 && finals.every(f => f.result) && comp.fixtures.every(f => f.result)) {
          comp.status = 'complete';
          comp.finishedAt = new Date().toISOString();
          comp.summary = seasonSummary(db, comp, finals.find(f => f.div === 1));
        }
      }
      return;
    }
    if (comp.kind === 'league') {
      if (comp.stage === 'league' && stageDone(comp, 'league')) {
        const t = comp.format === 'div' ? divTable(db, comp, 1) : leagueTable(db, comp);
        addFixture(comp, 'SF', 1, t[0].id, t[3].id, { label: 'Semifinal 1 (1st v 4th)', ...(comp.playoffs ? { div: 1 } : {}) });
        addFixture(comp, 'SF', 1, t[1].id, t[2].id, { label: 'Semifinal 2 (2nd v 3rd)', ...(comp.playoffs ? { div: 1 } : {}) });
        comp.stage = 'SF';
        if (comp.playoffs) { addDivPlayoffs(db, comp); comp.stage = 'playoffs'; }
      }
      if (comp.playoffs && comp.stage !== 'league') {
        // 1. Liga final, 2. Liga final and both play-offs run side by side
        if (stageDone(comp, 'SF') && !has(comp, 'F')) {
          const s = comp.fixtures.filter(f => f.stage === 'SF');
          addFixture(comp, 'F', 1, winnerOf(s[0]), winnerOf(s[1]), { label: 'Final', div: 1 });
        }
        if (stageDone(comp, 'SF2') && !has(comp, 'F2')) {
          const s = comp.fixtures.filter(f => f.stage === 'SF2');
          addFixture(comp, 'F2', 1, winnerOf(s[0]), winnerOf(s[1]), { label: '2. Liga final', div: 2 });
        }
        if (['SF', 'F', 'SF2', 'F2', 'PO'].every(s => has(comp, s) && stageDone(comp, s))) {
          const fin = comp.fixtures.find(f => f.stage === 'F');
          comp.status = 'complete';
          comp.finishedAt = new Date().toISOString();
          comp.summary = seasonSummary(db, comp, fin);
        }
        return;
      }
    } else if (comp.format === 'v2') {
      if (comp.stage === 'group' && stageDone(comp, 'group')) {
        // Second round: winners of A, C, E + runners-up of B, D in Group X; the rest in Group Y
        const pos = {};
        for (const g of Object.keys(comp.groups)) pos[g] = groupTable(db, comp, g).map(r => r.id);
        comp.groups2 = {
          X: [pos.A[0], pos.C[0], pos.E[0], pos.B[1], pos.D[1]],
          Y: [pos.B[0], pos.D[0], pos.A[1], pos.C[1], pos.E[1]],
        };
        const rr = { X: roundRobin(comp.groups2.X), Y: roundRobin(comp.groups2.Y) };
        for (let rd = 0; rd < rr.X.length; rd++) for (const g of ['X', 'Y']) for (const [a, b] of rr[g][rd]) addFixture(comp, 'R2', rd + 1, a, b, { group: g });
        comp.stage = 'R2';
      } else if (comp.stage === 'R2' && stageDone(comp, 'R2')) {
        const x = round2Table(db, comp, 'X').map(r => r.id), y = round2Table(db, comp, 'Y').map(r => r.id);
        addFixture(comp, 'SF', 1, x[0], y[1], { label: 'Semifinal 1 (X1 v Y2)' });
        addFixture(comp, 'SF', 1, y[0], x[1], { label: 'Semifinal 2 (Y1 v X2)' });
        comp.stage = 'SF';
      }
    } else {
      if (comp.stage === 'group' && stageDone(comp, 'group')) {
        const pos = {};
        for (const g of Object.keys(comp.groups)) pos[g] = groupTable(db, comp, g).map(r => r.id);
        const pairs = [['A', 'B'], ['B', 'A'], ['C', 'D'], ['D', 'C'], ['E', 'F'], ['F', 'E'], ['G', 'H'], ['H', 'G']];
        pairs.forEach(([x, y], i) => addFixture(comp, 'R16', 1, pos[x][0], pos[y][1], { label: `R16 ${i + 1}: ${x}1 v ${y}2` }));
        comp.stage = 'R16';
      } else if (comp.stage === 'R16' && stageDone(comp, 'R16')) {
        const r = comp.fixtures.filter(f => f.stage === 'R16');
        for (let i = 0; i < 4; i++) addFixture(comp, 'QF', 1, winnerOf(r[i * 2]), winnerOf(r[i * 2 + 1]), { label: `Quarterfinal ${i + 1}` });
        comp.stage = 'QF';
      } else if (comp.stage === 'QF' && stageDone(comp, 'QF')) {
        const r = comp.fixtures.filter(f => f.stage === 'QF');
        addFixture(comp, 'SF', 1, winnerOf(r[0]), winnerOf(r[1]), { label: 'Semifinal 1' });
        addFixture(comp, 'SF', 1, winnerOf(r[2]), winnerOf(r[3]), { label: 'Semifinal 2' });
        comp.stage = 'SF';
      }
    }
    if (comp.stage === 'SF' && stageDone(comp, 'SF') && !has(comp, 'F')) {
      const s = comp.fixtures.filter(f => f.stage === 'SF');
      addFixture(comp, 'F', 1, winnerOf(s[0]), winnerOf(s[1]), { label: 'Final' });
      comp.stage = 'F';
    }
    if (comp.stage === 'F' && stageDone(comp, 'F')) {
      const fin = comp.fixtures.find(f => f.stage === 'F');
      comp.status = 'complete';
      comp.finishedAt = new Date().toISOString();
      comp.summary = seasonSummary(db, comp, fin);
    }
  }

  // ---------------- Player of the match / series ----------------
  // Impact score per player for one match (works on saved scorecards)
  //   batting: runs, plus a bonus/penalty for strike rate (par = 7.5 runs an over)
  //   bowling: 22 per wicket, plus a bonus/penalty for economy (par = 8 an over), 4 per maiden
  //   +5 for every player on the winning side (only a tie-breaker; a big losing performance still wins)
  function impactScores(innings, winner) {
    const score = {}, team = {};
    const add = (pid, v) => { score[pid] = (score[pid] || 0) + v; };
    for (const I of innings) {
      for (const b of I.batting) { team[b.pid] = I.team; add(b.pid, b.r + Math.max(-10, Math.min(15, (b.r - b.b * 1.25) * 0.5))); }
      for (const x of I.dnb) { team[x] = I.team; add(x, 0); }
    }
    for (const I of innings) {
      const bowlTeam = innings.map(J => J.team).find(t => t !== I.team) || null;
      for (const w of I.bowling) {
        if (bowlTeam) team[w.pid] = team[w.pid] || bowlTeam;
        add(w.pid, w.w * 22 + (w.balls * 8 / 6 - w.r) * 0.6 + (w.m || 0) * 4);
      }
    }
    if (winner) for (const pid in team) if (team[pid] === winner) add(pid, 5);
    return { score, team };
  }

  // Player of the match always comes from the winning team
  function winnersOnly(imp, winner) {
    if (!winner) return imp;
    const score = {};
    for (const pid in imp.score) if (imp.team[pid] === winner) score[pid] = imp.score[pid];
    return Object.keys(score).length ? { score, team: imp.team } : imp;
  }

  function bestOf({ score, team }) {
    const [pid, val] = Object.entries(score).sort((a, b) => b[1] - a[1])[0] || [];
    return { pid, team: team[pid], score: val };
  }

  // "54 (31) & 2/14 (2)" style figures for one player in one match
  function figuresLine(innings, pid) {
    const parts = [];
    for (const I of innings) {
      const b = I.batting.find(x => x.pid === pid);
      if (b) parts.push(`${b.r}${b.out ? '' : '*'} (${b.b})`);
    }
    for (const I of innings) {
      const w = I.bowling.find(x => x.pid === pid);
      if (w) parts.push(`${w.w}/${w.r} (${oversOf(w.balls)} ov)`);
    }
    return parts.join(' & ') || 'did not bat or bowl';
  }
  const oversOf = balls => `${Math.floor(balls / 6)}${balls % 6 ? '.' + (balls % 6) : ''}`;

  // Same shape as a saved scorecard, built from a live engine match (used for friendlies)
  function inningsOf(match) {
    return match.innings.filter(I => !I.superOver).map(I => {
      const bt = match.teams[I.bat], bw = match.teams[I.bowl];
      const key = (t, i) => t.players[i].pid || `${t.id}:${i}`;
      return {
        team: bt.id,
        batting: I.batters.filter(b => b.batted).map(b => ({ pid: key(bt, b.idx), r: b.runs, b: b.balls, out: !!b.out })),
        dnb: I.batters.filter(b => !b.batted).map(b => key(bt, b.idx)),
        bowling: Object.entries(I.bowlers).map(([i, s]) => ({ pid: key(bw, i), balls: s.balls, r: s.runs, w: s.wkts, m: s.maidens || 0 })),
      };
    });
  }

  // Player of the match for any live match (competition or friendly)
  function playerOfMatch(match) {
    const innings = inningsOf(match);
    const winner = match.result && match.result.winner !== null ? match.teams[match.result.winner].id : null;
    const best = bestOf(winnersOnly(impactScores(innings, winner), winner));
    const t = match.teams.find(x => x.id === best.team);
    const p = t.players.find((pl, i) => (pl.pid || `${t.id}:${i}`) === best.pid);
    return { pid: best.pid, name: p.name, team: t.name, color: t.color, line: figuresLine(innings, best.pid) };
  }

  // Player of the series: highest total impact over the season
  function seriesRace(db, compId) {
    const total = {}, mats = {};
    for (const m of db.matches.filter(x => x.compId === compId)) {
      const { score } = impactScores(m.innings, m.winner);
      for (const pid in score) { total[pid] = (total[pid] || 0) + score[pid]; mats[pid] = (mats[pid] || 0) + 1; }
    }
    const st = competitionStats(db, compId), pm = playerMap(db);
    return Object.entries(total).sort((a, b) => b[1] - a[1]).map(([pid, pts]) => ({
      pid, name: pm[pid] ? pm[pid].name : pid, points: Math.round(pts), mat: mats[pid],
      runs: st[pid] ? st[pid].runs : 0, wkts: st[pid] ? st[pid].wkts : 0, motm: st[pid] ? st[pid].motm : 0,
    }));
  }

  function seasonSummary(db, comp, fin) {
    const pm = playerMap(db);
    const st = competitionStats(db, comp.id);
    const name = id => teamOf(db, comp.kind, id).name;
    const ko = f => ({ id: f.id, label: f.label, home: name(f.home), away: name(f.away), result: f.result.text, score: `${name(f.home)} ${f.result.score[f.home]} · ${name(f.away)} ${f.result.score[f.away]}`, motm: pm[db.matches.find(m => m.id === f.id).motm].name });
    const top = (key, n) => Object.entries(st).sort((a, b) => b[1][key] - a[1][key] || (key === 'wkts' ? a[1].runsConceded - b[1].runsConceded : a[1].balls - b[1].balls)).slice(0, n)
      .map(([pid, s]) => ({ pid, name: pm[pid].name, runs: s.runs, balls: s.balls, wkts: s.wkts, runsConceded: s.runsConceded, mat: s.mat }));
    return {
      champion: name(winnerOf(fin)), runnerUp: name(loserOf(fin)),
      final: ko(fin), semifinals: comp.fixtures.filter(f => f.stage === 'SF').map(ko),
      topRuns: top('runs', 5), topWkts: top('wkts', 5),
      playerOfSeries: seriesRace(db, comp.id)[0] || null,
      ...(comp.kind === 'liga' ? (() => {
        const mv = ligaMoves(db, comp);
        const champs = {};
        for (const d of [1, 2, 3]) {
          const f = comp.fixtures.find(x => x.stage === 'F' && x.div === d && x.result);
          if (f) champs[d] = { champion: name(winnerOf(f)), championId: winnerOf(f), runnerUp: name(loserOf(f)), final: ko(f), tableWinner: name(divTable(db, comp, d)[0].id) };
        }
        return { divChampions: champs, promoted: mv.up.map(name), relegated: mv.down.map(name), moves: mv,
          semifinals: comp.fixtures.filter(f => f.stage === 'SF' && f.div === 1).map(ko) };
      })() : {}),
      ...(comp.format === 'div' ? (() => {
        const d1 = divTable(db, comp, 1).map(r => r.id), d2 = divTable(db, comp, 2).map(r => r.id);
        const mv = divMoves(db, comp);
        const f2 = comp.fixtures.find(f => f.stage === 'F2' && f.result);
        const po = k => { const f = comp.fixtures.find(x => x.stage === 'PO' && x.po === k && x.result); return f ? ko(f) : null; };
        return { promoted: mv.up.map(name), relegated: mv.down.map(name), div2Winner: name(d2[0]), div1TableWinner: name(d1[0]),
          ...(f2 ? { div2Champion: name(winnerOf(f2)), div2RunnerUp: name(loserOf(f2)), div2Final: ko(f2),
            relegationPlayoff: po('x') || po('rel'), promotionPlayoff: po('pro') } : {}) };
      })() : {}),
    };
  }

  // ---------------- Career stats ----------------
  function blank() {
    return { mat: 0, inn: 0, no: 0, runs: 0, balls: 0, f4: 0, s6: 0, hs: 0, hsNo: false, thirties: 0, fifties: 0, hundreds: 0, ducks: 0,
      ballsBowled: 0, runsConceded: 0, wkts: 0, maidens: 0, dots: 0, bestW: 0, bestR: 0, fourW: 0, motm: 0, pos: 0 };
  }
  function addMatch(stats, m, pid) {
    let played = false;
    for (const I of m.innings) {
      const b = I.batting.find(x => x.pid === pid);
      if (b) {
        played = true;
        stats.inn++; stats.runs += b.r; stats.balls += b.b; stats.f4 += b.f4; stats.s6 += b.s6;
        if (!b.out) stats.no++;
        if (b.r > stats.hs || (b.r === stats.hs && !b.out)) { stats.hs = b.r; stats.hsNo = !b.out; }
        if (b.r >= 100) stats.hundreds++; else if (b.r >= 50) stats.fifties++; else if (b.r >= 30) stats.thirties++;
        if (b.r === 0 && b.out) stats.ducks++;
      }
      if (I.dnb.includes(pid)) played = true;
      const w = I.bowling.find(x => x.pid === pid);
      if (w) {
        played = true;
        stats.ballsBowled += w.balls; stats.runsConceded += w.r; stats.wkts += w.w; stats.maidens += w.m; stats.dots += w.dots;
        if (w.w > stats.bestW || (w.w === stats.bestW && w.r < stats.bestR)) { stats.bestW = w.w; stats.bestR = w.r; }
        if (w.w >= 4) stats.fourW++;
      }
    }
    if (played) { stats.mat++; if (m.motm === pid) stats.motm++; }
  }

  function computeStats(db) {
    const out = {};
    for (const p of db.players) out[p.id] = { name: p.name, all: blank(), league: blank(), liga: blank(), cup: blank() };
    for (const m of db.matches) {
      const pids = new Set();
      for (const I of m.innings) { I.batting.forEach(b => pids.add(b.pid)); I.dnb.forEach(x => pids.add(x)); I.bowling.forEach(b => pids.add(b.pid)); }
      for (const pid of pids) { if (!out[pid]) continue; addMatch(out[pid].all, m, pid); if (out[pid][m.comp]) addMatch(out[pid][m.comp], m, pid); }
    }
    // Player of the series awards
    for (const comp of db.competitions || []) {
      const pos = comp.summary && comp.summary.playerOfSeries;
      if (pos && out[pos.pid]) { out[pos.pid].all.pos++; if (out[pos.pid][comp.kind]) out[pos.pid][comp.kind].pos++; }
    }
    return out;
  }

  function competitionStats(db, compId) {
    const out = {};
    for (const m of db.matches.filter(x => x.compId === compId)) {
      const pids = new Set();
      for (const I of m.innings) { I.batting.forEach(b => pids.add(b.pid)); I.dnb.forEach(x => pids.add(x)); I.bowling.forEach(b => pids.add(b.pid)); }
      for (const pid of pids) { out[pid] = out[pid] || blank(); addMatch(out[pid], m, pid); }
    }
    return out;
  }

  // ---------------- Simulation ----------------
  // A bowler's 2nd over costs this many rating points (tuned so Städtepokal scores stay around 61–65)
  const SECOND_OVER_PENALTY = 30;

  function buildMatch(db, comp, f) {
    const teams = [engineTeam(db, comp.kind, f.home, comp), engineTeam(db, comp.kind, f.away, comp)];
    // openers don't bowl, so the other players may need a second over (Städtepokal: 4 bowlers, 6 overs)
    const bowlers = Math.min(...teams.map(t => t.players.filter(p => !p.noBowl).length));
    const maxOv = Math.max(comp.maxOversPerBowler || 1, Math.ceil(comp.overs / Math.max(2, bowlers)));
    return E.createMatch({
      overs: comp.overs, maxOversPerBowler: maxOv, maxBallsPerBatter: comp.maxBallsPerBatter || null, pitch: f.pitch,
      lastManStands: true,   // competitions: the last batter bats on alone
      secondOverPenalty: maxOv > 1 ? SECOND_OVER_PENALTY : 0,   // Städtepokal: a 2nd over is bowled tired
      teams,
    });
  }

  function simulateFixture(db, comp, f) {
    const m = buildMatch(db, comp, f);
    const toss = E.doToss(m, Math.random() < 0.5 ? 'heads' : 'tails');
    const choice = E.cpuTossDecision(m, toss.winner);
    E.startInnings(m, choice === 'bat' ? toss.winner : 1 - toss.winner);
    // both innings, plus Super Overs if the scores are level
    do {
      const inn = E.cur(m);
      let guard = 0;
      while (!inn.done && guard++ < 1000) {
        if (E.needsBowler(m)) E.setBowler(m, E.cpuChooseBowler(m));
        E.bowlBall(m, E.cpuBatMode(m), E.cpuBowlPlan(m));
      }
    } while (E.startNextInnings(m));
    return m;
  }

  function pendingFixtures(comp) { return comp.fixtures.filter(f => !f.result); }

  function fmtStats(s) {
    const avg = s.inn - s.no > 0 ? s.runs / (s.inn - s.no) : null;
    return {
      ...s,
      avg: avg === null ? '–' : avg.toFixed(1),
      sr: s.balls ? (s.runs * 100 / s.balls).toFixed(1) : '–',
      econ: s.ballsBowled ? (s.runsConceded * 6 / s.ballsBowled).toFixed(2) : '–',
      overs: `${Math.floor(s.ballsBowled / 6)}${s.ballsBowled % 6 ? '.' + (s.ballsBowled % 6) : ''}`,
      best: s.ballsBowled ? `${s.bestW}/${s.bestR}` : '–',
      hsText: s.inn ? `${s.hs}${s.hsNo ? '*' : ''}` : '–',
      bowlAvg: s.wkts ? (s.runsConceded / s.wkts).toFixed(1) : '–',
    };
  }

  const api = {
    GIVEN_NAMES, WRESTLERS, STATES, CITIES, COMPS, STAGE_LABEL,
    buildWorld, newDB, playerMap, teamOf, activeComp, lastComp, engineTeam,
    startCompetition, leagueTable, divTable, divisionsFor, divMoves, upgradeLeaguePlayoffs, cancelSeason, groupTable, round2Table, recordMatch, computeStats, competitionStats, migrate, refreshEmptyOldSeason, squadsFor, RETIRED_CITIES, planTransfers, applyTransfers, draftRatings, renamePlayer,
    teamsOf, clubEra, leagueKind, ligaClubs, ligaDivisions, ligaMoves, cupRanking, clubOrder, startClubSeason, clubSeasonComps, combinedRace, seasonDone, LIGA_CLUBS,
    buildMatch, simulateFixture, pendingFixtures, fmtStats,
    impactScores, playerOfMatch, seriesRace, figuresLine, formMap, formOf, raceFor, seasonRecords,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CricketComp = api;
})(typeof window !== 'undefined' ? window : globalThis);
