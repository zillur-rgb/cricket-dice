// Balance check: node simulate.js [matches] [overs] [pitch]
const E = require('./public/engine.js');

const N = Number(process.argv[2] || 2000);
const OVERS = Number(process.argv[3] || 20);
const PITCH = process.argv[4] || 'balanced';
E.setRandom(E.mulberry32(42));

const teams = E.PRESET_TEAMS.map(t => t.id);
let tot = { runs: 0, wkts: 0, balls: 0, allOut: 0, chases: 0, chaseWins: 0, inns: 0, fours: 0, sixes: 0, dots: 0, legal: 0, extras: 0 };
const firstInnings = [];
const modeCount = { defend: 0, normal: 0, attack: 0 };

for (let m = 0; m < N; m++) {
  const a = teams[m % 4], b = teams[(m + 1 + (m >> 2) % 3) % 4];
  const match = E.createMatch({ overs: OVERS, teamAId: a, teamBId: b, pitch: PITCH });
  E.startInnings(match, m % 2);
  for (let i = 0; i < 2; i++) {
    if (i === 1) E.startInnings(match, 1 - match.innings[0].bat);
    const inn = E.cur(match);
    while (!inn.done) {
      if (E.needsBowler(match)) E.setBowler(match, E.cpuChooseBowler(match));
      const mode = E.cpuBatMode(match);
      modeCount[mode]++;
      const ev = E.bowlBall(match, mode, E.cpuBowlPlan(match));
      if (ev.outcome === '4') tot.fours++;
      if (ev.outcome === '6') tot.sixes++;
      if (ev.outcome === '0' || ev.outcome === 'W') tot.dots++;
      if (ev.outcome !== undefined) tot.legal++;
    }
    tot.inns++; tot.runs += inn.runs; tot.wkts += inn.wkts; tot.balls += inn.balls;
    tot.extras += inn.extras.wd + inn.extras.nb;
    if (inn.wkts === 10) tot.allOut++;
    if (i === 0) firstInnings.push(inn.runs);
  }
  tot.chases++;
  if (match.result.winner === match.innings[1].bat) tot.chaseWins++;
}

firstInnings.sort((x, y) => x - y);
const pct = q => firstInnings[Math.floor(q * (firstInnings.length - 1))];
const r = (x, d = 1) => x.toFixed(d);
console.log(`${N} matches, ${OVERS} overs, pitch=${PITCH}`);
console.log(`Avg innings: ${r(tot.runs / tot.inns)} / ${r(tot.wkts / tot.inns)}  (RR ${r(tot.runs * 6 / tot.balls, 2)})`);
console.log(`1st innings range: p10 ${pct(0.1)}, median ${pct(0.5)}, p90 ${pct(0.9)}`);
console.log(`All out: ${r(100 * tot.allOut / tot.inns)}% of innings | balls per wicket: ${r(tot.balls / tot.wkts)}`);
console.log(`Per legal ball: dot ${r(100 * tot.dots / tot.legal)}%, 4s ${r(100 * tot.fours / tot.legal)}%, 6s ${r(100 * tot.sixes / tot.legal)}%`);
console.log(`Extras per innings: ${r(tot.extras / tot.inns)} | chasing side wins: ${r(100 * tot.chaseWins / tot.chases)}%`);
const mc = Object.values(modeCount).reduce((a, b) => a + b);
console.log(`AI intent mix: defend ${r(100 * modeCount.defend / mc)}%, normal ${r(100 * modeCount.normal / mc)}%, attack ${r(100 * modeCount.attack / mc)}%`);
