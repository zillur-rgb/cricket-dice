/* Cricket Dice — UI layer (you control both teams) */
(function () {
  'use strict';
  const E = window.CricketEngine;
  const C = window.CricketComp;
  const app = document.getElementById('app');
  const modal = document.getElementById('modal');
  const modalCard = document.getElementById('modal-card');

  const state = {
    screen: 'home',
    db: null,           // league/tournament history (saved to data/history.json)
    store: 'loading',   // 'server' | 'local' | 'loading'
    saveMsg: '',
    ctx: null,          // { compId, fixtureId, recorded } when the live match belongs to a competition
    compTab: { league: 'table', cup: 'groups' },
    plFilter: 'all', plSort: 'runs', plSearch: '',
    setup: { teamAId: 'hawks', teamBId: 'falcons', overs: 10, pitch: 'balanced' },
    match: null,
    bat: 'normal',     // batting team's shot choice
    bowl: 'normal',    // bowling team's plan
    quick: false,
    busy: false,
    tab: 'feed',
    last: null,        // { ev, pos, batMode, bowlPlan }
    preview: true,
    tossInfo: null,
  };

  const OUT_ORDER = ['0', '1', '2', '3', '4', '6', 'W'];
  const OUT_LABEL = { 0: 'Dot', 1: '1', 2: '2', 3: '3', 4: 'Four', 6: 'Six', W: 'Out' };
  const BAT_OPTS = [
    { key: 'defend', title: 'Defend', hint: 'Safe, few runs', k: '1' },
    { key: 'normal', title: 'Normal', hint: 'Balanced', k: '2' },
    { key: 'attack', title: 'Attack', hint: 'Big shots, big risk', k: '3' },
  ];
  const BOWL_OPTS = [
    { key: 'tight', title: 'Tight line', hint: 'Dry up runs', k: 'Q' },
    { key: 'normal', title: 'Stock ball', hint: 'Balanced', k: 'W' },
    { key: 'attack', title: 'Attack', hint: 'Hunt wickets', k: 'E' },
  ];
  const PLAN_NAME = { tight: 'Tight line', normal: 'Stock ball', attack: 'Attacking' };
  const MODE_NAME = { defend: 'Defend', normal: 'Normal', attack: 'Attack' };

  // ---------- helpers ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = x => (x * 100 < 1 ? (x * 100).toFixed(1) : Math.round(x * 100)) + '%';
  const avg = (arr, f) => Math.round(arr.reduce((s, x) => s + f(x), 0) / arr.length);
  const team = i => state.match.teams[i];
  const inn = () => E.cur(state.match);
  const oversFig = balls => `${Math.floor(balls / 6)}${balls % 6 ? '.' + (balls % 6) : ''}`;
  const teamDot = t => `<span class="dot" style="background:${t.color}"></span>`;

  function render() {
    document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === navKey()));
    if (state.screen !== state._lastScreen) window.scrollTo(0, 0);
    state._lastScreen = state.screen;
    if (state.screen === 'home') renderHome();
    else if (state.screen === 'comp') renderComp(state.compKind);
    else if (state.screen === 'players') renderPlayers();
    else if (state.screen === 'history') renderHistory();
    else if (state.screen === 'setup') renderSetup();
    else if (state.screen === 'toss') renderToss();
    else if (state.screen === 'play') renderPlay();
    else if (state.screen === 'break') renderBreak();
    else if (state.screen === 'result') renderResult();
  }

  // ======================= SETUP =======================
  function teamCard(t, selectedId, disabledId, role) {
    const bat = avg(t.players.slice(0, 7), p => p.bat);
    const bowl = avg(t.players.filter(p => p.type), p => p.bowl);
    return `<button class="team-card ${t.id === selectedId ? 'selected' : ''}" data-role="${role}" data-id="${t.id}" ${t.id === disabledId ? 'disabled' : ''}>
      <span class="swatch" style="background:${t.color}"></span>
      <span class="tname">${esc(t.name)}</span>
      <span class="tstats">BAT ${bat} · BOWL ${bowl}</span>
    </button>`;
  }

  function chipRow(name, options, value) {
    return `<div class="chips">${options.map(o => `<button class="chip ${String(o.v) === String(value) ? 'selected' : ''}" data-set="${name}" data-v="${o.v}">${o.l}</button>`).join('')}</div>`;
  }

  function renderSetup() {
    const s = state.setup;
    app.innerHTML = `
      <section class="setup">
        <div class="setup-hero">
          <h1>Friendly match</h1>
          <p>A one-off match between two invented XIs. Nothing here is saved to your history. For the Länderliga and Städtepokal, use the menu above.</p>
        </div>
        <div class="panel">
          <div class="field-label">Team 1</div>
          <div class="team-grid">${E.PRESET_TEAMS.map(t => teamCard(t, s.teamAId, s.teamBId, 'a')).join('')}</div>
        </div>
        <div class="panel">
          <div class="field-label">Team 2</div>
          <div class="team-grid">${E.PRESET_TEAMS.map(t => teamCard(t, s.teamBId, s.teamAId, 'b')).join('')}</div>
        </div>
        <div class="panel setup-row two">
          <div>
            <div class="field-label">Format</div>
            ${chipRow('overs', [{ v: 5, l: '5 overs' }, { v: 10, l: '10 overs' }, { v: 20, l: 'T20' }], s.overs)}
          </div>
          <div>
            <div class="field-label">Pitch</div>
            ${chipRow('pitch', Object.entries(E.PITCHES).map(([k, v]) => ({ v: k, l: v.label })), s.pitch)}
            <div class="pitch-note">${esc(E.PITCHES[s.pitch].note)}</div>
          </div>
        </div>
        <div><button class="primary" id="btn-start">Go to the toss →</button></div>
      </section>`;

    app.querySelectorAll('.team-card').forEach(b => b.onclick = () => {
      if (b.dataset.role === 'a') s.teamAId = b.dataset.id; else s.teamBId = b.dataset.id;
      renderSetup();
    });
    app.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
      const k = b.dataset.set;
      s[k] = k === 'overs' ? Number(b.dataset.v) : b.dataset.v;
      renderSetup();
    });
    document.getElementById('btn-start').onclick = () => {
      state.ctx = null;
      state.match = E.createMatch(s);
      state.tossInfo = null;
      state.screen = 'toss';
      render();
    };
  }

  // ======================= TOSS =======================
  function renderToss() {
    const t = state.tossInfo;
    let body;
    if (!t) {
      body = `<h2>${esc(team(0).name)}, call the toss</h2>
        <div class="btn-row"><button class="primary" data-call="heads">Heads</button><button class="primary" data-call="tails">Tails</button></div>`;
    } else if (t.flipping) {
      body = `<h2>…</h2>`;
    } else {
      const w = team(t.winner);
      body = `<h2>It's ${t.coin}! ${esc(w.name)} won the toss.</h2><p class="muted">${esc(E.PITCHES[state.match.pitch].note)}.</p>
        <div class="btn-row"><button class="primary" data-choose="bat">${esc(w.short)} bat first</button><button class="primary" data-choose="bowl">${esc(w.short)} bowl first</button></div>`;
    }
    app.innerHTML = `<section class="toss">
      <div class="coin ${t && t.flipping ? 'flip' : ''}">${t && !t.flipping ? t.coin.toUpperCase() : '?'}</div>
      ${body}
      <p class="muted">${state.ctx ? esc(fixtureLabel(compById(state.ctx.compId), fixtureById(state.ctx))) + ' · ' : ''}${esc(team(0).name)} vs ${esc(team(1).name)} · ${state.match.overs} overs · ${esc(E.PITCHES[state.match.pitch].label)}</p>
    </section>`;

    app.querySelectorAll('[data-call]').forEach(b => b.onclick = () => {
      const res = E.doToss(state.match, b.dataset.call);
      state.tossInfo = { flipping: true };
      renderToss();
      setTimeout(() => { state.tossInfo = { coin: res.coin, winner: res.winner }; renderToss(); }, 1100);
    });
    app.querySelectorAll('[data-choose]').forEach(b => b.onclick = () => {
      const w = state.tossInfo.winner;
      beginInnings(b.dataset.choose === 'bat' ? w : 1 - w);
    });
  }

  function beginInnings(battingIdx) {
    E.startInnings(state.match, battingIdx);
    state.screen = 'play';
    state.bat = 'normal'; state.bowl = 'normal';
    state.last = null; state.preview = true; state.tab = 'feed';
    advance();
  }

  // ======================= GAME FLOW =======================
  function advance() {
    const m = state.match, i = inn();
    if (i.done) {
      state.screen = m.innings.length === 1 ? 'break' : 'result';
      if (state.screen === 'result' && state.ctx && !state.ctx.recorded) {
        state.ctx.recorded = true;
        C.recordMatch(state.db, state.ctx.compId, state.ctx.fixtureId, m, 'played');
        state.saveMsg = 'Saving…';
        save().then(() => { if (state.screen === 'result') render(); });
      }
      render();
      return;
    }
    render();
    if (E.needsBowler(m)) openBowlerPicker();
  }

  function needlePos(ev) {
    if (ev.outcome === undefined) return null;
    let start = 0;
    for (const k of OUT_ORDER) {
      const w = ev.probs[k];
      if (k === ev.outcome) return (start + w * (0.15 + 0.7 * Math.random())) * 100;
      start += w;
    }
    return null;
  }

  function playBall() {
    if (state.busy || state.screen !== 'play') return;
    const m = state.match;
    if (inn().done || E.needsBowler(m)) return;
    const batMode = state.bat, bowlPlan = state.bowl;
    const ev = E.bowlBall(m, batMode, bowlPlan);
    state.last = { ev, pos: needlePos(ev), batMode, bowlPlan };
    state.preview = false;

    if (state.quick) { advance(); return; }

    state.busy = true;
    const box = document.getElementById('delivery');
    box.innerHTML = deliveryInner(true);
    const needle = box.querySelector('.needle');
    setButtonsDisabled(true);
    if (needle && state.last.pos !== null) {
      needle.style.left = '0%';
      needle.classList.add('show');
      void needle.offsetWidth;
      needle.classList.add('sweep');
      needle.style.left = state.last.pos + '%';
    }
    setTimeout(() => { state.busy = false; advance(); }, ev.outcome === undefined ? 350 : 780);
  }

  // Let the computer make both captains' choices (for speeding through)
  function autoPlay(untilEndOfInnings) {
    if (state.busy) return;
    const m = state.match;
    const startInn = m.currentInnings;
    let last = null, safety = 0;
    while (!inn().done && safety++ < 1000) {
      if (E.needsBowler(m)) {
        if (!untilEndOfInnings) break;
        E.setBowler(m, E.cpuChooseBowler(m));
      }
      const batMode = E.cpuBatMode(m), bowlPlan = E.cpuBowlPlan(m);
      const ev = E.bowlBall(m, batMode, bowlPlan);
      last = { ev, pos: needlePos(ev), batMode, bowlPlan };
      if (!untilEndOfInnings && ev.endOfOver) break;
    }
    if (last) { state.last = last; state.preview = false; }
    if (m.currentInnings === startInn) advance();
  }

  function setButtonsDisabled(d) {
    app.querySelectorAll('.controls button').forEach(b => { b.disabled = d; });
  }

  // ======================= PLAY SCREEN =======================
  // In Länderliga/Städtepokal matches both captains' plans are decided automatically
  const autoPlans = () => !!state.ctx;
  function decidePlans() {
    if (!autoPlans()) return;
    const m = state.match, i = inn();
    if (!i || i.done) return;
    const key = `${m.currentInnings}-${i.log.length}`;
    if (state.autoKey === key) return;
    state.autoKey = key;
    state.bat = E.cpuBatMode(m);
    state.bowl = E.cpuBowlPlan(m);
  }

  function renderPlay() {
    const m = state.match;
    decidePlans();
    app.innerHTML = `<section class="match">
      <div class="col col-main">
        <div class="o-1">${scoreboardHTML()}</div>
        <div class="o-2 panel delivery" id="delivery">${deliveryInner(false)}</div>
        ${autoPlans() ? '' : `<div class="o-4">${plansHTML()}</div>`}
        <div class="o-5">${playersHTML()}</div>
        <div class="o-6">${bowlingFiguresHTML()}</div>
      </div>
      <div class="col col-side">
        <div class="o-3 sticky-actions">${actionsHTML()}</div>
        <div class="o-7 panel">
          <h2 class="card-head">Scorecard</h2>
          ${m.innings.map((_, k) => scorecardHTML(k)).reverse().join('')}
        </div>
      </div>
    </section>`;

    app.querySelectorAll('[data-bat]').forEach(b => b.onclick = () => { state.bat = b.dataset.bat; state.preview = true; renderPlay(); });
    app.querySelectorAll('[data-bowl]').forEach(b => b.onclick = () => { state.bowl = b.dataset.bowl; state.preview = true; renderPlay(); });
    const bowl = document.getElementById('btn-bowl'); if (bowl) bowl.onclick = playBall;
    const ao = document.getElementById('btn-auto-over'); if (ao) ao.onclick = () => autoPlay(false);
    const ai = document.getElementById('btn-auto-inn'); if (ai) ai.onclick = () => autoPlay(true);
    const q = document.getElementById('quick'); if (q) q.onchange = () => { state.quick = q.checked; };
    const i = inn();
    if (i.bowler === null && !i.done) setButtonsDisabled(true);
  }

  function scoreboardHTML() {
    const m = state.match, i = inn(), t = team(i.bat), bt = team(i.bowl);
    const phase = E.phaseOf(m, i);
    const crr = E.runRate(i.runs, i.balls);
    let sub = `<span>CRR <b>${crr.toFixed(2)}</b></span>`;
    let target = '';
    if (i.target !== null) {
      const need = i.target - i.runs, left = m.overs * 6 - i.balls;
      const rrr = left ? need * 6 / left : 0;
      sub += `<span>RRR <b>${rrr.toFixed(2)}</b></span><span>Target <b>${i.target}</b></span>`;
      target = `<div class="sb-target">${esc(t.name)} need <b>${need}</b> run${need === 1 ? '' : 's'} from <b>${left}</b> ball${left === 1 ? '' : 's'}</div>`;
    } else {
      const proj = Math.round(i.runs + crr * (m.overs * 6 - i.balls) / 6);
      sub += `<span>Projected <b>${i.balls ? proj : '–'}</b></span>`;
    }
    sub += `<span>Partnership <b>${i.partnership.runs} (${i.partnership.balls})</b></span>`;
    return `<div class="scoreboard">
      <div class="sb-top">
        <div class="sb-team">${teamDot(t)}${esc(t.name)}</div>
        <div class="badges">
          ${i.freeHit ? '<span class="badge fh">Free hit</span>' : ''}
          <span class="badge">${phase === 'powerplay' ? 'Powerplay' : phase === 'death' ? 'Death overs' : 'Middle overs'}</span>
        </div>
      </div>
      <div class="sb-main">
        <div class="sb-score">${i.runs}/${i.wkts}</div>
        <div class="sb-overs">${E.oversStr(i.balls)} / ${m.overs} ov</div>
      </div>
      <div class="sb-sub">${sub}</div>
      <div class="sb-vs">vs ${esc(bt.name)}${m.innings.length === 2 ? ` · 1st innings ${m.innings[0].runs}/${m.innings[0].wkts}` : ''}</div>
      ${target}
    </div>`;
  }

  function barHTML(probs, pos, hitKey, animate) {
    const segs = OUT_ORDER.map(k => {
      const w = probs[k] * 100;
      const label = w >= 7 ? `<span>${OUT_LABEL[k]}<small>${pct(probs[k])}</small></span>` : w >= 3.2 ? `<span>${k === 'W' ? 'W' : k}</span>` : '';
      return `<div class="seg seg-${k} ${k === hitKey ? 'hit' : ''}" style="flex:0 0 ${w}%" title="${OUT_LABEL[k]}: ${pct(probs[k])}">${label}</div>`;
    }).join('');
    const showNeedle = pos !== null && pos !== undefined;
    return `<div class="bar-wrap"><div class="bar">${segs}</div>
      <div class="needle ${showNeedle && !animate ? 'show' : ''}" style="left:${showNeedle && !animate ? pos : 0}%"></div></div>`;
  }

  function deliveryInner(animating) {
    const m = state.match, i = inn();
    let probs, caption, pos = null, hit = null, flash = '';

    if (!state.preview && state.last) {
      const L = state.last, ev = L.ev;
      probs = ev.probs; pos = L.pos;
      hit = animating ? null : ev.outcome;
      caption = `<span>${esc(ev.bowler)} to ${esc(ev.batter)} · ${ev.over}.${ev.ball}</span><span>Ball: <b>${PLAN_NAME[L.bowlPlan]}</b> · Shot: <b>${MODE_NAME[L.batMode]}</b>${ev.freeHit ? ' · Free hit' : ''}</span>`;
      if (!animating) flash = flashHTML(ev);
      else flash = `<div class="flash"><div class="small">${ev.outcome === undefined ? '' : 'Rolling…'}</div></div>`;
    } else if (i.bowler !== null) {
      probs = E.ballProbabilities(m, state.bat, state.bowl).legal;
      caption = `<span>Odds for this ball: <b>${PLAN_NAME[state.bowl]}</b> vs <b>${MODE_NAME[state.bat]}</b></span><span>${esc(team(i.bowl).players[i.bowler].name)} to ${esc(team(i.bat).players[i.striker].name)}</span>`;
      flash = `<div class="flash"><div class="small">${autoPlans() ? 'The captains have set their plans. Press Bowl.' : 'Set both captains\' plans, then bowl.'}</div></div>`;
    } else if (state.last) {
      probs = state.last.ev.probs; pos = state.last.pos; hit = state.last.ev.outcome;
      caption = `<span>End of over</span><span></span>`;
      flash = flashHTML(state.last.ev);
    } else {
      return `<div class="flash"><div class="small">Choose a bowler to start the over.</div></div>`;
    }
    return `${barHTML(probs, pos, hit, animating)}<div class="bar-caption">${caption}</div>${flash}`;
  }

  function flashHTML(ev) {
    let big, cls = '';
    if (ev.type === 'wide') { big = 'Wide'; cls = 'fx'; }
    else if (ev.type === 'noball') { big = 'No-ball'; cls = 'fx'; }
    else if (ev.type === 'wicket') { big = `Out! ${ev.how}`; cls = 'fW'; }
    else if (ev.runs === 4) { big = 'Four!'; cls = 'f4'; }
    else if (ev.runs === 6) { big = 'Six!'; cls = 'f6'; }
    else if (ev.runs === 0) big = 'Dot ball';
    else big = `${ev.runs} run${ev.runs > 1 ? 's' : ''}`;
    const extra = ev.maiden ? ' Maiden over!' : '';
    return `<div class="flash pop"><div class="big ${cls}">${esc(big)}</div><div class="small">${esc(ev.text + extra)}</div></div>`;
  }

  function plansHTML() {
    const m = state.match, i = inn();
    const canPreview = i.bowler !== null;
    const bowlT = team(i.bowl), batT = team(i.bat);
    const row = (opts, attr, current, oddsFn) => opts.map(o => {
      let sub = o.hint;
      if (canPreview) {
        const r = oddsFn(o.key);
        sub = `Out ${pct(r.legal.W)} · 4/6 ${pct(r.legal['4'] + r.legal['6'])}`;
      }
      return `<button data-${attr}="${o.key}" class="${current === o.key ? 'selected' : ''}">
        <span class="ttl">${o.title}</span><span class="sub">${sub}</span><kbd>${o.k}</kbd></button>`;
    }).join('');
    return `<div class="panel controls">
      <div class="side-label">${teamDot(bowlT)}${esc(bowlT.name)} <span class="muted">· bowling plan</span></div>
      <div class="intent">${row(BOWL_OPTS, 'bowl', state.bowl, k => E.ballProbabilities(m, state.bat, k))}</div>
      <div class="side-label">${teamDot(batT)}${esc(batT.name)} <span class="muted">· batting shot</span></div>
      <div class="intent">${row(BAT_OPTS, 'bat', state.bat, k => E.ballProbabilities(m, k, state.bowl))}</div>
    </div>`;
  }

  function actionsHTML() {
    const i = inn();
    const auto = autoPlans() && i.bowler !== null
      ? `<div class="auto-plans"><span>${teamDot(team(i.bowl))}${esc(team(i.bowl).short)} <b>${PLAN_NAME[state.bowl]}</b></span><span>${teamDot(team(i.bat))}${esc(team(i.bat).short)} <b>${MODE_NAME[state.bat]}</b></span></div>`
      : '';
    return `<div class="panel controls actions">
      ${auto}
      <button class="primary bowl-btn" id="btn-bowl">Bowl <small class="key-hint">␣</small></button>
      <div class="action-row two">
        <button class="secondary" id="btn-auto-over" title="The computer plays the rest of this over">Auto over</button>
        <button class="secondary" id="btn-auto-inn" title="Simulate to the end of the innings">Sim innings</button>
      </div>
      <label class="toggle"><input type="checkbox" id="quick" ${state.quick ? 'checked' : ''}> Quick mode (skip the roll animation)</label>
    </div>`;
  }

  function playersHTML() {
    const i = inn();
    const bt = team(i.bat);
    const bRow = idx => {
      const b = i.batters[idx];
      return `<div class="pl-row ${idx === i.striker ? 'on-strike' : ''}"><span class="pname">${esc(bt.players[idx].name)}</span>
        <span class="num">${b.runs} (${b.balls})${b.fours || b.sixes ? ` <span class="muted">${b.fours}×4 ${b.sixes}×6</span>` : ''}</span></div>`;
    };
    const tokens = (i.overLog[i.overLog.length - 1] || []).map(t => {
      const cls = t === '4' ? 't4' : t === '6' ? 't6' : t === 'W' ? 'tW' : (t.startsWith('wd') || t.startsWith('nb')) ? 'tx' : '';
      return `<span class="tok ${cls}">${esc(t)}</span>`;
    }).join('');
    return `<div class="panel players">
      <div><h3>At the crease</h3>${i.done ? '' : bRow(i.striker) + bRow(i.nonStriker)}</div>
      <div><h3>This over</h3><div class="this-over">${tokens || '<span class="muted" style="font-size:13px">New over</span>'}</div></div>
    </div>`;
  }

  // Full bowling figures for the fielding side, always visible
  function bowlingRows(I, opts) {
    const m = state.match, bw = team(I.bowl);
    const list = bw.players.map((p, idx) => ({ p, idx, s: I.bowlers[idx] }))
      .filter(x => x.p.type || x.s)
      .sort((a, b) => {
        const ao = a.s ? a.s.order : 99, bo = b.s ? b.s.order : 99;
        return ao - bo || b.p.bowl - a.p.bowl;
      });
    return list.map(({ p, idx, s }) => {
      const balls = s ? s.balls : 0;
      const left = Math.max(0, m.maxOversPerBowler - Math.floor(balls / 6));
      const isNow = !I.done && I.bowler === idx;
      const rested = !I.done && I.bowler === null && I.lastOverBowler === idx || (!I.done && I.bowler !== null && I.lastOverBowler === idx);
      let status = '';
      if (opts.live) {
        if (isNow) status = '<span class="st now">bowling</span>';
        else if (left === 0 && p.type) status = '<span class="st done">done</span>';
        else if (rested) status = '<span class="st rest">rest</span>';
        else status = `<span class="st">${left} left</span>`;
      }
      const econ = balls ? (s.runs * 6 / balls).toFixed(1) : '–';
      return `<tr class="${isNow ? 'batting' : ''}">
        <td>${esc(p.name)} <span class="type-pill ${p.type || ''}">${p.type || 'part'}</span>${opts.live ? `<span class="how">Skill ${p.bowl}</span>` : ''}</td>
        <td>${s ? oversFig(s.balls) : '–'}</td><td>${s ? s.maidens : '–'}</td><td>${s ? s.runs : '–'}</td><td><b>${s ? s.wkts : '–'}</b></td>
        <td>${econ}</td><td>${s ? s.dots : '–'}</td>${opts.live ? `<td>${s ? s.fours + '/' + s.sixes : '–'}</td><td>${status}</td>` : `<td>${s ? s.wides + s.nbs : '–'}</td>`}</tr>`;
    }).join('');
  }

  function bowlingFiguresHTML() {
    const i = inn(), bw = team(i.bowl);
    return `<div class="panel">
      <div class="inn-title"><h2>${teamDot(bw)} ${esc(bw.name)} bowling</h2><span class="muted" style="font-size:13px">Max ${state.match.maxOversPerBowler} ov each</span></div>
      <div class="table-scroll"><table class="card"><thead><tr><th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th><th>Dots</th><th>4s/6s</th><th></th></tr></thead>
      <tbody>${bowlingRows(i, { live: true })}</tbody></table></div>
    </div>`;
  }

  function tokenFor(ev) {
    if (ev.type === 'wide') return ['wd', 'tx'];
    if (ev.type === 'noball') return ['nb', 'tx'];
    if (ev.type === 'wicket') return ['W', 'tW'];
    if (ev.runs === 4) return ['4', 't4'];
    if (ev.runs === 6) return ['6', 't6'];
    return [ev.runs === 0 ? '•' : String(ev.runs), ''];
  }

  function feedHTML() {
    const m = state.match;
    let out = '';
    for (let k = m.innings.length - 1; k >= 0; k--) {
      const I = m.innings[k];
      const items = I.log.slice().reverse().slice(0, 150).map(ev => {
        const [t, c] = tokenFor(ev);
        return `<div class="feed-item"><span class="ov">${ev.over}.${ev.ball}</span><span class="tok ${c}">${t}</span>
          <div><div class="who">${esc(ev.bowler)} to ${esc(ev.batter)} · ${PLAN_NAME[ev.bowlPlan]} vs ${MODE_NAME[ev.batMode]}</div>${esc(ev.text)}${ev.maiden ? ' <b>Maiden!</b>' : ''}</div></div>`;
      }).join('');
      out += `<div class="feed-sep">${k === 1 ? '2nd' : '1st'} innings · ${esc(team(I.bat).name)} ${I.runs}/${I.wkts}</div>${items || '<p class="muted">No balls bowled yet.</p>'}`;
    }
    return `<div class="feed">${out}</div>`;
  }

  // ======================= SCORECARD =======================
  function scorecardHTML(k) {
    const m = state.match, I = m.innings[k];
    const bt = team(I.bat);
    const rows = I.batters.filter(b => b.batted).map(b => {
      const p = bt.players[b.idx];
      const atCrease = !b.out && !I.done && (b.idx === I.striker || b.idx === I.nonStriker);
      const how = b.out ? b.out.text : 'not out';
      const sr = b.balls ? (b.runs * 100 / b.balls).toFixed(0) : '–';
      return `<tr class="${atCrease ? 'batting' : ''}"><td>${esc(p.name)}<span class="how">${esc(how)}</span></td>
        <td><b>${b.runs}</b></td><td>${b.balls}</td><td>${b.fours}</td><td>${b.sixes}</td><td>${sr}</td></tr>`;
    }).join('');
    const dnb = I.batters.filter(b => !b.batted).map(b => bt.players[b.idx].name);
    const ex = I.extras.wd + I.extras.nb;
    const fow = I.fow.map(f => `${f.runs}-${f.wkt} (${esc(f.batter)}, ${f.over})`).join(', ');
    return `<div class="scorecard">
      <div class="inn-title"><h2>${esc(bt.name)}</h2><span class="num">${I.runs}/${I.wkts} (${E.oversStr(I.balls)} ov)</span></div>
      <table class="card"><thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="card-meta">
        Extras ${ex} (wd ${I.extras.wd}, nb ${I.extras.nb})${dnb.length ? `<br>Did not bat: ${esc(dnb.join(', '))}` : ''}${fow ? `<br>Fall of wickets: ${fow}` : ''}
      </div>
      <div class="table-scroll"><table class="card"><thead><tr><th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th><th>Dots</th><th>Ext</th></tr></thead>
      <tbody>${bowlingRows(I, { live: false })}</tbody></table></div>
      <div style="height:18px"></div>
    </div>`;
  }

  // ======================= BOWLER PICKER =======================
  function openBowlerPicker() {
    const m = state.match, i = inn();
    const opts = E.eligibleBowlers(m);
    const suggested = E.cpuChooseBowler(m);
    const overNo = Math.floor(i.balls / 6) + 1;
    const bt = team(i.bowl);
    modalCard.innerHTML = `<h2>${teamDot(bt)} ${esc(bt.name)}: over ${overNo}</h2>
      <p class="muted" style="margin:6px 0 0;font-size:14px">Who bowls? Max ${m.maxOversPerBowler} over${m.maxOversPerBowler > 1 ? 's' : ''} each, no one bowls two in a row. Pitch: ${esc(E.PITCHES[m.pitch].label)}.</p>
      <div class="bowler-list">${opts.map(b => {
        const s = i.bowlers[b.idx];
        const fig = s ? `${oversFig(s.balls)}-${s.maidens}-${s.runs}-${s.wkts} · econ ${(s.runs * 6 / s.balls).toFixed(1)}` : 'yet to bowl';
        return `<button class="bowler-opt" data-b="${b.idx}">
          <span class="bn">${esc(b.name)}${b.idx === suggested ? ' <span class="muted" style="font-weight:400">· suggested</span>' : ''}</span>
          <span class="type-pill ${b.type || ''}">${b.type || 'part-time'}</span>
          <span class="bm">Skill ${b.bowl} · ${fig} · ${m.maxOversPerBowler - b.overs} over${m.maxOversPerBowler - b.overs === 1 ? '' : 's'} left</span>
        </button>`;
      }).join('')}</div>`;
    modal.hidden = false;
    modalCard.querySelectorAll('[data-b]').forEach(b => b.onclick = () => {
      E.setBowler(m, Number(b.dataset.b));
      modal.hidden = true;
      state.preview = true;
      render();
    });
  }

  // ======================= BREAK & RESULT =======================
  function topPerformers(I) {
    const bt = team(I.bat), bw = team(I.bowl);
    const bats = I.batters.filter(b => b.batted).sort((a, b) => b.runs - a.runs || a.balls - b.balls).slice(0, 2)
      .map(b => `${esc(bt.players[b.idx].name)} ${b.runs}${b.out ? '' : '*'} (${b.balls})`);
    const bowls = Object.entries(I.bowlers).sort((a, b) => b[1].wkts - a[1].wkts || a[1].runs - b[1].runs).slice(0, 2)
      .map(([idx, s]) => `${esc(bw.players[idx].name)} ${s.wkts}/${s.runs}`);
    return `<p class="muted" style="margin:0">Top bat: ${bats.join(' · ')}<br>Top ball: ${bowls.join(' · ')}</p>`;
  }

  function renderBreak() {
    const m = state.match, I = m.innings[0];
    const chaser = team(1 - I.bat);
    app.innerHTML = `<section>
      <div class="result-hero">
        <h3>Innings break</h3>
        <h1>${esc(team(I.bat).name)} ${I.runs}/${I.wkts}</h1>
        <p class="muted" style="margin:0">${E.oversStr(I.balls)} overs · run rate ${E.runRate(I.runs, I.balls).toFixed(2)}</p>
        ${topPerformers(I)}
        <h2 style="margin-top:8px">${esc(chaser.name)} need ${I.runs + 1} to win</h2>
        <button class="primary" id="btn-next">Start the chase</button>
      </div>
      <div class="panel">${scorecardHTML(0)}</div>
    </section>`;
    document.getElementById('btn-next').onclick = () => beginInnings(1 - I.bat);
  }

  function renderResult() {
    const m = state.match, r = m.result;
    const tie = r.winner === null;
    const w = tie ? null : team(r.winner);
    app.innerHTML = `<section>
      <div class="result-hero">
        <div class="trophy">${tie ? '🤝' : '🏆'}</div>
        <h1>${tie ? 'It\'s a tie!' : `${esc(w.name)} win!`}</h1>
        <h2 class="muted">${esc(r.text)}</h2>
        ${state.ctx ? `<p class="muted" style="margin:0">${esc(state.saveMsg)}</p>
        <div class="btn-row"><button class="primary" id="btn-back-comp">Back to ${esc(compById(state.ctx.compId).name)}</button></div>`
        : `<div class="btn-row"><button class="primary" id="btn-again">Rematch</button><button class="secondary" id="btn-new">New setup</button></div>`}
      </div>
      <div class="summary-grid">
        <div class="panel">${scorecardHTML(0)}</div>
        <div class="panel">${scorecardHTML(1)}</div>
      </div>
    </section>`;
    if (state.ctx) {
      document.getElementById('btn-back-comp').onclick = () => { const k = compById(state.ctx.compId).kind; state.match = null; state.ctx = null; openComp(k); };
      return;
    }
    document.getElementById('btn-again').onclick = () => {
      state.match = E.createMatch(state.setup); state.tossInfo = null; state.screen = 'toss'; render();
    };
    document.getElementById('btn-new').onclick = () => { state.screen = 'setup'; render(); };
  }

  // ======================= RULES =======================
  function openRules() {
    const T = E.BAT_TABLES;
    const rows = OUT_ORDER.map(k => `<tr><td>${OUT_LABEL[k]}</td>${['defend', 'normal', 'attack'].map(mo => {
      const tot = OUT_ORDER.reduce((s, x) => s + T[mo][x], 0);
      return `<td>${(T[mo][k] * 100 / tot).toFixed(1)}%</td>`;
    }).join('')}</tr>`).join('');
    modalCard.innerHTML = `<div class="rules">
      <h2>How you play</h2>
      <p>You captain both teams. Before each ball, pick the <b>bowling plan</b> for the fielding side and the <b>shot</b> for the batting side, then press Bowl. At the start of every over you pick who bowls. Pass the phone between two people, or play both sides yourself.</p>
      <h2>Why not a plain 1–6 die?</h2>
      <p>If a 5 means out, a batter survives only ~6 balls on average. In real T20 cricket a wicket falls roughly every 18–20 balls. So each ball is resolved from a <b>weighted table</b>. The delivery bar shows the odds, and the needle shows where the roll landed.</p>
      <h2>Base odds per legal ball (by shot)</h2>
      <table class="card"><thead><tr><th>Outcome</th><th>Defend</th><th>Normal</th><th>Attack</th></tr></thead><tbody>${rows}</tbody></table>
      <h2>What shifts the odds</h2>
      <ul>
        <li><b>Bowling plan</b>: Tight line cuts boundaries and wickets. Attack hunts wickets but leaks runs and more wides.</li>
        <li><b>Skill duel</b>: batter's batting rating vs bowler's bowling rating. Tailenders struggle against strike bowlers.</li>
        <li><b>Getting set</b>: the first 5 balls are riskier. After 25 balls a batter is harder to get out and scores faster.</li>
        <li><b>Phase</b>: the powerplay boosts fours. Death overs boost sixes and wickets.</li>
        <li><b>Pitch</b>: flat roads help batters, green tops help pacers, dusty turners help spinners.</li>
        <li><b>Extras</b>: wides (~3%) and no-balls (~0.7%). A no-ball gives a <b>free hit</b>: only a run-out can get you.</li>
      </ul>
      <p><b>Keys:</b> Q / W / E bowling plan · 1 / 2 / 3 shot · Space bowls.</p>
      <div style="margin-top:14px"><button class="primary" id="btn-close-rules">Got it</button></div>
    </div>`;
    modal.hidden = false;
    document.getElementById('btn-close-rules').onclick = () => {
      modal.hidden = true;
      if (state.screen === 'play' && E.needsBowler(state.match) && !inn().done) openBowlerPicker();
    };
  }
  document.getElementById('btn-rules').onclick = openRules;

  // ======================= STORAGE =======================
  const LS_KEY = 'cricket-dice-db';
  const PASS_KEY = 'cricket-dice-passcode';
  state.savedIds = new Set();   // match ids already in the online database
  state.compHash = {};          // last saved version of each competition (online mode)

  async function boot() {
    renderLoading();
    let db = null;
    try {
      const res = await fetch('api/db?part=core', { cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) throw new Error('no server');
      const j = await res.json();
      if (j && j.error) { renderLoadError(j.error); return; }
      if (!res.ok) throw new Error('no server');
      if (j && j.storage === 'mongo') {
        state.store = 'cloud';
        if (!j.empty) db = await loadCloud(j);
      } else {
        state.store = 'server';
        db = j;
      }
    } catch (e) {
      state.store = 'local';
      try { db = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (_) { db = null; }
    }
    if (!db || !db.players) { db = C.newDB(); state.db = db; await save(); }
    state.db = db;
    if (!db.stats || !Object.keys(db.stats).length) db.stats = C.computeStats(db);
    render();
  }

  async function loadCloud(core) {
    const matches = [];
    while (matches.length < core.matchCount) {
      const r = await fetch(`api/db?part=matches&skip=${matches.length}&limit=300`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j.matches || !j.matches.length) break;
      matches.push(...j.matches);
    }
    const db = { ...core.meta, competitions: core.competitions, matches, stats: core.stats };
    state.savedIds = new Set(matches.map(m => m.id));
    for (const comp of db.competitions) state.compHash[comp.id] = JSON.stringify(comp);
    return db;
  }

  function renderLoadError(msg) {
    app.innerHTML = `<div class="panel" style="margin-top:20px"><h2>Can't reach the database</h2>
      <p class="muted">${esc(msg)}</p>
      <p class="muted">Check MONGODB_URI and SAVE_PASSCODE in your Vercel project settings, and that Atlas Network Access allows 0.0.0.0/0. Then redeploy and reload this page.</p></div>`;
  }

  function getPass() { try { return localStorage.getItem(PASS_KEY) || ''; } catch (_) { return state._pass || ''; } }
  function setPass(v) { state._pass = v; try { localStorage.setItem(PASS_KEY, v); } catch (_) { /* memory only */ } }

  function askPass(msg) {
    modalCard.innerHTML = `<h2>Passcode to save</h2>
      <p class="muted" style="font-size:14px">${esc(msg || 'Results are saved to your online database. Enter the passcode you set in Vercel (SAVE_PASSCODE). This device will remember it.')}</p>
      <form id="pass-form" class="pass-form"><input id="pass-in" type="password" autocomplete="current-password" placeholder="Passcode" required>
      <button class="primary" type="submit">Save</button><button class="secondary" type="button" id="pass-later">Not now</button></form>`;
    modal.hidden = false;
    const inp = document.getElementById('pass-in'); inp.focus();
    document.getElementById('pass-later').onclick = () => { modal.hidden = true; showToast('Not saved. Tap "enter passcode" on the home page to save later.', true); };
    document.getElementById('pass-form').onsubmit = async e => {
      e.preventDefault();
      setPass(inp.value.trim());
      modal.hidden = true;
      await save();
      render();
    };
  }

  async function saveCloud() {
    const db = state.db;
    const pass = getPass();
    if (!pass) { state.saveMsg = 'Not saved yet: enter your passcode.'; askPass(); return false; }
    const competitions = [];
    db.competitions.forEach((comp, i) => {
      const s = JSON.stringify(comp);
      if (state.compHash[comp.id] !== s) competitions.push({ ...comp, seq: i });
    });
    const matches = [];
    db.matches.forEach((m, i) => { if (!state.savedIds.has(m.id)) matches.push({ ...m, seq: i }); });
    const meta = { app: db.app, version: db.version, createdAt: db.createdAt, players: db.players, teams: db.teams };
    try {
      const res = await fetch('api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-passcode': pass },
        body: JSON.stringify({ mode: 'save', baseRev: db.rev || 0, meta, competitions, matches, stats: db.stats }),
      });
      if (res.status === 401) { setPass(''); state.saveMsg = 'Not saved: wrong passcode.'; askPass('That passcode was not accepted. Try again.'); return false; }
      if (res.status === 409) { state.saveMsg = 'Not saved: newer results were saved from another device. Reload the page to get them.'; showToast(state.saveMsg, true); return false; }
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'save failed');
      db.rev = j.rev;
      for (const m of matches) state.savedIds.add(m.id);
      for (const comp of db.competitions) state.compHash[comp.id] = JSON.stringify(comp);
      state.saveMsg = 'Saved to your online database.';
      showToast('Saved online');
      return true;
    } catch (e) {
      state.saveMsg = 'Could not save online: ' + e.message + '. Check your connection and try again.';
      showToast(state.saveMsg, true);
      return false;
    }
  }

  function confirmBox({ title, text, ok, danger, typeWord, onOk }) {
    modalCard.innerHTML = `<h2>${esc(title)}</h2>
      <p class="muted" style="font-size:14px;line-height:1.5">${esc(text)}</p>
      ${typeWord ? `<label class="muted" for="confirm-word" style="font-size:13px">Type <b>${typeWord}</b> to confirm</label><input id="confirm-word" class="confirm-word" autocomplete="off">` : ''}
      <div class="btn-row" style="justify-content:flex-start;margin-top:14px">
        <button class="primary ${danger ? 'danger' : ''}" id="cb-ok" ${typeWord ? 'disabled' : ''}>${esc(ok)}</button>
        <button class="secondary" id="cb-cancel">Cancel</button>
      </div>`;
    modal.hidden = false;
    const okBtn = document.getElementById('cb-ok');
    if (typeWord) {
      const w = document.getElementById('confirm-word');
      w.focus();
      w.oninput = () => { okBtn.disabled = w.value.trim().toUpperCase() !== typeWord; };
    }
    document.getElementById('cb-cancel').onclick = () => { modal.hidden = true; };
    okBtn.onclick = () => { modal.hidden = true; onOk(); };
  }

  async function resetHistory() {
    const old = state.db;
    const fresh = C.newDB();
    if (state.store === 'cloud') {
      const pass = getPass();
      if (!pass) { askPass('Enter your passcode first, then press Reset again.'); return; }
      try {
        const res = await fetch('api/db', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-passcode': pass },
          body: JSON.stringify({ mode: 'replace', meta: { app: fresh.app, version: fresh.version, createdAt: fresh.createdAt, players: fresh.players, teams: fresh.teams }, competitions: [], matches: [], stats: C.computeStats(fresh) }),
        });
        const j = await res.json();
        if (res.status === 401) { setPass(''); askPass('That passcode was not accepted. Try again, then press Reset again.'); return; }
        if (!res.ok) throw new Error(j.error || 'reset failed');
        fresh.rev = j.rev;
      } catch (e) { showToast('Reset failed: ' + e.message, true); return; }
      state.savedIds = new Set(); state.compHash = {};
      state.db = fresh;
    } else {
      fresh.rev = old.rev || 0;   // local server checks the revision
      state.db = fresh;
      if (!(await save())) { state.db = old; return; }
    }
    state.db.stats = C.computeStats(state.db);
    state.match = null; state.ctx = null;
    state.screen = 'home';
    render();
    showToast('History reset. All players start from zero.');
  }

  function downloadHistory() {
    const blob = new Blob([JSON.stringify(state.db, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'history.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function save() {
    const db = state.db;
    if (state.store === 'cloud') return saveCloud();
    if (state.store === 'server') {
      try {
        const res = await fetch('api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...db, baseRev: db.rev || 0 }) });
        if (res.status === 409) { state.saveMsg = 'Not saved: newer results were saved from another device. Reload the page to get them.'; showToast(state.saveMsg, true); return false; }
        if (!res.ok) throw new Error('save failed');
        const j = await res.json();
        db.rev = j.rev;
        state.saveMsg = 'Saved to data/history.json on your computer.';
        showToast('Saved to your computer');
        return true;
      } catch (e) {
        state.saveMsg = 'Could not reach your computer. Is npm start still running?';
        showToast(state.saveMsg, true);
        return false;
      }
    }
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)); state.saveMsg = 'Saved in this browser only.'; } catch (e) { state.saveMsg = 'Could not save in this browser.'; }
    return true;
  }

  let toastTimer = null;
  function showToast(msg, bad) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = 'toast'; }, bad ? 6000 : 1800);
  }

  app.addEventListener('click', e => { if (e.target && e.target.id === 'btn-pass') askPass(); });

  function renderLoading() { app.innerHTML = '<div class="panel" style="margin-top:20px">Loading your history…</div>'; }

  function storeBanner() {
    if (state.store === 'server') return `<div class="store ok">● Saving to <b>data/history.json</b> on your computer</div>`;
    if (state.store === 'cloud') return `<div class="store ok">● Saving online to your <b>MongoDB</b> database${getPass() ? '' : ' · <button class="plink" id="btn-pass">enter passcode</button>'}</div>`;
    return `<div class="store warn">● Not connected to your computer. Results are kept in this browser only. To save to your Mac, run <code>npm start</code> and open the address it prints.</div>`;
  }

  // ======================= NAV & LOOKUPS =======================
  function navKey() {
    if (state.screen === 'comp') return state.compKind;
    if (['setup', 'toss', 'play', 'break', 'result'].includes(state.screen)) return state.ctx ? compById(state.ctx.compId).kind : 'friendly';
    return state.screen;
  }
  document.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => {
    if (!state.db) return;
    const k = b.dataset.nav;
    if (k === 'league' || k === 'cup') openComp(k);
    else if (k === 'friendly') {
      const live = state.match && !state.ctx && state.match.innings.length && !state.match.result;
      state.screen = live ? 'play' : 'setup';
      render();
      if (live && E.needsBowler(state.match) && !inn().done) openBowlerPicker();
    }
    else { state.screen = k; render(); }
  });
  function openComp(kind) { state.compKind = kind; state.screen = 'comp'; render(); }
  const compById = id => state.db.competitions.find(c => c.id === id);
  const fixtureById = ctx => compById(ctx.compId).fixtures.find(f => f.id === ctx.fixtureId);
  const pmap = () => C.playerMap(state.db);
  const tname = (kind, id) => C.teamOf(state.db, kind, id).name;
  const tcolor = (kind, id) => C.teamOf(state.db, kind, id).color;
  const chipTeam = (kind, id) => `<span class="tchip"><span class="dot" style="background:${tcolor(kind, id)}"></span>${esc(tname(kind, id))}</span>`;
  function fixtureLabel(comp, f) {
    if (f.label) return `${comp.name} ${f.label}`;
    if (f.stage === 'group') return `${comp.name} Group ${f.group}, match ${f.round}`;
    return `${comp.name} round ${f.round}`;
  }
  function liveMatchInProgress() { return state.match && state.match.innings.length && !state.match.result; }

  // ======================= HOME =======================
  function compCardHTML(kind) {
    const cfg = C.COMPS[kind];
    const comp = C.activeComp(state.db, kind) || C.lastComp(state.db, kind);
    const blurb = kind === 'league'
      ? `16 German states · 7 players each · ${cfg.overs} overs · everyone plays everyone, top 4 to the semifinals`
      : `24 German cities · 5 players each · ${cfg.overs} overs · 8 groups of 3, top 2 into a knockout`;
    let status = '<span class="muted">No season played yet</span>';
    if (comp && comp.status === 'complete') status = `Season ${comp.season} champions: <b>${esc(comp.summary.champion)}</b>`;
    else if (comp) {
      const done = comp.fixtures.filter(f => f.result).length;
      status = `Season ${comp.season} · ${C.STAGE_LABEL[comp.stage]} · ${done} of ${comp.fixtures.length} matches played`;
    }
    return `<button class="comp-card ${kind}" data-open="${kind}">
      <span class="cc-kicker">${kind === 'league' ? 'League' : 'Tournament'}</span>
      <span class="cc-name">${cfg.name}</span>
      <span class="cc-blurb">${blurb}</span>
      <span class="cc-status">${status}</span>
    </button>`;
  }

  function leadersHTML(statsObj, key, n, label) {
    const pm = pmap();
    const rows = Object.entries(statsObj).filter(([, s]) => s.mat)
      .sort((a, b) => key === 'wkts' ? (b[1].wkts - a[1].wkts || a[1].runsConceded - b[1].runsConceded) : (b[1].runs - a[1].runs || a[1].balls - b[1].balls))
      .slice(0, n);
    if (!rows.length) return `<div class="lead"><h3>${label}</h3><p class="muted" style="font-size:13px">No matches yet.</p></div>`;
    return `<div class="lead"><h3>${label}</h3><ol>${rows.map(([pid, s]) => `<li><button class="plink" data-player="${pid}">${esc(pm[pid].name)}</button><span class="num">${key === 'wkts' ? `${s.wkts} <small>wkts</small>` : `${s.runs} <small>runs</small>`}</span></li>`).join('')}</ol></div>`;
  }

  function renderHome() {
    const db = state.db;
    const all = Object.fromEntries(Object.entries(db.stats).map(([k, v]) => [k, v.all]));
    const played = db.matches.length;
    app.innerHTML = `<section class="home">
      <div class="setup-hero">
        <h1>Cricket Dice</h1>
        <p>Two competitions, one squad of 120 players. Every run and wicket counts toward each player's career, whichever team they're playing for.</p>
      </div>
      ${storeBanner()}
      ${liveMatchInProgress() ? `<div class="panel resume"><div><b>Match in progress</b><div class="muted">${esc(state.match.teams[0].name)} vs ${esc(state.match.teams[1].name)}</div></div><button class="primary" id="btn-resume">Resume</button></div>` : ''}
      <div class="comp-grid">${compCardHTML('league')}${compCardHTML('cup')}</div>
      <div class="panel">
        <div class="inn-title"><h2>Career leaders</h2><span class="muted" style="font-size:13px">${played} match${played === 1 ? '' : 'es'} played</span></div>
        <div class="leaders">${leadersHTML(all, 'runs', 5, 'Most runs')}${leadersHTML(all, 'wkts', 5, 'Most wickets')}</div>
        <div style="margin-top:12px"><button class="secondary" data-go="players">All player stats →</button></div>
      </div>
    </section>`;
    app.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openComp(b.dataset.open));
    app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { state.screen = b.dataset.go; render(); });
    const rs = document.getElementById('btn-resume'); if (rs) rs.onclick = () => { state.screen = 'play'; render(); if (E.needsBowler(state.match) && !inn().done) openBowlerPicker(); };
    bindPlayerLinks();
  }

  // ======================= COMPETITION =======================
  function renderComp(kind) {
    const db = state.db;
    const comp = C.activeComp(db, kind) || C.lastComp(db, kind);
    const cfg = C.COMPS[kind];
    if (!comp) {
      app.innerHTML = `<section>
        <div class="setup-hero"><h1>${cfg.name}</h1><p>${kind === 'league'
          ? `All 16 German states, 7 players each, ${cfg.overs}-over matches. Every team plays every other team once (120 matches). The top 4 meet in the semifinals, then the final.`
          : `The 24 biggest German cities, 5 players each, ${cfg.overs}-over matches. 8 groups of 3; the top 2 in each group go into a Round of 16, then quarterfinals, semifinals and the final.`}</p></div>
        ${storeBanner()}
        <div style="margin-top:16px"><button class="primary" id="btn-new-season">Start season 1</button></div>
        <div class="panel" style="margin-top:16px">${squadsHTML(kind)}</div>
      </section>`;
      document.getElementById('btn-new-season').onclick = () => { C.startCompetition(db, kind); save(); render(); };
      bindPlayerLinks();
      return;
    }
    const tabs = kind === 'league'
      ? [['table', 'Table'], ['playoffs', 'Playoffs'], ['fixtures', 'Fixtures'], ['leaders', 'Leaders'], ['squads', 'Squads']]
      : [['groups', 'Groups'], ['knockout', 'Knockout'], ['fixtures', 'Fixtures'], ['leaders', 'Leaders'], ['squads', 'Squads']];
    let tab = state.compTab[kind];
    const done = comp.fixtures.filter(f => f.result).length;
    const next = C.pendingFixtures(comp)[0];
    const stageLeft = C.pendingFixtures(comp).filter(f => f.stage === comp.stage).length;

    let top;
    if (comp.status === 'complete') {
      top = `<div class="champ">
        <div class="trophy">🏆</div>
        <div><div class="cc-kicker">Season ${comp.season} champions</div><h2 class="champ-name">${esc(comp.summary.champion)}</h2>
        <div class="muted">${esc(comp.summary.final.result)} · Player of the final: ${esc(comp.summary.final.motm)}</div></div>
        <button class="primary" id="btn-new-season">Start season ${comp.season + 1}</button>
      </div>`;
    } else {
      top = `<div class="next">
        <div class="next-info">
          <div class="cc-kicker">Next match · ${esc(fixtureLabel(comp, next))}</div>
          <div class="next-teams">${chipTeam(kind, next.home)}<span class="vs">vs</span>${chipTeam(kind, next.away)}</div>
          <div class="muted" style="font-size:13px">${comp.overs} overs · ${esc(E.PITCHES[next.pitch].label)} pitch</div>
        </div>
        <div class="next-actions">
          <button class="primary" data-play="${next.id}">Play</button>
          <button class="secondary" data-sim="${next.id}">Quick sim</button>
          ${stageLeft > 1 ? `<button class="secondary" data-simn="8">Sim ${Math.min(8, stageLeft)}</button><button class="secondary" data-simn="stage">Sim rest of ${C.STAGE_LABEL[comp.stage].toLowerCase()}</button>` : ''}
        </div>
      </div>`;
    }

    let body = '';
    if (tab === 'table') body = leagueTableHTML(comp);
    else if (tab === 'groups') body = groupsHTML(comp);
    else if (tab === 'playoffs' || tab === 'knockout') body = bracketHTML(comp);
    else if (tab === 'fixtures') body = fixturesHTML(comp);
    else if (tab === 'leaders') {
      const st = C.competitionStats(db, comp.id);
      body = `<div class="leaders">${leadersHTML(st, 'runs', 10, 'Most runs this season')}${leadersHTML(st, 'wkts', 10, 'Most wickets this season')}</div>`;
    } else body = squadsHTML(kind);

    app.innerHTML = `<section class="comp">
      <div class="comp-head">
        <div><div class="cc-kicker">${kind === 'league' ? 'League' : 'Tournament'} · Season ${comp.season}</div><h1>${comp.name}</h1>
        <div class="muted">${C.STAGE_LABEL[comp.stage]}${comp.status === 'complete' ? ' · complete' : ''} · ${done} of ${comp.fixtures.length} matches played</div></div>
      </div>
      ${storeBanner()}
      <div class="panel">${top}</div>
      <div class="panel">
        <div class="tabs scroll-tabs">${tabs.map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-ctab="${k}">${l}</button>`).join('')}</div>
        ${body}
      </div>
    </section>`;

    app.querySelectorAll('[data-ctab]').forEach(b => b.onclick = () => { state.compTab[kind] = b.dataset.ctab; renderComp(kind); });
    app.querySelectorAll('[data-play]').forEach(b => b.onclick = () => playFixture(comp, b.dataset.play));
    app.querySelectorAll('[data-sim]').forEach(b => b.onclick = () => simFixtures(comp, [b.dataset.sim]));
    app.querySelectorAll('[data-simn]').forEach(b => b.onclick = () => {
      const pend = C.pendingFixtures(comp).filter(f => f.stage === comp.stage);
      const ids = (b.dataset.simn === 'stage' ? pend : pend.slice(0, 8)).map(f => f.id);
      confirmBox({
        title: `Simulate ${ids.length} matches?`,
        text: `The computer will play ${ids.length} ${comp.name} matches and save the results. This can't be undone.`,
        ok: `Simulate ${ids.length}`,
        onOk: () => simFixtures(comp, ids),
      });
    });
    app.querySelectorAll('[data-match]').forEach(b => b.onclick = () => openMatchCard(b.dataset.match));
    const ns = document.getElementById('btn-new-season');
    if (ns) ns.onclick = () => { C.startCompetition(db, kind); state.compTab[kind] = kind === 'league' ? 'table' : 'groups'; save(); render(); };
    bindPlayerLinks();
  }

  function playFixture(comp, fid) {
    if (liveMatchInProgress() && !(state.ctx && state.ctx.fixtureId === fid)) {
      showToast('Finish or resume the match in progress first (Home → Resume).', true); return;
    }
    const f = comp.fixtures.find(x => x.id === fid);
    state.ctx = { compId: comp.id, fixtureId: f.id, recorded: false };
    state.match = C.buildMatch(state.db, comp, f);
    state.tossInfo = null; state.screen = 'toss';
    render();
  }

  async function simFixtures(comp, ids) {
    for (const id of ids) {
      const f = comp.fixtures.find(x => x.id === id);
      if (!f || f.result) continue;
      if (state.ctx && state.ctx.fixtureId === id && liveMatchInProgress()) continue;
      C.recordMatch(state.db, comp.id, f.id, C.simulateFixture(state.db, comp, f), 'sim');
    }
    if (comp.status === 'complete') state.compTab[comp.kind] = comp.kind === 'league' ? 'playoffs' : 'knockout';
    render();
    await save();
  }

  function standingsTable(kind, rows, qualify) {
    return `<div class="table-scroll"><table class="card standings"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>T</th><th>Pts</th><th>NRR</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${i < qualify ? 'q' : ''}"><td>${i + 1}</td><td><span class="tchip"><span class="dot" style="background:${tcolor(kind, r.id)}"></span><span class="full">${esc(tname(kind, r.id))}</span><span class="abbr">${esc(C.teamOf(state.db, kind, r.id).short)}</span></span></td><td>${r.p}</td><td>${r.w}</td><td>${r.l}</td><td>${r.t}</td><td><b>${r.pts}</b></td><td>${r.p ? (r.nrr >= 0 ? '+' : '') + r.nrr.toFixed(2) : '–'}</td></tr>`).join('')}
    </tbody></table></div>`;
  }
  function leagueTableHTML(comp) {
    return standingsTable('league', C.leagueTable(state.db, comp), 4) + `<p class="muted note">Top 4 reach the semifinals. Win 2 pts, tie 1. Ties on points split by net run rate.</p>`;
  }
  function groupsHTML(comp) {
    return `<div class="groups">${Object.keys(comp.groups).map(g => `<div><h3>Group ${g}</h3>${standingsTable('cup', C.groupTable(state.db, comp, g), 2)}</div>`).join('')}</div>
      <p class="muted note">Top 2 in each group reach the Round of 16.</p>`;
  }

  function koMatchHTML(comp, f) {
    if (!f) return `<div class="ko tbd"><span class="muted">To be decided</span></div>`;
    const kind = comp.kind;
    const side = id => {
      const won = f.result && f.result.winner === id;
      return `<div class="ko-side ${f.result ? (won ? 'won' : 'lost') : ''}">${chipTeam(kind, id)}<span class="num">${f.result ? esc(f.result.score[id]) : ''}</span></div>`;
    };
    return `<div class="ko">${side(f.home)}${side(f.away)}
      <div class="ko-foot">${f.result ? `<button class="plink" data-match="${f.id}">Scorecard</button>` : `<button class="plink" data-play="${f.id}">Play</button> · <button class="plink" data-sim="${f.id}">Sim</button>`}</div></div>`;
  }
  function bracketHTML(comp) {
    const st = s => comp.fixtures.filter(f => f.stage === s);
    const stages = comp.kind === 'league' ? [['SF', 'Semifinals', 2], ['F', 'Final', 1]] : [['R16', 'Round of 16', 8], ['QF', 'Quarterfinals', 4], ['SF', 'Semifinals', 2], ['F', 'Final', 1]];
    const cols = stages.map(([s, label, n]) => {
      const list = st(s);
      return `<div class="bcol"><h3>${label}</h3><div class="bcol-list">${Array.from({ length: n }, (_, i) => koMatchHTML(comp, list[i])).join('')}</div></div>`;
    }).join('');
    const intro = comp.kind === 'league' ? 'Semifinals: 1st v 4th and 2nd v 3rd after the league stage.' : 'Group winners play runners-up from the neighbouring group.';
    return `<p class="muted note" style="margin-top:0">${intro} A tied knockout is decided on boundary count.</p><div class="bracket">${cols}</div>`;
  }

  function fixturesHTML(comp) {
    const kind = comp.kind;
    const groups = [];
    for (const f of comp.fixtures) {
      const key = f.stage === 'league' ? `Round ${f.round}` : f.stage === 'group' ? `Group stage · matchday ${f.round}` : C.STAGE_LABEL[f.stage];
      let g = groups.find(x => x.key === key); if (!g) groups.push(g = { key, list: [] });
      g.list.push(f);
    }
    // show unfinished rounds first, newest results after
    const open = groups.filter(g => g.list.some(f => !f.result)), closed = groups.filter(g => g.list.every(f => f.result)).reverse();
    return [...open, ...closed].map(g => `<div class="fx-group"><h3>${g.key}</h3>${g.list.map(f => `<div class="fx">
        <div class="fx-teams">${f.group ? `<span class="gtag">${f.group}</span>` : ''}${chipTeam(kind, f.home)}<span class="vs">v</span>${chipTeam(kind, f.away)}</div>
        <div class="fx-res">${f.result ? `<button class="plink" data-match="${f.id}">${esc(f.result.text)}</button>` : `<button class="mini" data-play="${f.id}">Play</button><button class="mini ghost" data-sim="${f.id}">Sim</button>`}</div>
      </div>`).join('')}</div>`).join('');
  }

  function squadsHTML(kind) {
    const pm = pmap();
    const teams = state.db.teams[kind];
    const reserves = kind === 'league' ? state.db.players.filter(p => !p.state) : [];
    const card = (t) => `<div class="squad"><h3>${chipTeam(kind, t.id)}</h3><ul>${t.players.map(id => pm[id]).sort((a, b) => b.bat - a.bat).map(p => `<li><button class="plink" data-player="${p.id}">${esc(p.name)}</button><span class="rt">BAT ${p.bat} · BOWL ${p.bowl} <span class="type-pill ${p.type}">${p.type}</span></span></li>`).join('')}</ul></div>`;
    return `<p class="muted note" style="margin-top:0">${kind === 'league'
      ? 'Each state fields 7 players: its own cities\' players first, with small states topped up from the big ones.'
      : 'Each city fields its 5 players.'} Every player bowls.</p>
      <div class="squads">${teams.map(card).join('')}</div>
      ${reserves.length ? `<p class="muted note">Not in a state squad this year (they still play in the Städtepokal): ${reserves.map(p => esc(p.name)).join(', ')}</p>` : ''}`;
  }

  // ======================= SCORECARD (saved match) =======================
  function openMatchCard(id) {
    const m = state.db.matches.find(x => x.id === id);
    if (!m) return;
    const pm = pmap(), kind = m.comp;
    const inns = m.innings.map(I => {
      const bowlTeam = m.teams.find(t => t !== I.team);
      return `<div class="inn-title"><h2>${chipTeam(kind, I.team)}</h2><span class="num">${I.runs}/${I.wkts} (${E.oversStr(I.balls)} ov)</span></div>
      <div class="table-scroll"><table class="card"><thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>
        ${I.batting.map(b => `<tr><td><button class="plink" data-player="${b.pid}">${esc(pm[b.pid].name)}</button><span class="how">${esc(b.how)}</span></td><td><b>${b.r}</b></td><td>${b.b}</td><td>${b.f4}</td><td>${b.s6}</td><td>${b.b ? (b.r * 100 / b.b).toFixed(0) : '–'}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="card-meta">Extras ${I.extras}${I.dnb.length ? ` · Did not bat: ${I.dnb.map(p => esc(pm[p].name)).join(', ')}` : ''}</div>
      <div class="table-scroll"><table class="card"><thead><tr><th>${esc(tname(kind, bowlTeam))} bowling</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th></tr></thead><tbody>
        ${I.bowling.map(b => `<tr><td><button class="plink" data-player="${b.pid}">${esc(pm[b.pid].name)}</button></td><td>${E.oversStr(b.balls).replace('.0', '')}</td><td>${b.m}</td><td>${b.r}</td><td><b>${b.w}</b></td><td>${b.balls ? (b.r * 6 / b.balls).toFixed(1) : '–'}</td></tr>`).join('')}
      </tbody></table></div><div style="height:14px"></div>`;
    }).join('');
    modalCard.innerHTML = `<div class="cc-kicker">${esc(m.compName)} S${m.season} · ${esc(C.STAGE_LABEL[m.stage])}${m.group ? ' ' + m.group : ''} · ${m.mode === 'played' ? 'played' : 'simulated'}</div>
      <h2 style="margin:4px 0 2px">${esc(m.result)}</h2>
      <p class="muted" style="margin:0 0 10px;font-size:13px">Player of the match: <button class="plink" data-player="${m.motm}">${esc(pm[m.motm].name)}</button> · ${esc(E.PITCHES[m.pitch].label)} pitch</p>
      ${inns}
      <button class="primary" id="btn-close-modal">Close</button>`;
    modal.hidden = false;
    document.getElementById('btn-close-modal').onclick = () => { modal.hidden = true; };
    bindPlayerLinks(modalCard);
  }

  // ======================= PLAYERS =======================
  const PL_COLS = [
    ['name', 'Player'], ['mat', 'Mat'], ['runs', 'Runs'], ['balls', 'Balls'], ['hs', 'HS'], ['avg', 'Avg'], ['sr', 'SR'], ['f4', '4s'], ['s6', '6s'],
    ['wkts', 'Wkts'], ['overs', 'Ov'], ['econ', 'Econ'], ['best', 'Best'], ['motm', 'PoM'],
  ];
  function renderPlayers() {
    const db = state.db, pm = pmap();
    const f = state.plFilter, q = state.plSearch.trim().toLowerCase();
    let rows = db.players.map(p => ({ p, s: C.fmtStats(db.stats[p.id][f]) }));
    if (q) rows = rows.filter(r => r.p.name.toLowerCase().includes(q) || tname('cup', r.p.city).toLowerCase().includes(q) || (r.p.state && tname('league', r.p.state).toLowerCase().includes(q)));
    const key = state.plSort;
    const num = (r) => {
      const s = r.s;
      if (key === 'avg') return s.avg === '–' ? -1 : +s.avg;
      if (key === 'sr') return s.sr === '–' ? -1 : +s.sr;
      if (key === 'econ') return s.econ === '–' ? 999 : +s.econ;
      if (key === 'overs') return s.ballsBowled;
      if (key === 'best') return s.bestW * 1000 - s.bestR;
      return s[key];
    };
    rows.sort((a, b) => key === 'name' ? a.p.name.localeCompare(b.p.name) : key === 'econ' ? num(a) - num(b) : (num(b) - num(a) || b.s.runs - a.s.runs));
    const fChip = (k, l) => `<button class="chip ${f === k ? 'selected' : ''}" data-plf="${k}">${l}</button>`;
    app.innerHTML = `<section>
      <div class="setup-hero"><h1>Player stats</h1><p>All 120 players. Career totals combine both competitions; switch to see each one alone. Tap a column to sort, tap a name for the full record.</p></div>
      <div class="panel">
        <div class="pl-tools">
          <div class="chips">${fChip('all', 'Career')}${fChip('league', 'Länderliga')}${fChip('cup', 'Städtepokal')}</div>
          <input id="pl-search" type="search" placeholder="Search name, city or state" value="${esc(state.plSearch)}">
        </div>
        <div class="table-scroll"><table class="card players-table"><thead><tr>${PL_COLS.map(([k, l]) => `<th class="${k === key ? 'sorted' : ''}"><button data-sort="${k}">${l}</button></th>`).join('')}</tr></thead><tbody>
          ${rows.map(({ p, s }) => `<tr><td><button class="plink" data-player="${p.id}">${esc(p.name)}</button><span class="how">${esc(tname('cup', p.city))}${p.state ? ' · ' + esc(C.teamOf(db, 'league', p.state).short) : ''}</span></td>
            <td>${s.mat}</td><td><b>${s.runs}</b></td><td>${s.balls}</td><td>${s.hsText}</td><td>${s.avg}</td><td>${s.sr}</td><td>${s.f4}</td><td>${s.s6}</td>
            <td><b>${s.wkts}</b></td><td>${s.overs}</td><td>${s.econ}</td><td>${s.best}</td><td>${s.motm}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
    </section>`;
    app.querySelectorAll('[data-plf]').forEach(b => b.onclick = () => { state.plFilter = b.dataset.plf; renderPlayers(); });
    app.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { state.plSort = b.dataset.sort; renderPlayers(); });
    const s = document.getElementById('pl-search');
    s.oninput = () => { state.plSearch = s.value; const pos = s.selectionStart; renderPlayers(); const n = document.getElementById('pl-search'); n.focus(); n.setSelectionRange(pos, pos); };
    bindPlayerLinks();
  }

  function bindPlayerLinks(rootEl) {
    (rootEl || app).querySelectorAll('[data-player]').forEach(b => b.onclick = e => { e.stopPropagation(); openPlayer(b.dataset.player); });
  }

  function openPlayer(pid) {
    const db = state.db, p = pmap()[pid], st = db.stats[pid];
    const row = (label, s) => { s = C.fmtStats(s); return `<tr><td>${label}</td><td>${s.mat}</td><td>${s.inn}</td><td><b>${s.runs}</b></td><td>${s.balls}</td><td>${s.hsText}</td><td>${s.avg}</td><td>${s.sr}</td><td>${s.f4}</td><td>${s.s6}</td><td>${s.thirties}/${s.fifties}</td></tr>`; };
    const brow = (label, s) => { s = C.fmtStats(s); return `<tr><td>${label}</td><td>${s.overs}</td><td>${s.maidens}</td><td>${s.runsConceded}</td><td><b>${s.wkts}</b></td><td>${s.best}</td><td>${s.bowlAvg}</td><td>${s.econ}</td><td>${s.dots}</td></tr>`; };
    const recent = db.matches.filter(m => m.innings.some(I => I.batting.some(b => b.pid === pid) || I.dnb.includes(pid) || I.bowling.some(b => b.pid === pid))).slice(-6).reverse();
    const roleName = { bat: 'Batter', ar: 'All-rounder', bowl: 'Bowler' }[p.role];
    modalCard.innerHTML = `<div class="cc-kicker">${roleName} · ${p.type === 'pace' ? 'Pace' : 'Spin'} · BAT ${p.bat} · BOWL ${p.bowl}</div>
      <h2 style="margin:4px 0">${esc(p.name)}</h2>
      <p class="muted" style="margin:0 0 12px;font-size:14px">Städtepokal: ${esc(tname('cup', p.city))} · Länderliga: ${p.state ? esc(tname('league', p.state)) : 'not in a state squad'}</p>
      <h3>Batting</h3>
      <div class="table-scroll"><table class="card"><thead><tr><th></th><th>Mat</th><th>Inn</th><th>Runs</th><th>Balls</th><th>HS</th><th>Avg</th><th>SR</th><th>4s</th><th>6s</th><th>30/50</th></tr></thead><tbody>
        ${row('Career', st.all)}${row('Länderliga', st.league)}${row('Städtepokal', st.cup)}</tbody></table></div>
      <h3 style="margin-top:14px">Bowling</h3>
      <div class="table-scroll"><table class="card"><thead><tr><th></th><th>Ov</th><th>M</th><th>R</th><th>W</th><th>Best</th><th>Avg</th><th>Econ</th><th>Dots</th></tr></thead><tbody>
        ${brow('Career', st.all)}${brow('Länderliga', st.league)}${brow('Städtepokal', st.cup)}</tbody></table></div>
      <h3 style="margin-top:14px">Recent matches</h3>
      ${recent.length ? `<div class="recent">${recent.map(m => {
        let bat = '', bowl = '';
        for (const I of m.innings) { const b = I.batting.find(x => x.pid === pid); if (b) bat = `${b.r}${b.out ? '' : '*'} (${b.b})`; const w = I.bowling.find(x => x.pid === pid); if (w) bowl = `${w.w}/${w.r}`; }
        return `<button class="recent-row" data-match="${m.id}"><span>${esc(m.compName)} · ${esc(m.teams.map(t => C.teamOf(db, m.comp, t).short).join(' v '))}</span><span class="num">${bat || 'dnb'}${bowl ? ' · ' + bowl : ''}</span></button>`;
      }).join('')}</div>` : '<p class="muted" style="font-size:13px">No matches yet.</p>'}
      <div style="margin-top:14px"><button class="primary" id="btn-close-modal">Close</button></div>`;
    modal.hidden = false;
    document.getElementById('btn-close-modal').onclick = () => { modal.hidden = true; };
    modalCard.querySelectorAll('[data-match]').forEach(b => b.onclick = () => openMatchCard(b.dataset.match));
  }

  // ======================= HISTORY =======================
  function renderHistory() {
    const db = state.db, pm = pmap();
    const comps = db.competitions.slice().reverse();
    const all = Object.entries(db.stats).map(([pid, s]) => ({ pid, s: s.all }));
    // single-match records
    let hs = null, bb = null;
    for (const m of db.matches) for (const I of m.innings) {
      for (const b of I.batting) if (!hs || b.r > hs.r) hs = { ...b, m };
      for (const b of I.bowling) if (!bb || b.w > bb.w || (b.w === bb.w && b.r < bb.r)) bb = { ...b, m };
    }
    const mostR = all.slice().sort((a, b) => b.s.runs - a.s.runs)[0], mostW = all.slice().sort((a, b) => b.s.wkts - a.s.wkts)[0];
    const champs = {};
    for (const c of db.competitions.filter(c => c.status === 'complete')) champs[c.summary.champion] = (champs[c.summary.champion] || 0) + 1;
    const rec = (label, val, sub, pid, mid) => `<div class="rec"><div class="cc-kicker">${label}</div><div class="rec-val">${val}</div><div class="muted" style="font-size:13px">${pid ? `<button class="plink" data-player="${pid}">${esc(pm[pid].name)}</button>` : ''}${sub ? ' · ' + sub : ''}${mid ? ` · <button class="plink" data-match="${mid}">scorecard</button>` : ''}</div></div>`;
    const card = c => {
      if (c.status !== 'complete') {
        const done = c.fixtures.filter(f => f.result).length;
        return `<div class="panel hist"><div class="cc-kicker">${c.kind === 'league' ? 'League' : 'Tournament'} · in progress</div><h2>${c.name} · Season ${c.season}</h2><p class="muted">${C.STAGE_LABEL[c.stage]} · ${done} of ${c.fixtures.length} matches played</p><button class="secondary" data-open="${c.kind}">Open</button></div>`;
      }
      const S = c.summary;
      const ko = k => `<div class="hk"><div class="cc-kicker">${esc(k.label)}</div><div>${esc(k.result)}</div><div class="muted" style="font-size:12px">${esc(k.score)}</div><button class="plink" data-match="${k.id}">Scorecard</button></div>`;
      const lst = (arr, key) => `<ol class="mini-list">${arr.slice(0, 3).map(x => `<li><button class="plink" data-player="${x.pid}">${esc(x.name)}</button> <span class="num">${key === 'runs' ? x.runs : x.wkts + ' wkts'}</span></li>`).join('')}</ol>`;
      return `<div class="panel hist">
        <div class="cc-kicker">${c.kind === 'league' ? 'League' : 'Tournament'} · Season ${c.season} · finished ${new Date(c.finishedAt).toLocaleDateString()}</div>
        <h2>${c.name} · Season ${c.season}</h2>
        <div class="hist-champ"><span class="trophy-s">🏆</span><div><b>${esc(S.champion)}</b> champions<div class="muted" style="font-size:13px">Runners-up: ${esc(S.runnerUp)}</div></div></div>
        <div class="hist-grid">
          ${ko(S.final)}${S.semifinals.map(ko).join('')}
          <div class="hk"><div class="cc-kicker">Top run scorers</div>${lst(S.topRuns, 'runs')}</div>
          <div class="hk"><div class="cc-kicker">Top wicket takers</div>${lst(S.topWkts, 'wkts')}</div>
        </div>
      </div>`;
    };
    app.innerHTML = `<section>
      <div class="setup-hero"><h1>History</h1><p>Every season of both competitions, with finals, semifinals and leading players.${state.store === 'cloud' ? ' Stored in your MongoDB database.' : state.store === 'server' ? ' Stored in data/history.json.' : ''}</p>
        <div class="btn-row" style="justify-content:flex-start;margin-top:12px">
          ${state.store !== 'local' ? '<button class="secondary" id="btn-download">Download history.json</button>' : ''}
          <button class="secondary danger-ghost" id="btn-reset">Reset all history</button>
        </div></div>
      ${db.matches.length ? `<div class="panel"><div class="records">
        ${rec('Most career runs', mostR.s.runs, `${mostR.s.mat} matches`, mostR.pid)}
        ${rec('Most career wickets', mostW.s.wkts, `${mostW.s.mat} matches`, mostW.pid)}
        ${hs ? rec('Highest score', `${hs.r}${hs.out ? '' : '*'}`, `${hs.b} balls, ${esc(hs.m.compName)}`, hs.pid, hs.m.id) : ''}
        ${bb ? rec('Best bowling', `${bb.w}/${bb.r}`, esc(bb.m.compName), bb.pid, bb.m.id) : ''}
        ${Object.keys(champs).length ? `<div class="rec"><div class="cc-kicker">Most titles</div><div class="rec-val small">${Object.entries(champs).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${esc(t)} ${n}`).join(' · ')}</div></div>` : ''}
      </div></div>` : ''}
      ${comps.length ? comps.map(card).join('') : '<div class="panel"><p class="muted" style="margin:0">No seasons yet. Start the Länderliga or the Städtepokal from the menu.</p></div>'}
    </section>`;
    app.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openComp(b.dataset.open));
    app.querySelectorAll('[data-match]').forEach(b => b.onclick = () => openMatchCard(b.dataset.match));
    const dl = document.getElementById('btn-download'); if (dl) dl.onclick = downloadHistory;
    document.getElementById('btn-reset').onclick = () => confirmBox({
      title: 'Reset all history?',
      text: `This permanently deletes every season, scorecard and player stat (${db.matches.length} matches). The 120 players and their teams stay. It can't be undone.`,
      ok: 'Delete everything', danger: true, typeWord: 'RESET',
      onOk: resetHistory,
    });
    bindPlayerLinks();
  }

  // ======================= KEYBOARD =======================
  document.addEventListener('keydown', e => {
    if (state.screen !== 'play' || !modal.hidden || state.busy) return;
    if (e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    const bat = BAT_OPTS.find(o => o.k === k);
    const bowl = BOWL_OPTS.find(o => o.k.toLowerCase() === k);
    if (!autoPlans() && bat) { state.bat = bat.key; state.preview = true; renderPlay(); }
    if (!autoPlans() && bowl) { state.bowl = bowl.key; state.preview = true; renderPlay(); }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); playBall(); }
  });

  boot();
})();
