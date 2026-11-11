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

  const COMPS = {
    league: { name: 'Länderliga', overs: 5, maxOversPerBowler: 1, squad: 7, kind: 'league' },
    cup: { name: 'Städtepokal', overs: 6, maxOversPerBowler: 1, maxBallsPerBatter: 12, squad: 6, kind: 'cup', format: 'v2' },
  };
  const STAGE_LABEL = { league: 'League', group: 'Group stage', R2: 'Second round', R16: 'Round of 16', QF: 'Quarterfinal', SF: 'Semifinal', F: 'Final' };
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
    const comp = db.competitions.find(c => c.kind === 'cup' && c.status !== 'complete');
    if (!comp || comp.format === 'v2' || comp.fixtures.some(f => f.result)) return false;
    db.competitions = db.competitions.filter(c => c !== comp);
    startCompetition(db, 'cup');
    return true;
  }

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
  function teamOf(db, kind, id) {
    return db.teams[kind].find(t => t.id === id) || (kind === 'cup' && db.teams.cupV1 ? db.teams.cupV1.find(t => t.id === id) : undefined);
  }
  // Squads a season was played with: seasons started before v2 keep the old 24-city squads
  function squadsFor(db, comp) {
    if (comp && comp.squads) {
      // each season remembers the squads it was played with
      const base = comp.kind === 'cup' && comp.format !== 'v2' && db.teams.cupV1 ? db.teams.cupV1 : db.teams[comp.kind];
      return base.filter(t => comp.squads[t.id]).map(t => ({ ...t, players: comp.squads[t.id].slice() }));
    }
    return comp && comp.kind === 'cup' && comp.format !== 'v2' && db.teams.cupV1 ? db.teams.cupV1 : db.teams[comp ? comp.kind : 'league'];
  }
  const snapshotSquads = teams => Object.fromEntries(teams.map(t => [t.id, t.players.slice()]));

  // ---------------- Transfers between seasons ----------------
  // Every team keeps its 3 best performers of last season (by Player of the Series points);
  // everyone else goes into a pool, and the open spots are filled by a "random but balanced"
  // draft: the pool is ranked by rating plus a big random factor, and teams pick in snake
  // order, weakest kept trio first.
  const KEEP = 3;
  function planTransfers(db, kind, seed) {
    const last = lastComp(db, kind);
    if (!last || last.status !== 'complete') return null;
    const r = rng(seed || (Date.now() % 1e6) + 17);
    const pm = playerMap(db);
    const ovr = pid => pm[pid].bat + pm[pid].bowl;
    const points = {};
    for (const x of seriesRace(db, last.id)) points[x.pid] = x.points;
    const teams = db.teams[kind];
    const squadSize = COMPS[kind].squad;
    const plan = teams.map(t => {
      const ranked = t.players.slice().sort((a, b) => (points[b] || 0) - (points[a] || 0) || ovr(b) - ovr(a));
      return { id: t.id, kept: ranked.slice(0, KEEP), released: ranked.slice(KEEP), signed: [] };
    });
    const taken = new Set(plan.flatMap(t => t.kept));
    const pool = shuffle(db.players.map(p => p.id).filter(pid => !taken.has(pid)), r)
      .map(pid => ({ pid, score: ovr(pid) + (r() - 0.5) * 40 }))
      .sort((a, b) => b.score - a.score);
    const strength = t => t.kept.concat(t.signed).reduce((s, pid) => s + ovr(pid), 0);
    for (let round = 0; round < squadSize - KEEP; round++) {
      const order = plan.slice().sort((a, b) => strength(a) - strength(b));
      if (round % 2) order.reverse();
      for (const t of order) { const pick = pool.shift(); if (pick) t.signed.push(pick.pid); }
    }
    const was = {};
    for (const t of teams) for (const pid of t.players) was[pid] = t.id;
    return {
      kind, fromSeason: last.season, toSeason: last.season + 1, points,
      teams: plan.map(t => ({ ...t, signed: t.signed.map(pid => ({ pid, from: was[pid] || null })) })),
      unsigned: pool.map(x => x.pid),
    };
  }

  function applyTransfers(db, plan) {
    const kind = plan.kind;
    // seasons played before squads were remembered keep the squads they used
    for (const c of db.competitions) if (c.kind === kind && !c.squads && !(kind === 'cup' && c.format !== 'v2')) c.squads = snapshotSquads(db.teams[kind]);
    const pm = playerMap(db);
    for (const t of plan.teams) {
      const team = db.teams[kind].find(x => x.id === t.id);
      team.players = t.kept.concat(t.signed.map(s => s.pid));
    }
    for (const p of db.players) {
      const t = db.teams[kind].find(x => x.players.includes(p.id));
      if (kind === 'league') p.state = t ? t.id : null; else p.city = t ? t.id : p.city;
    }
    const comp = startCompetition(db, kind);
    comp.transfers = { fromSeason: plan.fromSeason, teams: plan.teams, unsigned: plan.unsigned };
    return comp;
  }
  function activeComp(db, kind) { return db.competitions.find(c => c.kind === kind && c.status !== 'complete'); }
  function lastComp(db, kind) { const l = db.competitions.filter(c => c.kind === kind); return l[l.length - 1]; }

  // Squad in batting order, shaped for the engine
  function engineTeam(db, kind, id, comp) {
    const t = (comp ? squadsFor(db, comp).find(x => x.id === id) : null) || teamOf(db, kind, id), pm = playerMap(db);
    const players = t.players.map(pid => pm[pid]).sort((a, b) => b.bat - a.bat)
      .map(p => ({ pid: p.id, name: p.name, bat: p.bat, bowl: p.bowl, type: p.type }));
    return { id: t.id, name: t.name, short: t.short, color: t.color, players };
  }

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
      id: `${kind}-s${season}`, kind, name: cfg.name, season, status: 'active', stage: kind === 'league' ? 'league' : 'group',
      overs: cfg.overs, maxOversPerBowler: cfg.maxOversPerBowler, maxBallsPerBatter: cfg.maxBallsPerBatter || null,
      format: cfg.format || null, startedAt: new Date().toISOString(),
      fixtures: [], groups: null, summary: null,
      squads: snapshotSquads(kind === 'cup' && cfg.format !== 'v2' && db.teams.cupV1 ? db.teams.cupV1 : db.teams[kind]),
    };
    let n = 0;
    const fx = (stage, round, home, away, extra) => ({ id: `${comp.id}-m${++n}`, stage, round, home, away, pitch: pickPitch(r), matchId: null, result: null, ...(extra || {}) });
    if (kind === 'league') {
      const ids = shuffle(db.teams.league.map(t => t.id), r);
      roundRobin(ids).forEach((games, ri) => games.forEach(([a, b]) => comp.fixtures.push(fx('league', ri + 1, a, b))));
    } else {
      // 5 groups of 4, everyone plays everyone in the group (6 matches per group)
      const ids = shuffle(db.teams.cup.map(t => t.id), r);
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
  const groupTable = (db, comp, g) => table(db, comp, comp.groups[g], f => f.stage === 'group' && f.group === g);
  const round2Table = (db, comp, g) => table(db, comp, comp.groups2[g], f => f.stage === 'R2' && f.group === g);

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
    const motm = bestOf(impactScores(innings, winner)).pid;

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
    if (comp.kind === 'league') {
      if (comp.stage === 'league' && stageDone(comp, 'league')) {
        const t = leagueTable(db, comp);
        addFixture(comp, 'SF', 1, t[0].id, t[3].id, { label: 'Semifinal 1 (1st v 4th)' });
        addFixture(comp, 'SF', 1, t[1].id, t[2].id, { label: 'Semifinal 2 (2nd v 3rd)' });
        comp.stage = 'SF';
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
    const best = bestOf(impactScores(innings, winner));
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
    for (const p of db.players) out[p.id] = { name: p.name, all: blank(), league: blank(), cup: blank() };
    for (const m of db.matches) {
      const pids = new Set();
      for (const I of m.innings) { I.batting.forEach(b => pids.add(b.pid)); I.dnb.forEach(x => pids.add(x)); I.bowling.forEach(b => pids.add(b.pid)); }
      for (const pid of pids) { if (!out[pid]) continue; addMatch(out[pid].all, m, pid); addMatch(out[pid][m.comp], m, pid); }
    }
    // Player of the series awards
    for (const comp of db.competitions || []) {
      const pos = comp.summary && comp.summary.playerOfSeries;
      if (pos && out[pos.pid]) { out[pos.pid].all.pos++; out[pos.pid][comp.kind].pos++; }
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
  function buildMatch(db, comp, f) {
    return E.createMatch({
      overs: comp.overs, maxOversPerBowler: comp.maxOversPerBowler, maxBallsPerBatter: comp.maxBallsPerBatter || null, pitch: f.pitch,
      teams: [engineTeam(db, comp.kind, f.home, comp), engineTeam(db, comp.kind, f.away, comp)],
    });
  }

  function simulateFixture(db, comp, f) {
    const m = buildMatch(db, comp, f);
    const toss = E.doToss(m, Math.random() < 0.5 ? 'heads' : 'tails');
    const choice = E.cpuTossDecision(m);
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
    startCompetition, leagueTable, groupTable, round2Table, recordMatch, computeStats, competitionStats, migrate, refreshEmptyOldSeason, squadsFor, RETIRED_CITIES, planTransfers, applyTransfers, renamePlayer,
    buildMatch, simulateFixture, pendingFixtures, fmtStats,
    impactScores, playerOfMatch, seriesRace, figuresLine,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CricketComp = api;
})(typeof window !== 'undefined' ? window : globalThis);
