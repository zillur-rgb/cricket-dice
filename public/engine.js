/* Cricket Dice — match engine
 * Each delivery is resolved from a weighted probability table instead of a
 * flat 1–6 die. The table shifts with batting intent, bowling plan, player
 * skill, how "set" the batter is, match phase and pitch.
 * Works in the browser (window.CricketEngine) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  // ---------- Base tables (per legal ball, roughly percentages) ----------
  const BAT_TABLES = {
    defend: { 0: 35, 1: 52, 2: 6.5, 3: 0.5, 4: 4.5, 6: 0.5, W: 1.2 },
    normal: { 0: 30, 1: 41, 2: 8.5, 3: 1, 4: 12, 6: 4.1, W: 3.4 },
    attack: { 0: 25, 1: 31, 2: 7, 3: 0.5, 4: 17, 6: 12.5, W: 6.8 },
  };

  const BOWL_PLANS = {
    tight:  { mult: { 0: 1.12, 1: 1.08, 4: 0.75, 6: 0.65, W: 0.75 }, wide: 0.7, nb: 0.8 },
    normal: { mult: {}, wide: 1, nb: 1 },
    attack: { mult: { 0: 0.95, 4: 1.2, 6: 1.2, W: 1.35 }, wide: 1.4, nb: 1.5 },
  };

  // How much player ratings matter (see ballProbabilities)
  const SKILL = {
    bowlMid: 62, bowlSpread: 20, batMid: 58, batSpread: 22,
    b4: 0.42, b6: 0.55, b0: 0.18, bW: 0.45, bX: 0.35,   // bowler effects
    a4: 0.28, a6: 0.38, a0: 0.12, aW: 0.40,             // batter effects
  };

  const BASE_WIDE = 0.03;   // 3% of deliveries are wides at "normal"
  const BASE_NOBALL = 0.007;

  const PITCHES = {
    balanced: { label: 'Balanced', note: 'Fair contest between bat and ball' },
    flat:     { label: 'Flat road', note: 'Batting paradise — fewer wickets, more boundaries' },
    green:    { label: 'Green top', note: 'Seam movement — pacers take more wickets' },
    dusty:    { label: 'Dusty turner', note: 'Grip and turn — spinners rule' },
  };

  const OUTCOME_KEYS = ['0', '1', '2', '3', '4', '6', 'W'];

  // ---------- Random helpers (seedable for testing) ----------
  let rand = Math.random;
  function setRandom(fn) { rand = fn || Math.random; }
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pickWeighted(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = rand() * total;
    for (const [k, w] of entries) { r -= w; if (r < 0) return k; }
    return entries[entries.length - 1][0];
  }
  function pickOne(arr) { return arr[Math.floor(rand() * arr.length)]; }

  // ---------- Teams ----------
  // p(name, bat, bowl, type) — type: 'pace' | 'spin' | null (doesn't bowl)
  function p(name, bat, bowl, type) { return { name, bat, bowl, type }; }

  const PRESET_TEAMS = [
    {
      id: 'hawks', name: 'Harbour Hawks', short: 'HAW', color: '#e8a33d',
      players: [
        p('R. Kalani', 82, 20, null), p('D. Mercer', 78, 20, null), p('S. Haider', 85, 35, 'spin'),
        p('J. Okafor', 76, 30, null), p('T. Lindqvist', 70, 55, 'pace'), p('M. Fernando', 64, 60, 'spin'),
        p('A. Rowe (wk)', 66, 10, null), p('K. Banda', 40, 74, 'pace'), p('Imran Qadir', 28, 78, 'spin'),
        p('L. Dupree', 22, 80, 'pace'), p('N. Tawhiri', 15, 83, 'pace'),
      ],
    },
    {
      id: 'falcons', name: 'Desert Falcons', short: 'FAL', color: '#d4573b',
      players: [
        p('Z. Hamdan', 80, 20, null), p('P. Iyer', 83, 25, null), p('C. Vos', 79, 20, null),
        p('B. Achterberg', 72, 50, 'pace'), p('Y. Siddiqui', 68, 66, 'spin'), p('O. Mensah (wk)', 70, 10, null),
        p('F. Rahimi', 58, 62, 'pace'), p('E. Castell', 35, 77, 'spin'), p('H. Nakamura', 25, 79, 'pace'),
        p('G. Pillai', 20, 76, 'spin'), p('W. Dlamini', 12, 84, 'pace'),
      ],
    },
    {
      id: 'kings', name: 'Monsoon Kings', short: 'MON', color: '#3d8fd4',
      players: [
        p('A. Chowdhury', 84, 20, null), p('T. Brennan', 77, 20, null), p('V. Rao', 81, 40, 'spin'),
        p('M. Kowalczyk', 74, 20, null), p('S. Ndlovu', 69, 63, 'pace'), p('R. Saxena (wk)', 65, 10, null),
        p('J. Ferreira', 60, 58, 'spin'), p('K. Hossain', 38, 80, 'spin'), p('D. Whitfield', 30, 76, 'pace'),
        p('U. Afridi', 18, 82, 'pace'), p('L. Moana', 14, 78, 'pace'),
      ],
    },
    {
      id: 'lions', name: 'Highland Lions', short: 'LIO', color: '#57b36a',
      players: [
        p('E. Sinclair', 79, 20, null), p('N. Bhatt', 81, 20, null), p('I. Novak', 77, 30, null),
        p('C. Adeyemi', 80, 45, 'pace'), p('F. Quinlan (wk)', 67, 10, null), p('H. Tanaka', 66, 61, 'spin'),
        p('O. Reyes', 55, 64, 'pace'), p('M. Abbasi', 36, 79, 'spin'), p('P. Gallagher', 27, 80, 'pace'),
        p('S. Mahlangu', 19, 77, 'pace'), p('B. Kerr', 13, 81, 'spin'),
      ],
    },
  ];

  function cloneTeam(t, skillShift) {
    const s = skillShift || 0;
    return {
      ...t,
      players: t.players.map(pl => ({
        ...pl,
        bat: clamp(pl.bat + s, 5, 99),
        bowl: pl.type ? clamp(pl.bowl + s, 5, 99) : pl.bowl,
      })),
    };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- Match setup ----------
  function createMatch(cfg) {
    const overs = cfg.overs || 20;
    // Two teams, both controlled by the player (hot-seat)
    // cfg.teams lets a competition pass its own squads; otherwise use presets
    const teamA = cfg.teams ? cloneTeam(cfg.teams[0], 0) : cloneTeam(PRESET_TEAMS.find(t => t.id === cfg.teamAId) || PRESET_TEAMS[0], 0);
    const teamB = cfg.teams ? cloneTeam(cfg.teams[1], 0) : cloneTeam(PRESET_TEAMS.find(t => t.id === cfg.teamBId) || PRESET_TEAMS[1], 0);
    return {
      overs,
      maxOversPerBowler: cfg.maxOversPerBowler || Math.max(1, Math.ceil(overs / 5)),
      maxBallsPerBatter: cfg.maxBallsPerBatter || null,   // batter retires (not out) after this many balls
      lastManStands: !!cfg.lastManStands,                 // the last batter may bat on alone
      pitch: cfg.pitch || 'balanced',
      teams: [teamA, teamB],
      innings: [],
      currentInnings: -1,
      result: null,
      toss: null,
    };
  }

  function doToss(match, userCall) {
    const coin = rand() < 0.5 ? 'heads' : 'tails';
    const userWon = coin === userCall;
    match.toss = { coin, winner: userWon ? 0 : 1 };
    return match.toss;
  }

  // The toss winner decides from the pitch and its own squad. Returns 'bat' or 'bowl'
  // (cpuTossDecision) or { choice, reason } (tossDecision).
  function tossDecision(match, winnerIdx) {
    const w = winnerIdx === undefined ? (match.toss ? match.toss.winner : 0) : winnerIdx;
    const ps = match.teams[w].players;
    const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
    const top = (key, n, f) => avg(ps.filter(f || (() => true)).map(p => p[key]).sort((a, b) => b - a).slice(0, n));
    const nBowl = Math.min(match.maxOversPerBowler ? Math.ceil(match.overs / match.maxOversPerBowler) : 4, ps.length);
    const batQ = top('bat', 4), bowlQ = top('bowl', nBowl, p => p.type);
    const pace = ps.filter(p => p.type === 'pace').length, spin = ps.filter(p => p.type === 'spin').length;
    switch (match.pitch) {
      case 'green':
        if (pace >= 2) return { choice: 'bowl', reason: `Green top: ${pace} seamers get first use of the moisture` };
        return { choice: 'bat', reason: 'Green top, but only one seamer in the side, so they bat first' };
      case 'dusty':
        if (spin >= 2) return { choice: 'bat', reason: `Dusty turner: bat now, then let ${spin} spinners use it as it wears` };
        return { choice: 'bat', reason: 'Dusty turner: bat first before the ball starts to grip' };
      case 'flat':
        return { choice: 'bowl', reason: 'Flat road: no total is safe here, so they chase' };
      default:
        if (batQ - bowlQ > 6) return { choice: 'bat', reason: 'Good pitch and a strong batting line-up: set a big total' };
        if (bowlQ - batQ > 6) return { choice: 'bowl', reason: 'Good pitch and a strong bowling attack: bowl first and chase' };
        return { choice: 'bowl', reason: 'Good pitch, balanced side: chase and know the target' };
    }
  }
  function cpuTossDecision(match, winnerIdx) { return tossDecision(match, winnerIdx).choice; }

  // overs in this innings: 1 in a Super Over, otherwise the match length
  function ovs(match, inn) { return inn && inn.superOver ? 1 : match.overs; }

  function startInnings(match, battingTeamIdx, opts) {
    const so = (opts && opts.superOver) || 0;
    const players = match.teams[battingTeamIdx].players;
    // Batting order: normal order, or the 3 best batters in a Super Over
    const order = so
      ? players.map((p, i) => i).sort((a, b) => players[b].bat - players[a].bat).slice(0, Math.min(3, players.length))
      : players.map((p, i) => i);
    const prev = match.innings[match.innings.length - 1];
    let target = null;
    if (!so && match.innings.length === 1) target = match.innings[0].runs + 1;
    if (so && prev && prev.superOver === so) target = prev.runs + 1;
    const inn = {
      superOver: so, order,
      bat: battingTeamIdx,
      bowl: 1 - battingTeamIdx,
      runs: 0, wkts: 0, balls: 0,
      extras: { wd: 0, nb: 0 },
      batters: match.teams[battingTeamIdx].players.map((_, i) => ({ idx: i, runs: 0, balls: 0, fours: 0, sixes: 0, out: null, batted: false })),
      striker: order[0], nonStriker: order[1], nextIn: 2,
      bowlers: {},            // idx -> { balls, runs, wkts, dots }
      bowler: null, lastOverBowler: null,
      overLog: [],            // per over: array of short tokens
      log: [],                // commentary events
      fow: [],
      partnership: { runs: 0, balls: 0 },
      freeHit: false,
      target,
      done: false,
    };
    inn.batters[order[0]].batted = true; inn.batters[order[1]].batted = true;
    match.innings.push(inn);
    match.currentInnings = match.innings.length - 1;
    return inn;
  }

  function cur(match) { return match.innings[match.currentInnings]; }

  // ---------- Bowling selection ----------
  function eligibleBowlers(match) {
    const inn = cur(match);
    const team = match.teams[inn.bowl];
    const all = team.players
      .map((pl, i) => ({ ...pl, idx: i, overs: Math.floor(((inn.bowlers[i] || {}).balls || 0) / 6) }));
    const regular = all.filter(b => b.type && b.idx !== inn.lastOverBowler && b.overs < match.maxOversPerBowler);
    // Only offer bowlers that still let the innings be finished without anyone
    // bowling two overs in a row or going over their limit
    const oversLeft = ovs(match, inn) - Math.floor(inn.balls / 6);
    const caps = {};
    for (const b of all) if (b.type) caps[b.idx] = match.maxOversPerBowler - b.overs;
    const safe = regular.filter(b => canFinish({ ...caps, [b.idx]: caps[b.idx] - 1 }, b.idx, oversLeft - 1));
    if (safe.length) return safe;
    if (regular.length) return regular;
    // Nobody left with overs: bring on part-timers so the game never gets stuck
    const part = all.filter(b => !b.type && b.idx !== inn.lastOverBowler).map(b => ({ ...b, partTime: true }));
    if (part.length) return part;
    // Last resort: anyone fit to bowl except the previous over's bowler
    return all.filter(b => b.idx !== inn.lastOverBowler).map(b => ({ ...b, extraOver: true }));
  }

  // Greedy check: always give the next over to whoever has the most overs left
  // (excluding the previous bowler). This is optimal for "no two in a row".
  function canFinish(caps, last, remaining) {
    const left = { ...caps };
    let prev = last;
    for (let k = 0; k < remaining; k++) {
      let best = null;
      for (const id in left) if (String(id) !== String(prev) && left[id] > 0 && (best === null || left[id] > left[best])) best = id;
      if (best === null) return false;
      left[best]--; prev = best;
    }
    return true;
  }

  function needsBowler(match) {
    const inn = cur(match);
    return !inn.done && inn.bowler === null;
  }

  function setBowler(match, idx) {
    const inn = cur(match);
    inn.bowler = idx;
    if (!inn.bowlers[idx]) inn.bowlers[idx] = { balls: 0, runs: 0, wkts: 0, dots: 0, wides: 0, nbs: 0, maidens: 0, fours: 0, sixes: 0 };
    inn.bowlers[idx].overStartRuns = inn.bowlers[idx].runs;
    if (inn.bowlers[idx].order === undefined) inn.bowlers[idx].order = Object.keys(inn.bowlers).length;
    inn.overLog.push([]);
  }

  function cpuChooseBowler(match) {
    const options = eligibleBowlers(match);
    const inn = cur(match);
    const overNo = Math.floor(inn.balls / 6);
    const death = overNo >= ovs(match, inn) * 0.8;
    const pp = overNo < ovs(match, inn) * 0.3;
    // Score each bowler: skill + pitch fit + phase fit; keep best bowler overs for death
    let best = null, bestScore = -Infinity;
    for (const b of options) {
      let s = b.bowl + rand() * 10;
      if (match.pitch === 'dusty' && b.type === 'spin') s += 8;
      if (match.pitch === 'green' && b.type === 'pace') s += 8;
      if ((pp || death) && b.type === 'pace') s += 4;
      const remaining = match.maxOversPerBowler - b.overs;
      const oversLeft = ovs(match, inn) - overNo;
      // save top bowlers for the end unless we must use them
      if (!death && b.bowl >= 78 && remaining <= 1 && oversLeft > 3) s -= 12;
      if (s > bestScore) { bestScore = s; best = b; }
    }
    if (!best) { // fallback: anyone who isn't the last bowler
      const team = match.teams[inn.bowl];
      const i = team.players.findIndex((_, k) => k !== inn.lastOverBowler);
      return i;
    }
    return best.idx;
  }

  // ---------- Probability model ----------
  function phaseOf(match, inn) {
    if (inn.superOver) return 'death';
    const overNo = Math.floor(inn.balls / 6);
    // Short formats: the first 2 overs are the powerplay, the last 2 overs the death
    if (match.overs <= 10) return overNo < 2 ? 'powerplay' : overNo >= match.overs - 2 ? 'death' : 'middle';
    if (overNo < Math.max(1, Math.round(match.overs * 0.3))) return 'powerplay';
    if (overNo >= Math.floor(match.overs * 0.8)) return 'death';
    return 'middle';
  }

  function ballProbabilities(match, batMode, bowlPlan) {
    const inn = cur(match);
    const batTeam = match.teams[inn.bat], bowlTeam = match.teams[inn.bowl];
    const batter = batTeam.players[inn.striker];
    const bstat = inn.batters[inn.striker];
    const bowler = bowlTeam.players[inn.bowler];
    const w = { ...BAT_TABLES[batMode] };
    const mul = (k, f) => { w[k] *= f; };

    // Bowling plan
    const plan = BOWL_PLANS[bowlPlan];
    for (const k in plan.mult) mul(k, plan.mult[k]);

    // Skill: the bowler's own quality and the batter's own quality each count.
    // q > 0 = better than average. Tuned so a weak bowler (~40) goes for ~12–13 an over
    // and a top one (~85) for ~7.5–8, without changing the average team score.
    const bq = (bowler.bowl - SKILL.bowlMid) / SKILL.bowlSpread;
    const aq = (batter.bat - SKILL.batMid) / SKILL.batSpread;
    mul('4', Math.exp(-SKILL.b4 * bq + SKILL.a4 * aq));
    mul('6', Math.exp(-SKILL.b6 * bq + SKILL.a6 * aq));
    mul('0', Math.exp(SKILL.b0 * bq - SKILL.a0 * aq));
    mul('W', Math.exp(SKILL.bW * bq - SKILL.aW * aq));

    // Getting set
    if (bstat.balls < 2) { mul('W', 1.35); mul('4', 0.8); mul('6', 0.75); }
    else if (bstat.balls >= 10) { mul('W', 0.85); mul('4', 1.1); mul('6', 1.1); }

    // Phase
    const phase = phaseOf(match, inn);
    if (phase === 'powerplay') { mul('4', 1.15); }
    if (phase === 'death') { mul('6', 1.2); mul('4', 1.1); mul('W', 1.1); }

    // Pitch
    const pt = match.pitch, ty = bowler.type;
    if (pt === 'flat') { mul('W', 0.85); mul('4', 1.12); mul('6', 1.12); }
    if (pt === 'green') { if (ty === 'pace') { mul('W', 1.3); mul('4', 0.9); } else mul('W', 0.9); }
    if (pt === 'dusty') { if (ty === 'spin') { mul('W', 1.35); mul('0', 1.1); } else mul('W', 0.95); }

    // Free hit: can only be run out
    // Free hit: a fixed table, whoever is batting or bowling. A wicket can only be a run-out.
    if (inn.freeHit) Object.assign(w, { 0: 15, 1: 20, 2: 0, 3: 0, 4: 30, 6: 30, W: 5 });

    const total = OUTCOME_KEYS.reduce((s, k) => s + w[k], 0);
    const probs = {};
    for (const k of OUTCOME_KEYS) probs[k] = w[k] / total;

    const sloppy = Math.exp(-SKILL.bX * bq);    // weaker bowlers bowl more wides and no-balls
    const wideP = BASE_WIDE * plan.wide * (ty === 'spin' ? 0.6 : 1) * sloppy;
    const nbP = BASE_NOBALL * plan.nb * (ty === 'spin' ? 0.3 : 1) * sloppy;
    return { legal: probs, wideP, nbP, phase };
  }

  // ---------- Dismissals ----------
  function pickDismissal(match, batMode, freeHit) {
    const inn = cur(match);
    const bowler = match.teams[inn.bowl].players[inn.bowler];
    if (freeHit) return 'run out';
    const w = { caught: 52, bowled: 18, lbw: 15, 'run out': 6, stumped: bowler.type === 'spin' ? 7 : 0, 'caught behind': bowler.type === 'pace' ? 10 : 3 };
    if (batMode === 'attack') { w.caught *= 1.35; w.stumped *= 1.5; w.lbw *= 0.7; }
    if (batMode === 'defend') { w.caught *= 0.7; w.lbw *= 1.3; w.bowled *= 1.2; w['run out'] *= 0.6; }
    return pickWeighted(w);
  }

  function fielderName(match, excludeIdx) {
    const team = match.teams[cur(match).bowl];
    const others = team.players.filter((_, i) => i !== excludeIdx);
    return pickOne(others).name;
  }

  // ---------- Commentary ----------
  const LINES = {
    '0': ['Defended solidly back to the bowler.', 'Beaten outside off! Dot ball.', 'Straight to cover. No run.', 'Left alone outside off.', 'Good length, blocked.'],
    '1': ['Worked off the pads for a single.', 'Pushed into the gap, quick single.', 'Dabbed to third man for one.', 'Tapped to mid-on and they scamper through.'],
    '2': ['Driven into the gap, they come back for two.', 'Clipped to deep square, comfortable couple.', 'Good running — two runs.'],
    '3': ['Chased down just inside the rope — three!', 'Superb running, three taken.'],
    '4': ['FOUR! Cracking cover drive.', 'FOUR! Pulled away behind square.', 'FOUR! Edged and it races to the fence.', 'FOUR! Lofted over mid-off.', 'FOUR! Flicked through midwicket.'],
    '6': ['SIX! Launched over long-on!', 'SIX! Into the stands at deep midwicket!', 'SIX! Cleared the rope with ease.', 'SIX! Reverse-swept for maximum!'],
    'WD': ['Wide, down the leg side.', 'Wide — too far outside off.'],
    'NB': ['No-ball! Overstepped. Free hit coming up.'],
  };

  function dismissalText(how, bowlerName, fielder) {
    switch (how) {
      case 'caught': return `c ${fielder} b ${bowlerName}`;
      case 'caught behind': return `c †keeper b ${bowlerName}`;
      case 'bowled': return `b ${bowlerName}`;
      case 'lbw': return `lbw b ${bowlerName}`;
      case 'stumped': return `st †keeper b ${bowlerName}`;
      case 'run out': return `run out (${fielder})`;
      default: return how;
    }
  }

  // ---------- Bowl one delivery ----------
  function bowlBall(match, batMode, bowlPlan) {
    const inn = cur(match);
    if (inn.done) throw new Error('Innings over');
    if (inn.bowler === null) throw new Error('Choose a bowler first');

    const batTeam = match.teams[inn.bat], bowlTeam = match.teams[inn.bowl];
    const bowlerP = bowlTeam.players[inn.bowler];
    const bw = inn.bowlers[inn.bowler];
    const st = inn.batters[inn.striker];
    const strikerName = batTeam.players[inn.striker].name;
    const { legal, wideP, nbP, phase } = ballProbabilities(match, batMode, bowlPlan);
    const overNum = Math.floor(inn.balls / 6);
    const ballInOver = (inn.balls % 6) + 1;
    const ev = {
      over: overNum, ball: ballInOver, batter: strikerName, bowler: bowlerP.name,
      batMode, bowlPlan, probs: legal, phase, freeHit: inn.freeHit, roll: rand(),
    };
    const tokens = inn.overLog[inn.overLog.length - 1];

    // Extras first
    const xr = rand();
    if (xr < wideP) {
      inn.runs += 1; inn.extras.wd += 1; bw.runs += 1; bw.wides += 1; inn.partnership.runs += 1;
      ev.type = 'wide'; ev.runs = 1; ev.text = pickOne(LINES.WD); tokens.push('wd');
      inn.log.push(ev); checkEnd(match); return ev;
    }
    if (xr < wideP + nbP) {
      // No-ball: +1 and the batter can still score off it
      const off = pickWeighted({ 0: 40, 1: 35, 2: 8, 4: 12, 6: 5 });
      const r = Number(off);
      inn.runs += 1 + r; inn.extras.nb += 1; bw.runs += 1 + r; bw.nbs += 1;
      st.runs += r; if (r === 4) st.fours++; if (r === 6) st.sixes++;
      inn.partnership.runs += 1 + r;
      if (r % 2 === 1) swapStrike(inn);
      inn.freeHit = true;
      ev.type = 'noball'; ev.runs = 1 + r; ev.text = pickOne(LINES.NB) + (r ? ` And ${r} off the bat!` : '');
      tokens.push(r ? `nb+${r}` : 'nb');
      inn.log.push(ev); checkEnd(match); return ev;
    }

    // Legal delivery
    const facedIdx = inn.striker;
    const out = pickWeighted(legal);
    const wasFreeHit = inn.freeHit;
    inn.freeHit = false;
    inn.balls += 1; bw.balls += 1; st.balls += 1; inn.partnership.balls += 1;
    ev.outcome = out;

    if (out === 'W') {
      const how = pickDismissal(match, batMode, wasFreeHit);
      const fielder = fielderName(match, how === 'run out' ? -1 : inn.bowler);
      st.out = { how, text: dismissalText(how, bowlerP.name, fielder) };
      if (how !== 'run out') bw.wkts += 1;
      bw.dots += 1;
      inn.wkts += 1;
      inn.fow.push({ wkt: inn.wkts, runs: inn.runs, over: oversStr(inn.balls), batter: strikerName });
      ev.type = 'wicket'; ev.runs = 0; ev.how = how;
      ev.text = `OUT! ${strikerName} ${st.out.text}. ${st.runs} (${st.balls})`;
      tokens.push('W');
      inn.partnership = { runs: 0, balls: 0 };
      if (inn.wkts < maxWkts(match, inn)) {
        const nb = nextBatter(match, inn, facedIdx);
        if (nb !== null) inn.striker = nb;
        else if (match.lastManStands && !inn.superOver) {
          // Last man stands: the partner bats on alone and always keeps the strike
          inn.striker = inn.nonStriker; inn.nonStriker = null; inn.alone = true;
          ev.lastMan = match.teams[inn.bat].players[inn.striker].name;
          ev.text += ` ${ev.lastMan} bats on alone.`;
        } else inn.noBatters = true;
      }
    } else {
      const r = Number(out);
      inn.runs += r; bw.runs += r; st.runs += r; inn.partnership.runs += r;
      if (r === 0) bw.dots += 1;
      if (r === 4) { st.fours++; bw.fours++; }
      if (r === 6) { st.sixes++; bw.sixes++; }
      ev.type = 'runs'; ev.runs = r; ev.text = pickOne(LINES[out]);
      tokens.push(r === 0 ? '•' : String(r));
      if (r % 2 === 1) swapStrike(inn);
    }

    // Ball limit: the batter retires not out and the next one comes in
    if (match.maxBallsPerBatter && !inn.superOver && !st.out && !st.returned && st.balls >= match.maxBallsPerBatter) {
      const nb = nextBatter(match, inn, facedIdx);
      if (nb === null) {
        st.returned = true;   // nobody else left, so they bat on
      } else {
        st.retired = true;
        st.retiredOrder = inn.retireCount = (inn.retireCount || 0) + 1;
        if (inn.striker === facedIdx) inn.striker = nb; else inn.nonStriker = nb;
        inn.partnership = { runs: 0, balls: 0 };
        ev.retired = strikerName;
        ev.text += ` ${strikerName} retires not out on ${st.runs} (${st.balls}).`;
      }
    }

    // End of over
    if (inn.balls % 6 === 0) {
      ev.endOfOver = true;
      if (bw.runs === bw.overStartRuns) { bw.maidens += 1; ev.maiden = true; }
      inn.lastOverBowler = inn.bowler;
      inn.bowler = null;
      swapStrike(inn);
    }
    inn.log.push(ev);
    checkEnd(match);
    return ev;
  }

  // Next batter in: a fresh one if any are left, otherwise a retired batter comes back
  // (earliest retired first) and bats on with no ball limit.
  function nextBatter(match, inn, exclude) {
    const order = inn.order || match.teams[inn.bat].players.map((p, i) => i);
    if (inn.nextIn < order.length) { const i = order[inn.nextIn++]; inn.batters[i].batted = true; return i; }
    const back = inn.batters
      .filter(b => b.retired && !b.out && !b.returned && b.idx !== exclude && b.idx !== inn.striker && b.idx !== inn.nonStriker)
      .sort((a, b) => a.retiredOrder - b.retiredOrder)[0];
    if (back) { back.returned = true; return back.idx; }
    return null;
  }

  function maxWkts(match, inn) {
    const n = match.teams[inn.bat].players.length - 1;
    if (inn.superOver) return Math.min(2, n);
    return match.lastManStands ? n + 1 : n;   // last man stands: every batter has to be out
  }

  function swapStrike(inn) {
    if (inn.alone || inn.nonStriker === null) return;   // a lone batter keeps the strike
    const t = inn.striker; inn.striker = inn.nonStriker; inn.nonStriker = t;
  }

  function checkEnd(match) {
    const inn = cur(match);
    const allOut = inn.wkts >= maxWkts(match, inn) || !!inn.noBatters;
    const oversDone = inn.balls >= ovs(match, inn) * 6;
    const chased = inn.target !== null && inn.runs >= inn.target;
    if (allOut || oversDone || chased) {
      inn.done = true; inn.bowler = null;
      if (match.innings.length % 2 === 0) decideResult(match);
    }
  }

  const MAX_SUPER_OVERS = 5;
  const ordinal = n => n === 1 ? '' : `${n}${n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} `;

  // Decides the last pair of innings (the match, or a Super Over). A tie never ends the
  // match: it sets pendingSuperOver and the next Super Over decides it.
  function decideResult(match) {
    const n = match.innings.length;
    const a = match.innings[n - 2], b = match.innings[n - 1];
    const tA = match.teams[a.bat], tB = match.teams[b.bat];
    const so = b.superOver;
    let winner = null;
    if (b.runs >= b.target) winner = b.bat;
    else if (b.runs < a.runs) winner = a.bat;

    if (winner === null) {
      if (so < MAX_SUPER_OVERS) { match.pendingSuperOver = true; return; }
      // Extremely rare: still level after 5 Super Overs. Most boundaries in the whole match wins.
      const bnd = t => match.innings.filter(I => I.bat === t).reduce((s, I) => s + I.batters.reduce((x, y) => x + y.fours + y.sixes, 0), 0);
      winner = bnd(0) !== bnd(1) ? (bnd(0) > bnd(1) ? 0 : 1) : (Math.random() < 0.5 ? 0 : 1);
      match.pendingSuperOver = false;
      match.result = { winner, superOvers: so, text: `Still level after ${so} Super Overs. ${match.teams[winner].name} win on boundary count` };
      return;
    }
    match.pendingSuperOver = false;
    if (!so) {
      if (winner === b.bat) {
        const w = maxWkts(match, b) - b.wkts, left = match.overs * 6 - b.balls;
        match.result = { winner, text: `${tB.name} won by ${w} wicket${w === 1 ? '' : 's'} (${left} ball${left === 1 ? '' : 's'} left)` };
      } else {
        const m = a.runs - b.runs;
        match.result = { winner, text: `${tA.name} won by ${m} run${m === 1 ? '' : 's'}` };
      }
      return;
    }
    const main = match.innings[0];
    match.result = {
      winner, superOvers: so,
      text: `Scores level on ${main.runs}. ${match.teams[winner].name} won the ${ordinal(so)}Super Over (${tA.short || tA.name} ${a.runs}/${a.wkts} v ${tB.short || tB.name} ${b.runs}/${b.wkts})`,
    };
  }

  // Start whatever innings comes next: the chase, a Super Over, or the second half of one.
  // Returns false when the match is over.
  function startNextInnings(match) {
    if (match.result) return false;
    const n = match.innings.length;
    const last = match.innings[n - 1];
    if (!last.done) return false;
    if (n === 1) { startInnings(match, 1 - last.bat); return true; }
    if (match.pendingSuperOver) {
      // the side that batted second in the previous pair bats first
      const so = (last.superOver || 0) + 1;
      match.pendingSuperOver = false;
      startInnings(match, last.bat, { superOver: so });
      return true;
    }
    if (last.superOver && n % 2 === 1) { startInnings(match, 1 - last.bat, { superOver: last.superOver }); return true; }
    return false;
  }

  // ---------- CPU decision making ----------
  // Skill edge for this ball: > 0 favours the batter, < 0 the bowler (about -2 … +2)
  function edgeOf(match, inn) {
    const batter = match.teams[inn.bat].players[inn.striker];
    const bowler = inn.bowler !== null ? match.teams[inn.bowl].players[inn.bowler] : null;
    const aq = (batter.bat - SKILL.batMid) / SKILL.batSpread;
    const bq = bowler ? (bowler.bowl - SKILL.bowlMid) / SKILL.bowlSpread : 0;
    return aq - bq;
  }

  // Par run rate for the side batting first in short formats
  function parRate(match) {
    return 11 + (match.pitch === 'flat' ? 1 : match.pitch === 'balanced' ? 0 : -0.5);
  }

  // Will the striker retire at the ball limit (rather than bat on)?
  function aboutToRetire(match, inn, within) {
    const st = inn.batters[inn.striker];
    if (!match.maxBallsPerBatter || inn.superOver || st.returned || inn.alone) return false;
    const freshLeft = (inn.order || []).length - inn.nextIn;
    return st.balls >= match.maxBallsPerBatter - within && freshLeft > 0;
  }

  function cpuBatMode(match) {
    const inn = cur(match);
    const ballsLeft = ovs(match, inn) * 6 - inn.balls;
    const wktsLeft = maxWkts(match, inn) - inn.wkts;
    const phase = phaseOf(match, inn);
    const batter = match.teams[inn.bat].players[inn.striker];
    if (inn.freeHit) return 'attack';
    if (match.overs <= 10) {
      const edge = edgeOf(match, inn);
      const perOver = wktsLeft / Math.max(ballsLeft / 6, 1);   // wickets in hand per over left
      const lastOver = ballsLeft <= 6;
      if (inn.target !== null) {
        // ---- Chasing: the required rate decides, the matchup fine-tunes ----
        const need = inn.target - inn.runs;
        const rrr = (need / Math.max(ballsLeft, 1)) * 6;
        if (need <= 0) return 'normal';
        if (lastOver) return rrr > 6 || wktsLeft > 1 ? 'attack' : 'normal';
        if (rrr > 11) return 'attack';
        if (rrr > 8) return edge > -0.6 || perOver >= 0.6 || ballsLeft <= 12 ? 'attack' : 'normal';
        if (aboutToRetire(match, inn, 2) && wktsLeft >= 2) return 'attack';
        if (rrr < 6 && wktsLeft <= 1) return edge < -0.8 ? 'defend' : 'normal';
        // A normal shot scores about 7 an over, so at 6–8 an over the chasers keep attacking
        // while they have wickets to spare; with few left they work the singles.
        let p = rrr >= 5 ? (wktsLeft >= 2 ? 0.95 : 0.5)
                         : (perOver >= 1 ? 0.6 : perOver >= 0.6 ? 0.35 : 0.1);
        p += 0.15 * Math.max(-1.5, Math.min(1.5, edge));
        return rand() < p ? 'attack' : 'normal';
      }
      // ---- Batting first: aim above par, but respect the matchup and wickets ----
      if (lastOver) return 'attack';
      if (aboutToRetire(match, inn, 2) && wktsLeft >= 2) return 'attack';   // use it or lose it
      if (wktsLeft <= 1 && ballsLeft > 12) return edge > 1 ? 'normal' : 'defend';
      // a tail-ender against a good bowler just rotates the strike
      if (batter.bat < 45 && edge < -1 && phase !== 'death') return 'normal';
      const par = parRate(match) * inn.balls / 6;
      let p = perOver >= 0.9 ? 0.75 : perOver >= 0.6 ? 0.55 : perOver >= 0.4 ? 0.32 : 0.24;
      if (inn.balls >= 6) p += inn.runs < par - 4 ? 0.2 : inn.runs > par + 6 ? -0.15 : 0;
      p += 0.22 * Math.max(-1.5, Math.min(1.5, edge));
      if (phase === 'death' && wktsLeft >= 2) p += 0.25;
      if (wktsLeft <= 2 && ballsLeft > 18) p = Math.min(p, 0.05);
      return rand() < p ? 'attack' : 'normal';
    }
    if (inn.target !== null) {
      const need = inn.target - inn.runs;
      const rrr = (need / Math.max(ballsLeft, 1)) * 6;
      if (rrr > 11) return 'attack';
      if (rrr > 8.5) return wktsLeft >= 4 || ballsLeft < 18 ? 'attack' : 'normal';
      if (rrr < 5 && wktsLeft <= 4) return 'defend';
      if (rrr < 4.5) return 'defend';
      return 'normal';
    }
    if (phase === 'death' && wktsLeft >= 3) return 'attack';
    if (wktsLeft <= 3 && ballsLeft > 24) return 'defend';
    if (phase === 'powerplay' && batter.bat >= 75 && rand() < 0.35) return 'attack';
    if (phase === 'middle' && wktsLeft >= 7 && rand() < 0.25) return 'attack';
    return 'normal';
  }

  function cpuBowlPlan(match) {
    const inn = cur(match);
    const ballsLeft = ovs(match, inn) * 6 - inn.balls;
    const phase = phaseOf(match, inn);
    const edge = inn.bowler !== null ? edgeOf(match, inn) : 0;   // > 0 = batter is better
    if (inn.target !== null) {
      const need = inn.target - inn.runs;
      const rrr = (need / Math.max(ballsLeft, 1)) * 6;
      if (rrr < 6) return 'attack';    // need wickets to win
      // squeeze them, but in short formats only now and then: a fully tight attack
      // would stop the chasers getting the boundaries they need
      if (rrr > 10) return match.overs > 10 || rand() < 0.2 ? 'tight' : 'normal';
    }
    if (inn.alone) return 'attack';                                   // one wicket ends it
    if (inn.batters[inn.striker].balls < 4) return edge > 1 ? 'normal' : 'attack'; // new batter
    if (match.overs <= 10) {
      if (edge > 0.8 && rand() < 0.5) return 'tight';                // star batter v weaker bowler
      if (edge < -0.8) return 'attack';                               // good bowler v weak batter
      if (aboutToRetire(match, inn, 2)) return 'tight';               // they will swing: give nothing
    }
    if (phase === 'death') return rand() < (match.overs <= 10 ? 0.4 : 0.6) ? 'tight' : 'normal';
    if (phase === 'powerplay') return rand() < 0.4 ? 'attack' : 'normal';
    return 'normal';
  }

  // ---------- Formatting helpers ----------
  function oversStr(balls) { return `${Math.floor(balls / 6)}.${balls % 6}`; }
  function runRate(runs, balls) { return balls ? (runs * 6 / balls) : 0; }

  const api = {
    BAT_TABLES, BOWL_PLANS, PITCHES, PRESET_TEAMS,
    createMatch, doToss, cpuTossDecision, tossDecision, startInnings, cur,
    eligibleBowlers, needsBowler, setBowler, cpuChooseBowler,
    ballProbabilities, bowlBall, cpuBatMode, cpuBowlPlan, startNextInnings,
    oversStr, runRate, setRandom, mulberry32, phaseOf,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CricketEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
