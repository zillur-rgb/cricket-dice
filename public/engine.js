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
    defend: { 0: 52, 1: 35, 2: 6.5, 3: 0.5, 4: 4.5, 6: 0.5, W: 1.2 },
    normal: { 0: 37, 1: 36, 2: 7.5, 3: 0.6, 4: 11, 6: 4.2, W: 3.4 },
    attack: { 0: 31, 1: 27, 2: 7, 3: 0.5, 4: 17, 6: 10.5, W: 6.8 },
  };

  const BOWL_PLANS = {
    tight:  { mult: { 0: 1.12, 1: 1.08, 4: 0.75, 6: 0.65, W: 0.75 }, wide: 0.7, nb: 0.8 },
    normal: { mult: {}, wide: 1, nb: 1 },
    attack: { mult: { 0: 0.95, 4: 1.2, 6: 1.2, W: 1.35 }, wide: 1.4, nb: 1.5 },
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

  // Toss winner decides; for CPU we pick based on pitch
  function cpuTossDecision(match) {
    if (match.pitch === 'dusty') return 'bat';    // bat before it turns more
    if (match.pitch === 'green') return 'bowl';
    return rand() < 0.55 ? 'bowl' : 'bat';
  }

  function startInnings(match, battingTeamIdx) {
    const inn = {
      bat: battingTeamIdx,
      bowl: 1 - battingTeamIdx,
      runs: 0, wkts: 0, balls: 0,
      extras: { wd: 0, nb: 0 },
      batters: match.teams[battingTeamIdx].players.map((_, i) => ({ idx: i, runs: 0, balls: 0, fours: 0, sixes: 0, out: null, batted: false })),
      striker: 0, nonStriker: 1, nextIn: 2,
      bowlers: {},            // idx -> { balls, runs, wkts, dots }
      bowler: null, lastOverBowler: null,
      overLog: [],            // per over: array of short tokens
      log: [],                // commentary events
      fow: [],
      partnership: { runs: 0, balls: 0 },
      freeHit: false,
      target: match.innings.length === 1 ? match.innings[0].runs + 1 : null,
      done: false,
    };
    inn.batters[0].batted = true; inn.batters[1].batted = true;
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
    const oversLeft = match.overs - Math.floor(inn.balls / 6);
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
    const death = overNo >= match.overs * 0.8;
    const pp = overNo < match.overs * 0.3;
    // Score each bowler: skill + pitch fit + phase fit; keep best bowler overs for death
    let best = null, bestScore = -Infinity;
    for (const b of options) {
      let s = b.bowl + rand() * 10;
      if (match.pitch === 'dusty' && b.type === 'spin') s += 8;
      if (match.pitch === 'green' && b.type === 'pace') s += 8;
      if ((pp || death) && b.type === 'pace') s += 4;
      const remaining = match.maxOversPerBowler - b.overs;
      const oversLeft = match.overs - overNo;
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
    const overNo = Math.floor(inn.balls / 6);
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

    // Skill duel
    const d = (batter.bat - bowler.bowl) / 50;
    mul('W', Math.exp(-0.55 * d));
    mul('4', Math.exp(0.35 * d));
    mul('6', Math.exp(0.4 * d));
    mul('0', Math.exp(-0.2 * d));

    // Getting set
    if (bstat.balls < 5) { mul('W', 1.35); mul('4', 0.8); mul('6', 0.75); }
    else if (bstat.balls >= 25) { mul('W', 0.85); mul('4', 1.1); mul('6', 1.1); }

    // Phase
    const phase = phaseOf(match, inn);
    if (phase === 'powerplay') { mul('4', 1.15); mul('6', 1.05); }
    if (phase === 'death') { mul('6', 1.2); mul('4', 1.1); mul('W', 1.1); }

    // Pitch
    const pt = match.pitch, ty = bowler.type;
    if (pt === 'flat') { mul('W', 0.85); mul('4', 1.12); mul('6', 1.12); }
    if (pt === 'green') { if (ty === 'pace') { mul('W', 1.3); mul('4', 0.9); } else mul('W', 0.9); }
    if (pt === 'dusty') { if (ty === 'spin') { mul('W', 1.35); mul('0', 1.1); } else mul('W', 0.95); }

    // Free hit: can only be run out
    if (inn.freeHit) { mul('W', 0.08); mul('6', 1.3); mul('4', 1.2); }

    const total = OUTCOME_KEYS.reduce((s, k) => s + w[k], 0);
    const probs = {};
    for (const k of OUTCOME_KEYS) probs[k] = w[k] / total;

    const wideP = BASE_WIDE * plan.wide * (ty === 'spin' ? 0.6 : 1);
    const nbP = BASE_NOBALL * plan.nb * (ty === 'spin' ? 0.3 : 1);
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
      if (inn.wkts < maxWkts(match, inn) && inn.nextIn < match.teams[inn.bat].players.length) {
        inn.striker = inn.nextIn++;
        inn.batters[inn.striker].batted = true;
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

  function maxWkts(match, inn) { return match.teams[inn.bat].players.length - 1; }

  function swapStrike(inn) { const t = inn.striker; inn.striker = inn.nonStriker; inn.nonStriker = t; }

  function checkEnd(match) {
    const inn = cur(match);
    const allOut = inn.wkts >= maxWkts(match, inn);
    const oversDone = inn.balls >= match.overs * 6;
    const chased = inn.target !== null && inn.runs >= inn.target;
    if (allOut || oversDone || chased) {
      inn.done = true; inn.bowler = null;
      if (match.innings.length === 2) decideResult(match);
    }
  }

  function decideResult(match) {
    const [a, b] = match.innings;
    const tA = match.teams[a.bat], tB = match.teams[b.bat];
    if (b.runs >= b.target) {
      const w = maxWkts(match, b) - b.wkts;
      match.result = { winner: b.bat, text: `${tB.name} won by ${w} wicket${w === 1 ? '' : 's'} (${match.overs * 6 - b.balls} ball${match.overs * 6 - b.balls === 1 ? '' : 's'} left)` };
    } else if (b.runs === a.runs) {
      match.result = { winner: null, text: 'Match tied!' };
    } else {
      const m = a.runs - b.runs;
      match.result = { winner: a.bat, text: `${tA.name} won by ${m} run${m === 1 ? '' : 's'}` };
    }
  }

  // ---------- CPU decision making ----------
  function cpuBatMode(match) {
    const inn = cur(match);
    const ballsLeft = match.overs * 6 - inn.balls;
    const wktsLeft = maxWkts(match, inn) - inn.wkts;
    const phase = phaseOf(match, inn);
    const batter = match.teams[inn.bat].players[inn.striker];
    if (inn.freeHit) return 'attack';
    // Short formats (10 overs or fewer): there's no time to build, so captains attack early.
    // How hard depends on the share of wickets left, since small squads have few to lose.
    if (match.overs <= 10) {
      // wickets in hand per over remaining: high = can afford risk
      const perOver = wktsLeft / Math.max(ballsLeft / 6, 1);
      const lastOver = ballsLeft <= 6;
      const attackChance = wktsLeft <= 2 && ballsLeft > 18 ? 0 : perOver >= 0.9 ? 0.8 : perOver >= 0.6 ? 0.45 : perOver >= 0.4 ? 0.12 : 0.04;
      if (inn.target !== null) {
        const need = inn.target - inn.runs;
        const rrr = (need / Math.max(ballsLeft, 1)) * 6;
        if (rrr > 10 || (lastOver && rrr > 6)) return 'attack';
        if (rrr > 7.5) return perOver >= 0.5 || ballsLeft <= 12 ? 'attack' : 'normal';
        if (rrr < 5 && wktsLeft <= 1) return 'defend';
        return rand() < attackChance * 0.5 ? 'attack' : 'normal';
      }
      if (lastOver && wktsLeft >= 1) return 'attack';
      if (wktsLeft <= 1 && ballsLeft > 12) return 'defend';
      return rand() < attackChance ? 'attack' : 'normal';
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
    const ballsLeft = match.overs * 6 - inn.balls;
    const phase = phaseOf(match, inn);
    if (inn.target !== null) {
      const need = inn.target - inn.runs;
      const rrr = (need / Math.max(ballsLeft, 1)) * 6;
      if (rrr < 6) return 'attack';    // need wickets to win
      if (rrr > 10) return 'tight';    // squeeze them
    }
    if (inn.batters[inn.striker].balls < 4) return 'attack'; // new batter
    if (phase === 'death') return rand() < 0.6 ? 'tight' : 'normal';
    if (phase === 'powerplay') return rand() < 0.4 ? 'attack' : 'normal';
    return 'normal';
  }

  // ---------- Formatting helpers ----------
  function oversStr(balls) { return `${Math.floor(balls / 6)}.${balls % 6}`; }
  function runRate(runs, balls) { return balls ? (runs * 6 / balls) : 0; }

  const api = {
    BAT_TABLES, BOWL_PLANS, PITCHES, PRESET_TEAMS,
    createMatch, doToss, cpuTossDecision, startInnings, cur,
    eligibleBowlers, needsBowler, setBowler, cpuChooseBowler,
    ballProbabilities, bowlBall, cpuBatMode, cpuBowlPlan,
    oversStr, runRate, setRandom, mulberry32, phaseOf,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CricketEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
