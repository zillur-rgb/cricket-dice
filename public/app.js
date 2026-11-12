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
    homeTab: 'recent',  // home leaderboard: last 3 matches by default
    db: null,           // league/tournament history (saved to data/history.json)
    store: 'loading',   // 'server' | 'local' | 'loading'
    saveMsg: '',
    ctx: null,          // { compId, fixtureId, recorded } when the live match belongs to a competition
    compTab: { league: 'div1', cup: 'groups' },
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
    if (state.screen === 'profiles') return showProfiles();
    document.querySelector('.mainnav').hidden = false;
    if (state.screen === 'home') renderHome();
    else if (state.screen === 'comp') renderComp(state.compKind);
    else if (state.screen === 'players') renderPlayers();
    else if (state.screen === 'history') renderHistory();
    else if (state.screen === 'transfers') renderTransfers();
    else if (state.screen === 'setup') renderSetup();
    else if (state.screen === 'toss') renderToss();
    else if (state.screen === 'play') renderPlay();
    else if (state.screen === 'break') renderBreak();
    else if (state.screen === 'superover') renderSuperOverBreak();
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
      const d = E.tossDecision(state.match, t.winner);
      body = `<h2>It's ${t.coin}! ${esc(w.name)} won the toss and chose to <span class="toss-pick">${d.choice} first</span>.</h2>
        <p class="muted">${esc(d.reason)}.</p>
        <div class="btn-row"><button class="primary" data-choose="${d.choice}">Start match</button></div>
        <p class="muted toss-auto" id="toss-auto">Starting in 3…</p>`;
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
    // The toss winner's captain decides automatically; the match starts by itself after a moment
    const go = choice => {
      clearInterval(state.tossTimer); state.tossTimer = null;
      if (state.screen !== 'toss' || !state.tossInfo || state.tossInfo.flipping) return;
      const w = state.tossInfo.winner;
      beginInnings(choice === 'bat' ? w : 1 - w);
    };
    clearInterval(state.tossTimer); state.tossTimer = null;
    const startBtn = app.querySelector('[data-choose]');
    if (startBtn) {
      startBtn.onclick = () => go(startBtn.dataset.choose);
      let n = 3;
      state.tossTimer = setInterval(() => {
        const el = document.getElementById('toss-auto');
        if (!el) { clearInterval(state.tossTimer); state.tossTimer = null; return; }
        if (--n <= 0) go(startBtn.dataset.choose); else el.textContent = `Starting in ${n}…`;
      }, 1000);
    }
  }

  // ---------- Unfinished matches survive a reload (kept on this device) ----------
  const liveKey = () => `cricket-dice-live:${state.store === 'cloud' && state.profile ? state.profile.id : 'local'}`;
  function saveLive() {
    try {
      const m = state.match;
      if (m && m.innings.length && !m.result) localStorage.setItem(liveKey(), JSON.stringify({ ctx: state.ctx, match: m, savedAt: Date.now() }));
      else localStorage.removeItem(liveKey());
    } catch (_) { /* storage unavailable: nothing to keep */ }
  }
  function restoreLive() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(liveKey()) || 'null'); } catch (_) { saved = null; }
    if (!saved || !saved.match || saved.match.result) return;
    if (saved.ctx) {
      const comp = state.db.competitions.find(c => c.id === saved.ctx.compId);
      const f = comp && comp.fixtures.find(x => x.id === saved.ctx.fixtureId);
      if (!comp || !f || f.result) { try { localStorage.removeItem(liveKey()); } catch (_) { /* ignore */ } return; }
      saved.ctx.recorded = false;
    }
    state.match = saved.match; state.ctx = saved.ctx || null;
    state.bat = 'normal'; state.bowl = 'normal'; state.last = null; state.preview = true; state.autoKey = null;
  }
  function resumeLive() {
    const m = state.match, i = inn();
    state.screen = !i.done ? 'play' : m.result ? 'result' : m.innings.length === 1 ? 'break' : 'superover';
    render();
    if (state.screen === 'play' && E.needsBowler(m) && !i.done) openBowlerPicker();
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
    saveLive();
    if (i.done) {
      state.screen = m.result ? 'result' : m.innings.length === 1 ? 'break' : 'superover';
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
        <div class="o-live">${mobileLiveHTML()}</div>
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
    // the Bowl / Auto over / Sim innings buttons exist twice: side column (desktop) and quick panel (phone)
    app.querySelectorAll('[data-act=bowl]').forEach(b => b.onclick = playBall);
    app.querySelectorAll('[data-act=auto-over]').forEach(b => b.onclick = () => autoPlay(false));
    app.querySelectorAll('[data-act=auto-inn]').forEach(b => b.onclick = () => autoPlay(true));
    app.querySelectorAll('.js-quick').forEach(q => q.onchange = () => { state.quick = q.checked; app.querySelectorAll('.js-quick').forEach(x => { x.checked = q.checked; }); });
    const i = inn();
    if (i.bowler === null && !i.done) setButtonsDisabled(true);
  }

  // Phone layout: Bowl button on the left, batters and current bowler on the right
  function mobileLiveHTML() {
    const m = state.match, i = inn();
    const bt = team(i.bat), bw = team(i.bowl);
    const L = state.last ? state.last.ev : null;
    let last = '<span class="muted">First ball coming up</span>';
    if (L) {
      const [tok, cls] = tokenFor(L);
      const word = L.type === 'wicket' ? 'Out!' : L.type === 'wide' ? 'Wide' : L.type === 'noball' ? 'No-ball' : L.runs === 4 ? 'Four!' : L.runs === 6 ? 'Six!' : L.runs === 0 ? 'Dot ball' : `${L.runs} run${L.runs > 1 ? 's' : ''}`;
      last = `<span class="tok ${cls}">${esc(tok)}</span><span class="ml-word ${cls}">${esc(word)}</span>`;
    }
    const plans = autoPlans() && i.bowler !== null
      ? `<div class="ml-plans">${esc(bw.short)} <b>${PLAN_NAME[state.bowl]}</b> · ${esc(bt.short)} <b>${MODE_NAME[state.bat]}</b></div>` : '';
    const bat = idx => {
      const b = i.batters[idx];
      const lim = m.maxBallsPerBatter && !b.returned && !i.superOver ? `/${m.maxBallsPerBatter}` : '';
      return `<div class="ml-row ${idx === i.striker ? 'on-strike' : ''}"><span class="pname">${esc(bt.players[idx].name)}${idx === i.striker ? ' *' : ''}</span><span class="num">${b.runs} (${b.balls}${lim})</span></div>${b.fours || b.sixes ? `<div class="ml-sub">${b.fours}×4 · ${b.sixes}×6</div>` : ''}`;
    };
    const bIdx = i.bowler !== null ? i.bowler : i.lastOverBowler;
    let bowler = '<div class="ml-row muted">Choose a bowler</div>';
    if (bIdx !== null && i.bowlers[bIdx]) {
      const s = i.bowlers[bIdx];
      bowler = `<div class="ml-row"><span class="pname">${esc(bw.players[bIdx].name)}</span><span class="num">${oversFig(s.balls)}-${s.maidens || 0}-${s.runs}-${s.wkts}</span></div>`;
    }
    const tokens = (i.overLog[i.overLog.length - 1] || []).map(t => {
      const cls = t === '4' ? 't4' : t === '6' ? 't6' : t === 'W' ? 'tW' : (t.startsWith('wd') || t.startsWith('nb')) ? 'tx' : '';
      return `<span class="tok sm ${cls}">${esc(t)}</span>`;
    }).join('');
    return `<div class="panel controls mlive">
      <div class="ml-left">
        ${plans}
        <button class="primary bowl-btn" data-act="bowl">Bowl</button>
        <div class="ml-last">${last}</div>
        <div class="ml-small"><button class="secondary" data-act="auto-over">Auto over</button><button class="secondary" data-act="auto-inn">Sim inns</button></div>
      </div>
      <div class="ml-right">
        <div class="ml-label">At the crease</div>
        ${i.done ? '' : bat(i.striker) + (i.nonStriker !== null ? bat(i.nonStriker) : '<div class="ml-row"><span class="lastman">Last man · bats alone</span></div>')}
        <div class="ml-label">Bowling</div>
        ${bowler}
        <div class="this-over sm">${tokens || '<span class="muted" style="font-size:12px">New over</span>'}</div>
      </div>
    </div>`;
  }

  function scoreboardHTML() {
    const m = state.match, i = inn(), t = team(i.bat), bt = team(i.bowl);
    const phase = E.phaseOf(m, i);
    const crr = E.runRate(i.runs, i.balls);
    let sub = `<span>CRR <b>${crr.toFixed(2)}</b></span>`;
    let target = '';
    if (i.target !== null) {
      const need = i.target - i.runs, left = (i.superOver ? 6 : m.overs * 6) - i.balls;
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
          <span class="badge ${i.superOver ? 'so' : ''}">${i.superOver ? `${i.superOver > 1 ? i.superOver + '. ' : ''}Super Over` : phase === 'powerplay' ? 'Powerplay' : phase === 'death' ? 'Death overs' : 'Middle overs'}</span>
        </div>
      </div>
      <div class="sb-main">
        <div class="sb-score">${i.runs}/${i.wkts}</div>
        <div class="sb-overs">${E.oversStr(i.balls)} / ${m.overs} ov</div>
      </div>
      <div class="sb-sub">${sub}</div>
      <div class="sb-vs">vs ${esc(bt.name)}${i.superOver ? ` · scores were level on ${m.innings[0].runs}` : m.innings.length === 2 ? ` · 1st innings ${m.innings[0].runs}/${m.innings[0].wkts}` : ''}</div>
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
      <button class="primary bowl-btn" id="btn-bowl" data-act="bowl">Bowl <small class="key-hint">␣</small></button>
      <div class="action-row two">
        <button class="secondary" id="btn-auto-over" data-act="auto-over" title="The computer plays the rest of this over">Auto over</button>
        <button class="secondary" id="btn-auto-inn" data-act="auto-inn" title="Simulate to the end of the innings">Sim innings</button>
      </div>
      <label class="toggle"><input type="checkbox" id="quick" class="js-quick" ${state.quick ? 'checked' : ''}> Quick mode (skip the roll animation)</label>
    </div>`;
  }

  function playersHTML() {
    const i = inn();
    const bt = team(i.bat);
    const bRow = idx => {
      const b = i.batters[idx];
      return `<div class="pl-row ${idx === i.striker ? 'on-strike' : ''}"><span class="pname">${esc(bt.players[idx].name)}</span>
        <span class="num">${b.runs} (${b.balls}${state.match.maxBallsPerBatter && !b.returned ? '/' + state.match.maxBallsPerBatter : ''})${b.fours || b.sixes ? ` <span class="muted">${b.fours}×4 ${b.sixes}×6</span>` : ''}</span></div>`;
    };
    const tokens = (i.overLog[i.overLog.length - 1] || []).map(t => {
      const cls = t === '4' ? 't4' : t === '6' ? 't6' : t === 'W' ? 'tW' : (t.startsWith('wd') || t.startsWith('nb')) ? 'tx' : '';
      return `<span class="tok ${cls}">${esc(t)}</span>`;
    }).join('');
    return `<div class="panel players">
      <div><h3>At the crease</h3>${i.done ? '' : bRow(i.striker) + (i.nonStriker !== null ? bRow(i.nonStriker) : '<div class="pl-row"><span class="lastman">Last man · bats alone, always on strike</span></div>')}</div>
      <div><h3>This over</h3><div class="this-over">${tokens || '<span class="muted" style="font-size:13px">New over</span>'}</div></div>
    </div>`;
  }

  // Full bowling figures for the fielding side, always visible
  function bowlingRows(I, opts) {
    const m = state.match, bw = team(I.bowl);
    const list = bw.players.map((p, idx) => ({ p, idx, s: I.bowlers[idx] }))
      .filter(x => I.superOver ? x.s : (x.p.type || x.s))
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
      const how = b.out ? b.out.text : (b.retired && !b.returned ? 'retired not out' : 'not out');
      const sr = b.balls ? (b.runs * 100 / b.balls).toFixed(0) : '–';
      return `<tr class="${atCrease ? 'batting' : ''}"><td>${esc(p.name)}<span class="how">${esc(how)}</span></td>
        <td><b>${b.runs}</b></td><td>${b.balls}</td><td>${b.fours}</td><td>${b.sixes}</td><td>${sr}</td></tr>`;
    }).join('');
    const dnb = I.superOver ? [] : I.batters.filter(b => !b.batted).map(b => bt.players[b.idx].name);
    const ex = I.extras.wd + I.extras.nb;
    const fow = I.fow.map(f => `${f.runs}-${f.wkt} (${esc(f.batter)}, ${f.over})`).join(', ');
    return `<div class="scorecard">
      <div class="inn-title"><h2>${I.superOver ? `<span class="so-tag">${I.superOver > 1 ? I.superOver + '. ' : ''}Super Over</span>` : ''}${esc(bt.name)}</h2><span class="num">${I.runs}/${I.wkts} (${E.oversStr(I.balls)} ov)</span></div>
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

  // Between the match and a Super Over, or between the two halves of one
  function renderSuperOverBreak() {
    const m = state.match, n = m.innings.length, last = m.innings[n - 1];
    const firstHalf = m.pendingSuperOver;                   // the next innings starts a new Super Over
    const soNo = firstHalf ? (last.superOver || 0) + 1 : last.superOver;
    const nextBat = firstHalf ? team(last.bat) : team(1 - last.bat);
    const order = nextBat.players.map((p, i) => i).sort((a, b) => nextBat.players[b].bat - nextBat.players[a].bat).slice(0, 3).map(i => nextBat.players[i].name);
    const head = firstHalf
      ? (soNo === 1 ? `Scores level on ${m.innings[0].runs}!` : `Super Over tied on ${last.runs}!`)
      : `${esc(team(last.bat).name)} ${last.runs}/${last.wkts} in their Super Over`;
    const sub = firstHalf
      ? `${soNo === 1 ? 'A Super Over decides it' : 'Another Super Over decides it'}: one over each, 2 wickets and you're out. ${esc(nextBat.name)} bat first.`
      : `${esc(nextBat.name)} need ${last.runs + 1} from 6 balls.`;
    app.innerHTML = `<section>
      <div class="result-hero">
        <div class="trophy">⚡</div>
        <h3>${soNo > 1 ? soNo + '. ' : ''}Super Over</h3>
        <h1>${head}</h1>
        <p class="muted" style="margin:0">${sub}</p>
        <p class="muted" style="margin:0;font-size:14px">${esc(nextBat.short || nextBat.name)} send in: <b>${order.map(esc).join(', ')}</b></p>
        <button class="primary" id="btn-so">${firstHalf ? 'Start the Super Over' : 'Start the chase'}</button>
      </div>
      <div class="summary-grid">${m.innings.map((_, k) => `<div class="panel">${scorecardHTML(k)}</div>`).reverse().slice(0, 2).join('')}</div>
    </section>`;
    document.getElementById('btn-so').onclick = () => {
      E.startNextInnings(m);
      state.screen = 'play';
      state.bat = 'normal'; state.bowl = 'normal';
      state.last = null; state.preview = true; state.autoKey = null;
      advance();
    };
  }

  function awardCard(kicker, name, color, team, line, pid, big) {
    const nameHTML = pid && pmap()[pid] ? `<button class="plink" data-player="${pid}">${esc(name)}</button>` : esc(name);
    return `<div class="award ${big ? 'big' : ''}">
      <div class="award-icon">${big ? '👑' : '⭐'}</div>
      <div><div class="cc-kicker">${kicker}</div>
      <div class="award-name">${nameHTML}</div>
      <div class="muted award-line"><span class="dot" style="background:${color}"></span>${esc(team)} · ${esc(line)}</div></div>
    </div>`;
  }

  function awardsHTML() {
    const m = state.match;
    const pom = C.playerOfMatch(m);
    let html = awardCard('Player of the match', pom.name, pom.color, pom.team, pom.line, pom.pid, false);
    const comp = state.ctx ? compById(state.ctx.compId) : null;
    if (comp && comp.status === 'complete' && comp.summary && comp.summary.playerOfSeries && fixtureById(state.ctx).stage === 'F') {
      html += seriesAwardHTML(comp);
    }
    return `<div class="awards">${html}</div>`;
  }

  function seriesAwardHTML(comp) {
    const s = comp.summary.playerOfSeries;
    const p = pmap()[s.pid];
    const t = C.teamOf(state.db, comp.kind, comp.kind === 'league' ? p.state : p.city);
    return awardCard(`Player of the series · ${comp.name} S${comp.season}`, s.name, t ? t.color : '#999', t ? t.name : '', `${s.runs} runs · ${s.wkts} wkt${s.wkts === 1 ? '' : 's'} · ${s.mat} matches`, s.pid, true);
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
        ${awardsHTML()}
        ${state.ctx ? `<p class="muted" style="margin:0">${esc(state.saveMsg)}</p>
        <div class="btn-row"><button class="primary" id="btn-back-comp">Back to ${esc(compById(state.ctx.compId).name)}</button></div>`
        : `<div class="btn-row"><button class="primary" id="btn-again">Rematch</button><button class="secondary" id="btn-new">New setup</button></div>`}
      </div>
      <div class="summary-grid">
        <div class="panel">${scorecardHTML(0)}</div>
        <div class="panel">${scorecardHTML(1)}</div>
      </div>
      ${m.innings.length > 2 ? `<div class="summary-grid" style="margin-top:16px">${m.innings.slice(2).map((_, k) => `<div class="panel">${scorecardHTML(k + 2)}</div>`).join('')}</div>` : ''}
    </section>`;
    bindPlayerLinks();
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
        <li><b>Getting set</b>: the first 2 balls are riskier. After 10 balls a batter is set: harder to get out and scores faster.</li>
        <li><b>Phase</b>: the powerplay boosts fours. Death overs boost sixes and wickets.</li>
        <li><b>Pitch</b>: flat roads help batters, green tops help pacers, dusty turners help spinners.</li>
        <li><b>Super Over</b>: a match can't end tied. If the scores are level, each team bats one over with its 3 best batters (2 wickets and they're out); the team that batted second goes first. Still level? Another Super Over. Super Over figures don't count in player stats.</li>
        <li><b>Last man stands</b> (league and cup): when everyone else is out, the last batter bats on alone and always keeps the strike. The innings ends when every batter is out.</li>
        <li><b>Städtepokal</b>: 6 players, 6 overs. Every player bowls one over, and a batter retires not out after 12 balls. Retired batters come back in only when everyone else is out or retired.</li>
        <li><b>Extras</b>: wides (~3%) and no-balls (~0.7%). A no-ball gives a <b>free hit</b>: 30% four, 30% six, 20% single, 15% dot, 5% run-out (the only way to get out).</li>
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
  state.savedIds = new Set();   // match ids already in the online database
  state.compHash = {};          // last saved version of each competition (online mode)

  // ---------- Profiles (online mode) ----------
  const PROF_KEY = 'cricket-dice-profile';
  state.profile = null;      // { id, name, pin }
  state.profiles = [];       // [{ id, name }]
  state.legacy = false;      // history saved before profiles existed

  const authHeaders = () => state.profile ? { 'x-profile': state.profile.id, 'x-pin': state.profile.pin } : {};
  function rememberProfile(p) { try { localStorage.setItem(PROF_KEY, JSON.stringify(p)); } catch (_) { /* memory only */ } }
  function rememberedProfile() { try { return JSON.parse(localStorage.getItem(PROF_KEY) || 'null'); } catch (_) { return null; } }
  function forgetProfile() { try { localStorage.removeItem(PROF_KEY); } catch (_) { /* ignore */ } }

  async function api(path, opts) {
    const res = await fetch(path, { cache: 'no-store', ...(opts || {}), headers: { 'Content-Type': 'application/json', ...authHeaders(), ...((opts && opts.headers) || {}) } });
    let j = null;
    try { j = await res.json(); } catch (_) { j = null; }
    return { res, j };
  }

  async function boot() {
    renderLoading();
    let db = null;
    try {
      const res = await fetch('api/db?part=profiles', { cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) throw new Error('no server');
      const j = await res.json();
      if (j && j.error) { renderLoadError(j.error); return; }
      if (!res.ok) throw new Error('no server');
      if (j && j.storage === 'mongo') {
        state.store = 'cloud';
        state.profiles = j.profiles || [];
        state.legacy = !!j.legacy;
        const saved = rememberedProfile();
        if (saved && state.profiles.some(p => p.id === saved.id)) { state.profile = saved; if (await openProfile()) return; }
        showProfiles();
        return;
      }
      state.store = 'server';
      db = j;
    } catch (e) {
      state.store = 'local';
      try { db = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (_) { db = null; }
    }
    if (!db || !db.players) { db = C.newDB(); state.db = db; await save(); }
    state.db = db;
    if (!db.stats || !Object.keys(db.stats).length) db.stats = C.computeStats(db);
    if (C.migrate(db) | C.refreshEmptyOldSeason(db)) await save();
    restoreLive();
    render();
  }

  // Load the logged-in profile's history; returns false if the PIN no longer works
  async function openProfile() {
    renderLoading();
    const { res, j } = await api('api/db?part=core');
    if (res.status === 401) { forgetProfile(); state.profile = null; return false; }
    if (!res.ok || !j) { renderLoadError((j && j.error) || 'The database did not answer.'); return true; }
    state.savedIds = new Set(); state.compHash = {};
    let db;
    if (j.empty) { db = C.newDB(); state.db = db; await save(); }
    else db = await loadCloud(j);
    state.db = db;
    if (!db.stats || !Object.keys(db.stats).length) db.stats = C.computeStats(db);
    if (C.migrate(db) | C.refreshEmptyOldSeason(db)) await save();
    state.match = null; state.ctx = null;
    restoreLive();
    state.screen = 'home';
    updateProfileButton();
    render();
    return true;
  }

  function updateProfileButton() {
    const b = document.getElementById('btn-profile');
    if (!b) return;
    b.hidden = !(state.store === 'cloud' && state.profile);
    if (state.profile) b.innerHTML = `<span class="avatar sm" style="background:${profileColor(state.profile.id)}">${esc(state.profile.name[0].toUpperCase())}</span>${esc(state.profile.name)} · Switch`;
  }

  function profileColor(id) {
    let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return `hsl(${h} 55% 50%)`;
  }

  function switchProfile() {
    const go = () => { forgetProfile(); state.profile = null; state.db = null; state.match = null; state.ctx = null; updateProfileButton(); refreshProfiles(); };
    if (liveMatchInProgress()) {
      confirmBox({ title: 'Leave this match?', text: 'The match in progress has not finished, so it will not be saved.', ok: 'Switch profile', onOk: go });
    } else go();
  }

  async function refreshProfiles() {
    renderLoading();
    const { j } = await api('api/db?part=profiles');
    state.profiles = (j && j.profiles) || [];
    state.legacy = !!(j && j.legacy);
    showProfiles();
  }

  function showProfiles(selectedId, msg) {
    state.screen = 'profiles';
    document.querySelector('.mainnav').hidden = true;
    const sel = selectedId || (state.profiles.length ? null : 'new');
    const cards = state.profiles.map(p => `<button class="profile-card ${sel === p.id ? 'selected' : ''}" data-prof="${p.id}">
        <span class="avatar" style="background:${profileColor(p.id)}">${esc(p.name[0].toUpperCase())}</span><span class="pname-big">${esc(p.name)}</span></button>`).join('');
    let form = '';
    if (sel === 'new') {
      form = `<form id="new-prof" class="prof-form">
        <h2>New profile</h2>
        <label for="np-name">Name</label><input id="np-name" maxlength="24" autocomplete="off" placeholder="e.g. Zillur" required>
        <div class="pin-row">
          <div><label for="np-pin">PIN (4–8 digits)</label><input id="np-pin" type="password" inputmode="numeric" pattern="[0-9]{4,8}" autocomplete="new-password" required></div>
          <div><label for="np-pin2">Repeat PIN</label><input id="np-pin2" type="password" inputmode="numeric" pattern="[0-9]{4,8}" autocomplete="new-password" required></div>
        </div>
        ${state.legacy ? `<label class="check"><input type="checkbox" id="np-claim"> Move the history already saved online into this profile</label>
        <div id="np-claim-box" hidden><label for="np-old">Old passcode (SAVE_PASSCODE in Vercel)</label><input id="np-old" type="password" autocomplete="off"></div>` : ''}
        <p class="form-msg" id="prof-msg">${esc(msg || '')}</p>
        <div class="btn-row" style="justify-content:flex-start"><button class="primary" type="submit">Create profile</button>${state.profiles.length ? '<button class="secondary" type="button" id="np-cancel">Cancel</button>' : ''}</div>
        <p class="muted note">Each profile has its own seasons, history and player stats. Anyone with the website link can create a profile; only the PIN opens it.</p>
      </form>`;
    } else if (sel) {
      const p = state.profiles.find(x => x.id === sel);
      form = `<form id="login-prof" class="prof-form">
        <h2>Hi ${esc(p.name)}</h2>
        <label for="lp-pin">Your PIN</label>
        <input id="lp-pin" type="password" inputmode="numeric" autocomplete="current-password" required>
        <label class="check"><input type="checkbox" id="lp-remember" checked> Keep me logged in on this device</label>
        <p class="form-msg" id="prof-msg">${esc(msg || '')}</p>
        <div class="btn-row" style="justify-content:flex-start"><button class="primary" type="submit">Open</button></div>
      </form>`;
    }
    app.innerHTML = `<section class="profiles">
      <div class="setup-hero"><h1>Who's playing?</h1><p>Each profile keeps its own Länderliga and Städtepokal seasons, history and player stats.</p></div>
      <div class="profile-grid">${cards}<button class="profile-card add ${sel === 'new' ? 'selected' : ''}" data-prof="new"><span class="avatar add">+</span><span class="pname-big">New profile</span></button></div>
      ${form ? `<div class="panel prof-panel">${form}</div>` : ''}
    </section>`;
    app.querySelectorAll('[data-prof]').forEach(b => b.onclick = () => showProfiles(b.dataset.prof));
    const setMsg = t => { const m = document.getElementById('prof-msg'); if (m) m.textContent = t; };

    const lf = document.getElementById('login-prof');
    if (lf) {
      const pinIn = document.getElementById('lp-pin'); pinIn.focus();
      lf.onsubmit = async e => {
        e.preventDefault();
        setMsg('Checking…');
        const pin = pinIn.value.trim();
        const { res, j } = await api('api/db?action=login', { method: 'POST', body: JSON.stringify({ profile: sel, pin }) });
        if (!res.ok) { setMsg((j && j.error) || 'Could not log in.'); pinIn.value = ''; pinIn.focus(); return; }
        state.profile = { id: j.profile.id, name: j.profile.name, pin };
        if (document.getElementById('lp-remember').checked) rememberProfile(state.profile); else forgetProfile();
        await openProfile();
      };
    }

    const nf = document.getElementById('new-prof');
    if (nf) {
      document.getElementById('np-name').focus();
      const claim = document.getElementById('np-claim');
      if (claim) claim.onchange = () => { document.getElementById('np-claim-box').hidden = !claim.checked; };
      const cancel = document.getElementById('np-cancel'); if (cancel) cancel.onclick = () => showProfiles();
      nf.onsubmit = async e => {
        e.preventDefault();
        const name = document.getElementById('np-name').value.trim();
        const pin = document.getElementById('np-pin').value.trim();
        if (!/^\d{4,8}$/.test(pin)) { setMsg('The PIN must be 4 to 8 digits.'); return; }
        if (pin !== document.getElementById('np-pin2').value.trim()) { setMsg('The two PINs are different.'); return; }
        const body = { name, pin };
        if (claim && claim.checked) { body.claimLegacy = true; body.legacyPasscode = document.getElementById('np-old').value; }
        setMsg('Creating…');
        const { res, j } = await api('api/db?action=create-profile', { method: 'POST', body: JSON.stringify(body) });
        if (!res.ok) { setMsg((j && j.error) || 'Could not create the profile.'); return; }
        state.profile = { id: j.profile.id, name: j.profile.name, pin };
        rememberProfile(state.profile);
        if (j.moved) showToast(`Moved ${j.moved} saved matches into ${j.profile.name}`);
        await openProfile();
      };
    }
  }

  async function loadCloud(core) {
    const matches = [];
    while (matches.length < core.matchCount) {
      const { res, j } = await api(`api/db?part=matches&skip=${matches.length}&limit=300`);
      if (!res.ok || !j || !j.matches || !j.matches.length) break;
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
      <p class="muted">Check MONGODB_URI in your Vercel project settings, and that Atlas Network Access allows 0.0.0.0/0. Then redeploy and reload this page.</p></div>`;
  }

  function sessionExpired() {
    forgetProfile();
    state.saveMsg = 'Not saved: this profile\'s PIN was not accepted. Log in again.';
    showToast(state.saveMsg, true);
  }

  async function saveCloud() {
    const db = state.db;
    if (!state.profile) { state.saveMsg = 'Not saved: no profile is open.'; return false; }
    const competitions = [];
    db.competitions.forEach((comp, i) => {
      const s = JSON.stringify(comp);
      if (state.compHash[comp.id] !== s) competitions.push({ ...comp, seq: i });
    });
    const matches = [];
    db.matches.forEach((m, i) => { if (!state.savedIds.has(m.id)) matches.push({ ...m, seq: i }); });
    const meta = { app: db.app, version: db.version, cupVersion: db.cupVersion, createdAt: db.createdAt, players: db.players, teams: db.teams };
    try {
      const deleteCompetitions = (state.pendingDeletes || []).slice();
      const { res, j } = await api('api/db', { method: 'POST', body: JSON.stringify({ mode: 'save', baseRev: db.rev || 0, meta, competitions, matches, stats: db.stats, deleteCompetitions }) });
      if (res.status === 401) { sessionExpired(); return false; }
      if (res.status === 409) { state.saveMsg = 'Not saved: newer results were saved from another device. Reload the page to get them.'; showToast(state.saveMsg, true); return false; }
      if (!res.ok) throw new Error((j && j.error) || 'save failed');
      db.rev = j.rev;
      state.pendingDeletes = (state.pendingDeletes || []).filter(id => !deleteCompetitions.includes(id));
      for (const m of matches) state.savedIds.add(m.id);
      for (const comp of db.competitions) state.compHash[comp.id] = JSON.stringify(comp);
      state.saveMsg = `Saved to ${state.profile.name}'s history.`;
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
      try {
        const { res, j } = await api('api/db', {
          method: 'POST',
          body: JSON.stringify({ mode: 'replace', meta: { app: fresh.app, version: fresh.version, cupVersion: fresh.cupVersion, createdAt: fresh.createdAt, players: fresh.players, teams: fresh.teams }, competitions: [], matches: [], stats: C.computeStats(fresh) }),
        });
        if (res.status === 401) { sessionExpired(); return; }
        if (!res.ok) throw new Error((j && j.error) || 'reset failed');
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

  document.getElementById('btn-profile').onclick = switchProfile;

  function renderLoading() {
    if (state.store === 'cloud' && !state.db) document.querySelector('.mainnav').hidden = true; app.innerHTML = '<div class="panel" style="margin-top:20px">Loading your history…</div>'; }

  function storeBanner() {
    if (state.store === 'server') return `<div class="store ok">● Saving to <b>data/history.json</b> on your computer</div>`;
    if (state.store === 'cloud') return `<div class="store ok">● Saving online · profile <b>${esc(state.profile ? state.profile.name : '')}</b></div>`;
    return `<div class="store warn">● Not connected to your computer. Results are kept in this browser only. To save to your Mac, run <code>npm start</code> and open the address it prints.</div>`;
  }

  // ======================= NAV & LOOKUPS =======================
  function navKey() {
    if (state.screen === 'comp' || state.screen === 'transfers') return state.compKind;
    if (['setup', 'toss', 'play', 'break', 'result'].includes(state.screen)) return state.ctx ? compById(state.ctx.compId).kind : 'friendly';
    return state.screen;
  }
  document.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => {
    if (!state.db) return;
    const k = b.dataset.nav;
    if (k === 'league' || k === 'cup') openComp(k);
    else if (k === 'friendly') {
      const live = state.match && !state.ctx && state.match.innings.length && !state.match.result;
      if (live) { resumeLive(); return; }
      state.screen = 'setup';
      render();
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
    if (f.div) return `${comp.name} ${f.div}. Liga, round ${f.round}`;
    if (f.stage === 'R2') return `${comp.name} Second round Group ${f.group}, match ${f.round}`;
    return `${comp.name} round ${f.round}`;
  }
  function liveMatchInProgress() { return state.match && state.match.innings.length && !state.match.result; }

  // ======================= HOME =======================
  function compCardHTML(kind) {
    const cfg = C.COMPS[kind];
    const comp = C.activeComp(state.db, kind) || C.lastComp(state.db, kind);
    const blurb = kind === 'league'
      ? `16 German states in two divisions · 7 players each · ${cfg.overs} overs · last man stands · 2 up, 2 down every season`
      : `20 German cities · 6 players each · ${cfg.overs} overs · 5 groups of 4, a second round of 2 groups, then semifinals`;
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

  // ---------- Home leaderboards ----------
  const HOME_BOARDS = [
    ['recent', 'Last 3 matches'],
    ['league-now', 'Länderliga · current'],
    ['league-all', 'Länderliga · all time'],
    ['cup-now', 'Städtepokal · current'],
    ['cup-all', 'Städtepokal · all time'],
  ];

  function homeBoardHTML(key) {
    const db = state.db;
    if (key === 'recent') return recentMatchesHTML();
    const [kind, when] = key.split('-');
    const name = C.COMPS[kind].name;
    if (when === 'all') {
      const st = Object.fromEntries(Object.entries(db.stats).map(([k, v]) => [k, v[kind]]));
      const n = db.competitions.filter(x => x.kind === kind).length;
      return `<p class="muted lb-note">${name}, all ${n} season${n === 1 ? '' : 's'}</p>
        <div class="leaders">${leadersHTML(st, 'runs', 5, 'Most runs')}${leadersHTML(st, 'wkts', 5, 'Most wickets')}</div>`;
    }
    const comp = C.activeComp(db, kind) || C.lastComp(db, kind);
    if (!comp) return `<p class="muted lb-note">No ${name} season yet.</p>`;
    const st = C.competitionStats(db, comp.id);
    return `<p class="muted lb-note">${name} · Season ${comp.season}${comp.status === 'complete' ? ' (finished)' : ''}</p>
      <div class="leaders">${leadersHTML(st, 'runs', 5, 'Most runs')}${leadersHTML(st, 'wkts', 5, 'Most wickets')}</div>`;
  }

  function recentMatchesHTML() {
    const db = state.db, pm = pmap();
    const list = db.matches.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(-3).reverse();
    if (!list.length) return '<p class="muted lb-note">No matches played yet.</p>';
    const nm = pid => esc(pm[pid] ? pm[pid].name : pid);
    return `<div class="recent3">${list.map(m => {
      const T = id => C.teamOf(db, m.comp, id) || { name: id, short: id, color: '#888' };
      const score = I => `<div class="r3-team"><span class="dot" style="background:${T(I.team).color}"></span><span class="r3-name">${esc(T(I.team).name)}</span><span class="num">${I.runs}/${I.wkts} <small>(${E.oversStr(I.balls)})</small></span></div>`;
      let bat = null, bowl = null;
      for (const I of m.innings) {
        for (const b of I.batting) if (!bat || b.r > bat.r || (b.r === bat.r && b.b < bat.b)) bat = b;
        for (const b of I.bowling) if (!bowl || b.w > bowl.w || (b.w === bowl.w && b.r < bowl.r)) bowl = b;
      }
      const stage = C.STAGE_LABEL[m.stage] || m.stage;
      return `<div class="r3">
        <div class="cc-kicker">${esc(m.compName)} · S${m.season} · ${esc(stage)}</div>
        ${m.innings.map(score).join('')}
        <div class="r3-result">${esc(m.result)}</div>
        ${m.motm ? `<div class="r3-mom"><span class="r3-lbl">Player of the match</span><button class="plink" data-player="${m.motm}">${nm(m.motm)}</button><span class="num">${esc(C.figuresLine(m.innings, m.motm))}</span></div>` : ''}
        <div class="r3-best">
          ${bat ? `<div><span class="r3-lbl">Most runs</span><button class="plink" data-player="${bat.pid}">${nm(bat.pid)}</button> <span class="num">${bat.r}${bat.out ? '' : '*'} (${bat.b})</span></div>` : ''}
          ${bowl ? `<div><span class="r3-lbl">Most wickets</span><button class="plink" data-player="${bowl.pid}">${nm(bowl.pid)}</button> <span class="num">${bowl.w}/${bowl.r}</span></div>` : ''}
        </div>
        <button class="plink r3-card" data-match="${m.id}">Scorecard →</button>
      </div>`;
    }).join('')}</div>`;
  }

  function bindHomeBoard(el) {
    bindPlayerLinks(el);
    el.querySelectorAll('[data-match]').forEach(b => b.onclick = () => openMatchCard(b.dataset.match));
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
        <div class="inn-title"><h2>Leaderboards</h2><span class="muted" style="font-size:13px">${played} match${played === 1 ? '' : 'es'} played</span></div>
        <div class="lb-tabs" role="tablist">${HOME_BOARDS.map(([k, l]) => `<button class="lb-tab ${state.homeTab === k ? 'active' : ''}" data-hb="${k}" role="tab" aria-selected="${state.homeTab === k}">${l}</button>`).join('')}</div>
        <div id="home-board">${homeBoardHTML(state.homeTab)}</div>
        <div style="margin-top:12px"><button class="secondary" data-go="players">All player stats →</button></div>
      </div>
    </section>`;
    app.querySelectorAll('[data-hb]').forEach(b => b.onclick = () => {
      state.homeTab = b.dataset.hb;
      app.querySelectorAll('[data-hb]').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', x === b); });
      const box = document.getElementById('home-board'); box.innerHTML = homeBoardHTML(state.homeTab);
      bindHomeBoard(box);
    });
    bindHomeBoard(document.getElementById('home-board'));
    app.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openComp(b.dataset.open));
    app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { state.screen = b.dataset.go; render(); });
    const rs = document.getElementById('btn-resume'); if (rs) rs.onclick = resumeLive;
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
          ? `All 16 German states, 7 players each, ${cfg.overs}-over matches, in two divisions of 8: the 1. Liga and the 2. Liga. Every team plays its own division once (7 matches). The top 4 of the 1. Liga play the semifinals and the final. After each season the bottom 2 of the 1. Liga go down and the top 2 of the 2. Liga come up. Last man stands: when everyone else is out, the last batter bats on alone.`
          : `20 German cities, 6 players each, ${cfg.overs}-over matches. Everyone bowls one over, and a batter retires not out after ${cfg.maxBallsPerBatter} balls. Last man stands: when everyone else is out, the last batter bats on alone. 5 groups of 4; the top 2 of each group play a second round in 2 groups of 5; the top 2 of those reach the semifinals, then the final.`}</p></div>
        ${storeBanner()}
        <div style="margin-top:16px"><button class="primary" id="btn-new-season">Start season 1</button></div>
        <div class="panel" style="margin-top:16px">${squadsHTML(kind)}</div>
      </section>`;
      document.getElementById('btn-new-season').onclick = () => { C.startCompetition(db, kind); save(); render(); };
      bindPlayerLinks();
      return;
    }
    const baseTabs = kind === 'league'
      ? comp.format === 'div'
        ? [['div1', '1. Liga'], ['div2', '2. Liga'], ['playoffs', 'Playoffs'], ['fixtures', 'Fixtures'], ['leaders', 'Leaders'], ['squads', 'Squads']]
        : [['table', 'Table'], ['playoffs', 'Playoffs'], ['fixtures', 'Fixtures'], ['leaders', 'Leaders'], ['squads', 'Squads']]
      : comp.format === 'v2'
        ? [['groups', 'Groups'], ['round2', 'Second round'], ['knockout', 'Knockout'], ['fixtures', 'Fixtures'], ['leaders', 'Leaders'], ['squads', 'Squads']]
        : [['groups', 'Groups'], ['knockout', 'Knockout'], ['fixtures', 'Fixtures'], ['leaders', 'Leaders'], ['squads', 'Squads']];
    const tabs = comp.transfers ? baseTabs.concat([['transfers', 'Transfers']]) : baseTabs;
    let tab = state.compTab[kind];
    if (!tabs.some(t => t[0] === tab)) tab = tabs[0][0];
    const done = comp.fixtures.filter(f => f.result).length;
    const next = C.pendingFixtures(comp)[0];
    const stageLeft = C.pendingFixtures(comp).filter(f => f.stage === comp.stage).length;

    let top;
    if (comp.status === 'complete') {
      top = `<div class="champ">
        <div class="trophy">🏆</div>
        <div><div class="cc-kicker">Season ${comp.season} champions</div><h2 class="champ-name">${esc(comp.summary.champion)}</h2>
        <div class="muted">${esc(comp.summary.final.result)} · Player of the final: ${esc(comp.summary.final.motm)}</div>
        ${comp.summary.promoted ? `<div class="muted" style="font-size:14px;margin-top:4px">⬆ Up: <b>${comp.summary.promoted.map(esc).join(', ')}</b> · ⬇ Down: <b>${comp.summary.relegated.map(esc).join(', ')}</b></div>` : ''}</div>
        ${comp.summary.playerOfSeries ? `<div class="champ-pos">${seriesAwardHTML(comp)}</div>` : ''}
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
    else if (tab === 'div1' || tab === 'div2') body = divisionHTML(comp, tab === 'div1' ? 1 : 2);
    else if (tab === 'groups') body = groupsHTML(comp);
    else if (tab === 'round2') body = round2HTML(comp);
    else if (tab === 'playoffs' || tab === 'knockout') body = bracketHTML(comp);
    else if (tab === 'fixtures') body = fixturesHTML(comp);
    else if (tab === 'leaders') {
      const st = C.competitionStats(db, comp.id);
      const race = C.seriesRace(db, comp.id).slice(0, 5);
      body = `<div class="lead race"><h3>${comp.status === 'complete' ? 'Player of the series' : 'Player of the series race'}</h3>
        ${race.length ? `<ol>${race.map(r => `<li><button class="plink" data-player="${r.pid}">${esc(r.name)}</button><span class="race-sub">${r.runs} runs · ${r.wkts} wkt${r.wkts === 1 ? '' : 's'} · ${r.motm} PoM</span><span class="num">${r.points} <small>pts</small></span></li>`).join('')}</ol>`
          : '<p class="muted" style="font-size:13px">No matches yet.</p>'}
        <p class="muted note">Points add up each player's match performances: runs, strike rate, wickets and economy.</p></div>
        <div class="leaders" style="margin-top:18px">${leadersHTML(st, 'runs', 10, 'Most runs this season')}${leadersHTML(st, 'wkts', 10, 'Most wickets this season')}</div>`;
    } else if (tab === 'transfers') body = transfersHTML(kind, comp.transfers, `How the squads changed after season ${comp.transfers.fromSeason}.`);
    else body = squadsHTML(kind, comp);

    app.innerHTML = `<section class="comp">
      <div class="comp-head">
        <div><div class="cc-kicker">${kind === 'league' ? 'League' : 'Tournament'} · Season ${comp.season}</div><h1>${comp.name}</h1>
        <div class="muted">${C.STAGE_LABEL[comp.stage]}${comp.status === 'complete' ? ' · complete' : ''} · ${done} of ${comp.fixtures.length} matches played</div></div>
        ${comp.status !== 'complete' ? '<button class="secondary danger-ghost" id="btn-cancel-season">Cancel this season</button>' : ''}
      </div>
      ${comp.status !== 'complete' && comp.format !== cfg.format ? `<div class="store warn">● This season uses the old ${esc(cfg.name)} format. Cancel it to start fresh with the new format.</div>` : ''}
      ${storeBanner()}
      <div class="panel">${top}</div>
      <div class="panel">
        <div class="tabs scroll-tabs">${tabs.map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-ctab="${k}">${l}</button>`).join('')}</div>
        ${body}
      </div>
    </section>`;

    app.querySelectorAll('[data-ctab]').forEach(b => b.onclick = () => { state.compTab[kind] = b.dataset.ctab; renderComp(kind); });
    const cs = document.getElementById('btn-cancel-season');
    if (cs) cs.onclick = () => confirmBox({
      title: `Cancel ${comp.name} season ${comp.season}?`,
      text: `This deletes season ${comp.season} and its ${done} played match${done === 1 ? '' : 'es'}. Their runs and wickets are removed from player stats. Finished seasons and the other competition are not touched${state.store === 'cloud' && state.profile ? `, and only ${state.profile.name}'s profile is affected` : ''}. It can't be undone.`,
      ok: 'Cancel season', danger: true, typeWord: 'CANCEL',
      onOk: () => cancelSeasonNow(comp),
    });
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
    if (ns) ns.onclick = () => openTransfers(kind);
    bindPlayerLinks();
  }

  // ---------- Transfer window between seasons ----------
  function openTransfers(kind) {
    state.compKind = kind;
    state.transferPlan = C.planTransfers(state.db, kind);
    if (!state.transferPlan) { C.startCompetition(state.db, kind); save(); render(); return; }
    state.screen = 'transfers';
    render();
  }

  function transfersHTML(kind, plan, intro) {
    const pm = pmap();
    const short = id => id ? esc(C.teamOf(state.db, kind, id).short) : 'free';
    const pts = pid => (plan.points && plan.points[pid] != null) ? `${plan.points[pid]} pts` : '';
    const cards = plan.teams.map(t => `<div class="tw-team">
        <h3>${chipTeam(kind, t.id)}</h3>
        <div class="tw-label">Kept</div>
        <ul>${t.kept.map(pid => `<li><button class="plink" data-player="${pid}">${esc(pm[pid].name)}</button><span class="rt">${pts(pid)}</span></li>`).join('')}</ul>
        <div class="tw-label new">New</div>
        <ul>${t.signed.map(s => `<li><button class="plink" data-player="${s.pid}">${esc(pm[s.pid].name)}</button><span class="rt">${s.from === t.id ? 'back again' : 'from ' + short(s.from)} · bat ${pm[s.pid].bat} · bowl ${pm[s.pid].bowl}</span></li>`).join('')}</ul>
        <div class="tw-left">Left: ${t.released.map(pid => esc(pm[pid].name)).join(', ')}</div>
      </div>`).join('');
    return `${intro ? `<p class="muted note" style="margin-top:0">${intro}</p>` : ''}
      <div class="tw-grid">${cards}</div>
      ${plan.unsigned && plan.unsigned.length ? `<p class="muted note">Without a team this season: ${plan.unsigned.map(pid => `<button class="plink" data-player="${pid}">${esc(pm[pid].name)}</button>`).join(', ')}</p>` : ''}`;
  }

  function renderTransfers() {
    const plan = state.transferPlan, kind = plan.kind, cfg = C.COMPS[kind];
    const newPer = cfg.squad - 3;
    app.innerHTML = `<section class="comp">
      <div class="comp-head"><div><div class="cc-kicker">${cfg.name} · before season ${plan.toSeason}</div><h1>Transfer window</h1>
        <div class="muted">Each team keeps its 3 best performers from season ${plan.fromSeason}. Everyone else is released, and the ${newPer} open spots per team are filled from the released players: random, but weaker teams pick first so no side is left hopeless.</div></div></div>
      <div class="panel tw-actions">
        <button class="primary" id="tw-start">Start season ${plan.toSeason}</button>
        <button class="secondary" id="tw-cancel">Not now</button>
      </div>
      <div class="panel">${transfersHTML(kind, plan, '')}</div>
    </section>`;
    document.getElementById('tw-start').onclick = async () => {
      const comp = C.applyTransfers(state.db, plan);
      state.transferPlan = null;
      state.compTab[kind] = kind === 'league' ? 'div1' : 'groups';
      state.screen = 'comp';
      render();
      await save();
      showToast(`Season ${comp.season} started with the new squads`);
    };
    document.getElementById('tw-cancel').onclick = () => { state.transferPlan = null; openComp(kind); };
    bindPlayerLinks();
  }

  async function cancelSeasonNow(comp) {
    const kind = comp.kind;
    const res = C.cancelSeason(state.db, comp.id);
    if (!res) return;
    if (state.ctx && state.ctx.compId === comp.id) { state.match = null; state.ctx = null; try { localStorage.removeItem(liveKey()); } catch (_) { /* ignore */ } }
    for (const id of res.removed) state.savedIds.delete(id);
    delete state.compHash[comp.id];
    state.pendingDeletes = (state.pendingDeletes || []).concat([comp.id]);
    state.compTab[kind] = kind === 'league' ? 'div1' : 'groups';
    openComp(kind);
    if (await save()) showToast(`Season ${comp.season} cancelled. Start it again whenever you like.`);
  }

  function playFixture(comp, fid) {
    if (liveMatchInProgress()) {
      if (state.ctx && state.ctx.fixtureId === fid) { resumeLive(); return; }
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
    if (comp.status === 'complete') {
      state.compTab[comp.kind] = comp.kind === 'league' ? 'playoffs' : 'knockout';
      if (comp.summary.playerOfSeries) setTimeout(() => showToast(`Player of the series: ${comp.summary.playerOfSeries.name}`), 2200);
    }
    render();
    await save();
  }

  function standingsTable(kind, rows, qualify, rowClass) {
    return `<div class="table-scroll"><table class="card standings"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>T</th><th>Pts</th><th>NRR</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${rowClass ? rowClass(i, rows.length) : i < qualify ? 'q' : ''}"><td>${i + 1}</td><td><span class="tchip"><span class="dot" style="background:${tcolor(kind, r.id)}"></span><span class="full">${esc(tname(kind, r.id))}</span><span class="abbr">${esc(C.teamOf(state.db, kind, r.id).short)}</span></span></td><td>${r.p}</td><td>${r.w}</td><td>${r.l}</td><td>${r.t}</td><td><b>${r.pts}</b></td><td>${r.p ? (r.nrr >= 0 ? '+' : '') + r.nrr.toFixed(2) : '–'}</td></tr>`).join('')}
    </tbody></table></div>`;
  }
  function leagueTableHTML(comp) {
    return standingsTable('league', C.leagueTable(state.db, comp), 4) + `<p class="muted note">Top 4 reach the semifinals. Win 2 pts, tie 1. Ties on points split by net run rate.</p>`;
  }
  function divisionHTML(comp, d) {
    const rows = C.divTable(state.db, comp, d);
    const prev = comp.divisionsFrom ? state.db.competitions.find(c => c.kind === 'league' && c.season === comp.divisionsFrom) : null;
    const moved = prev && prev.summary ? (d === 1 ? prev.summary.promoted : prev.summary.relegated) : null;
    const cls = d === 1 ? (i, n) => i < 4 ? 'q' : i >= n - 2 ? 'rel' : '' : (i) => i < 2 ? 'up' : '';
    const note = d === 1
      ? '<span class="zone q">Top 4</span> play the semifinals. <span class="zone rel">Bottom 2</span> go down to the 2. Liga next season.'
      : '<span class="zone up">Top 2</span> go up to the 1. Liga next season.';
    const intro = moved && moved.length ? `<p class="muted note" style="margin-top:0">${d === 1 ? 'Promoted' : 'Relegated'} last season: <b>${moved.map(esc).join(', ')}</b></p>`
      : comp.seededBy && d === 1 ? `<p class="muted note" style="margin-top:0">First Bundesliga season: the ${comp.seededBy === 'table' ? 'top 8 of the last Länderliga table' : '8 strongest squads'} start in the 1. Liga.</p>` : '';
    return intro + standingsTable('league', rows, 0, cls) + `<p class="muted note">${note} Win 2 pts. Level on points: net run rate decides.</p>`;
  }

  function groupsHTML(comp) {
    return `<div class="groups">${Object.keys(comp.groups).map(g => `<div><h3>Group ${g}</h3>${standingsTable('cup', C.groupTable(state.db, comp, g), 2)}</div>`).join('')}</div>
      <p class="muted note">${comp.format === 'v2' ? 'Top 2 in each group reach the second round.' : 'Top 2 in each group reach the Round of 16.'}</p>`;
  }

  function round2HTML(comp) {
    if (!comp.groups2) {
      return `<p class="muted" style="margin-top:0">The second round starts when the group stage is finished.</p>
        <div class="groups"><div><h3>Group X</h3><p class="muted note">Winners of groups A, C and E, runners-up of B and D</p></div>
        <div><h3>Group Y</h3><p class="muted note">Winners of groups B and D, runners-up of A, C and E</p></div></div>`;
    }
    return `<div class="groups">${['X', 'Y'].map(g => `<div><h3>Group ${g}</h3>${standingsTable('cup', C.round2Table(state.db, comp, g), 2)}</div>`).join('')}</div>
      <p class="muted note">Top 2 in each group reach the semifinals: X1 v Y2 and Y1 v X2.</p>`;
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
    const stages = comp.kind === 'league' || comp.format === 'v2' ? [['SF', 'Semifinals', 2], ['F', 'Final', 1]] : [['R16', 'Round of 16', 8], ['QF', 'Quarterfinals', 4], ['SF', 'Semifinals', 2], ['F', 'Final', 1]];
    const cols = stages.map(([s, label, n]) => {
      const list = st(s);
      return `<div class="bcol"><h3>${label}</h3><div class="bcol-list">${Array.from({ length: n }, (_, i) => koMatchHTML(comp, list[i])).join('')}</div></div>`;
    }).join('');
    const intro = comp.kind === 'league' ? (comp.format === 'div' ? 'Semifinals: 1st v 4th and 2nd v 3rd of the 1. Liga.' : 'Semifinals: 1st v 4th and 2nd v 3rd after the league stage.')
      : comp.format === 'v2' ? 'Semifinals: winner of second-round Group X v runner-up of Group Y, and winner of Y v runner-up of X.'
      : 'Group winners play runners-up from the neighbouring group.';
    return `<p class="muted note" style="margin-top:0">${intro} A tied knockout is decided on boundary count.</p><div class="bracket">${cols}</div>`;
  }

  function fixturesHTML(comp) {
    const kind = comp.kind;
    const groups = [];
    for (const f of comp.fixtures) {
      const key = f.stage === 'league' ? `Round ${f.round}` : f.stage === 'group' ? `Group stage · matchday ${f.round}` : f.stage === 'R2' ? `Second round · round ${f.round}` : C.STAGE_LABEL[f.stage];
      let g = groups.find(x => x.key === key); if (!g) groups.push(g = { key, list: [] });
      g.list.push(f);
    }
    // show unfinished rounds first, newest results after
    const open = groups.filter(g => g.list.some(f => !f.result)), closed = groups.filter(g => g.list.every(f => f.result)).reverse();
    return [...open, ...closed].map(g => `<div class="fx-group"><h3>${g.key}</h3>${g.list.map(f => `<div class="fx">
        <div class="fx-teams">${f.group ? `<span class="gtag">${f.group}</span>` : f.div ? `<span class="gtag">${f.div}. Liga</span>` : ''}${chipTeam(kind, f.home)}<span class="vs">v</span>${chipTeam(kind, f.away)}</div>
        <div class="fx-res">${f.result ? `<button class="plink" data-match="${f.id}">${esc(f.result.text)}</button>` : `<button class="mini" data-play="${f.id}">Play</button><button class="mini ghost" data-sim="${f.id}">Sim</button>`}</div>
      </div>`).join('')}</div>`).join('');
  }

  function squadsHTML(kind, comp) {
    const pm = pmap();
    const teams = comp ? C.squadsFor(state.db, comp) : state.db.teams[kind];
    const reserves = kind === 'league' ? state.db.players.filter(p => !p.state) : [];
    const card = (t) => `<div class="squad"><h3>${chipTeam(kind, t.id)}</h3><ul>${t.players.map(id => pm[id]).sort((a, b) => b.bat - a.bat).map(p => `<li><button class="plink" data-player="${p.id}">${esc(p.name)}</button><span class="rt">BAT ${p.bat} · BOWL ${p.bowl} <span class="type-pill ${p.type}">${p.type}</span></span></li>`).join('')}</ul></div>`;
    return `<p class="muted note" style="margin-top:0">${kind === 'league'
      ? 'Each state fields 7 players: its own cities\' players first, with small states topped up from the big ones.'
      : `Each city fields its ${teams[0].players.length} players.`} Every player bowls.</p>
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
      <p class="muted" style="margin:0 0 10px;font-size:13px">Player of the match: <button class="plink" data-player="${m.motm}">${esc(pm[m.motm].name)}</button> (${esc(C.figuresLine(m.innings, m.motm))}) · ${esc(E.PITCHES[m.pitch].label)} pitch</p>
      ${inns}
      ${(m.superOvers || []).length ? `<h3 style="margin:4px 0 8px">Super Over${m.superOvers.length > 2 ? 's' : ''}</h3>
        <div class="so-list">${m.superOvers.map(s => `<div class="so-row"><span class="so-tag">${s.n > 1 ? s.n + '. ' : ''}Super Over</span>${chipTeam(kind, s.team)} <b class="num">${s.runs}/${s.wkts}</b>
          <span class="muted">${s.batting.map(b => `${esc(pm[b.pid].name)} ${b.r}${b.out ? '' : '*'} (${b.b})`).join(', ')} · bowled by ${s.bowling.map(b => `${esc(pm[b.pid].name)} ${b.w}/${b.r}`).join(', ')}</span></div>`).join('')}</div>
        <p class="muted note" style="margin-bottom:14px">Super Over runs and wickets don't count in player stats.</p>` : ''}
      <button class="primary" id="btn-close-modal">Close</button>`;
    modal.hidden = false;
    document.getElementById('btn-close-modal').onclick = () => { modal.hidden = true; };
    bindPlayerLinks(modalCard);
  }

  // ======================= PLAYERS =======================
  const PL_COLS = [
    ['name', 'Player'], ['mat', 'Mat'], ['runs', 'Runs'], ['balls', 'Balls'], ['hs', 'HS'], ['avg', 'Avg'], ['sr', 'SR'], ['f4', '4s'], ['s6', '6s'],
    ['wkts', 'Wkts'], ['overs', 'Ov'], ['econ', 'Econ'], ['best', 'Best'], ['motm', 'PoM'], ['pos', 'PoS'],
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
            <td><b>${s.wkts}</b></td><td>${s.overs}</td><td>${s.econ}</td><td>${s.best}</td><td>${s.motm}</td><td>${s.pos}</td></tr>`).join('')}
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

  function teamHistoryHTML(pid) {
    const rows = ['league', 'cup'].map(kind => {
      const list = state.db.competitions.filter(c => c.kind === kind).map(c => {
        const t = C.squadsFor(state.db, c).find(x => x.players.includes(pid));
        return `S${c.season} ${t ? esc(t.short || t.name) : '–'}`;
      });
      return list.length ? `<div><span class="tw-label">${C.COMPS[kind].name}</span> ${list.join(' · ')}</div>` : '';
    }).join('');
    return rows ? `<div class="team-history">${rows}</div>` : '';
  }
  function seriesTitles(pid) {
    const won = state.db.competitions.filter(c => c.summary && c.summary.playerOfSeries && c.summary.playerOfSeries.pid === pid).map(c => `${c.name} S${c.season}`);
    return won.length ? ` (${esc(won.join(', '))})` : '';
  }

  function openPlayer(pid) {
    const db = state.db, p = pmap()[pid], st = db.stats[pid];
    const row = (label, s) => { s = C.fmtStats(s); return `<tr><td>${label}</td><td>${s.mat}</td><td>${s.inn}</td><td><b>${s.runs}</b></td><td>${s.balls}</td><td>${s.hsText}</td><td>${s.avg}</td><td>${s.sr}</td><td>${s.f4}</td><td>${s.s6}</td><td>${s.thirties}/${s.fifties}</td></tr>`; };
    const brow = (label, s) => { s = C.fmtStats(s); return `<tr><td>${label}</td><td>${s.overs}</td><td>${s.maidens}</td><td>${s.runsConceded}</td><td><b>${s.wkts}</b></td><td>${s.best}</td><td>${s.bowlAvg}</td><td>${s.econ}</td><td>${s.dots}</td></tr>`; };
    const recent = db.matches.filter(m => m.innings.some(I => I.batting.some(b => b.pid === pid) || I.dnb.includes(pid) || I.bowling.some(b => b.pid === pid))).slice(-6).reverse();
    const roleName = { bat: 'Batter', ar: 'All-rounder', bowl: 'Bowler' }[p.role];
    modalCard.innerHTML = `<div class="cc-kicker">${roleName} · ${p.type === 'pace' ? 'Pace' : 'Spin'} · BAT ${p.bat} · BOWL ${p.bowl}</div>
      <div class="name-row"><h2 style="margin:4px 0">${esc(p.name)}</h2><button class="link-btn" id="btn-rename">✏️ Rename</button></div>
      <form id="rename-form" class="rename-form" hidden>
        <label for="rename-in" class="muted" style="font-size:13px">New name${state.store === 'cloud' && state.profile ? ` (only in ${esc(state.profile.name)}'s game)` : ''}</label>
        <div class="rename-row"><input id="rename-in" maxlength="30" value="${esc(p.name)}" autocomplete="off"><button class="primary" type="submit">Save</button><button class="secondary" type="button" id="rename-cancel">Cancel</button></div>
        <p class="form-msg" id="rename-msg"></p>
      </form>
      <p class="muted" style="margin:0 0 12px;font-size:14px">Städtepokal: ${esc(tname('cup', p.city))} · Länderliga: ${p.state ? esc(tname('league', p.state)) : 'not in a state squad'}<br>
        Player of the match: <b>${st.all.motm}</b> · Player of the series: <b>${st.all.pos}</b>${seriesTitles(pid)}</p>
      ${teamHistoryHTML(pid)}
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
    const form = document.getElementById('rename-form');
    document.getElementById('btn-rename').onclick = () => { form.hidden = false; const i = document.getElementById('rename-in'); i.focus(); i.select(); };
    document.getElementById('rename-cancel').onclick = () => { form.hidden = true; };
    form.onsubmit = async e => {
      e.preventDefault();
      const name = document.getElementById('rename-in').value.trim().replace(/\s+/g, ' ');
      const msg = document.getElementById('rename-msg');
      if (!name) { msg.textContent = 'Enter a name.'; return; }
      if (name === p.name) { form.hidden = true; return; }
      if (state.db.players.some(x => x.id !== pid && x.name.toLowerCase() === name.toLowerCase())) { msg.textContent = 'Another player already has that name.'; return; }
      msg.textContent = 'Saving…';
      if (await renamePlayerHere(pid, name)) openPlayer(pid);
      else msg.textContent = state.saveMsg;
    };
  }

  // Renames only in the open profile; the normal save sends the new names to its own records
  async function renamePlayerHere(pid, name) {
    const old = state.db.players.find(x => x.id === pid).name;
    const changed = C.renamePlayer(state.db, pid, name);
    const resend = changed.filter(id => state.savedIds.has(id));
    for (const id of resend) state.savedIds.delete(id);          // re-upload scorecards whose text changed
    if (!(await save())) {
      C.renamePlayer(state.db, pid, old);
      for (const id of resend) state.savedIds.add(id);
      return false;
    }
    if (state.match) for (const t of state.match.teams) for (const pl of t.players) if (pl.pid === pid) pl.name = name;
    showToast(`${old} is now ${name}`);
    render();
    return true;
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
        <div class="hist-top">
          <div class="hist-champ"><span class="trophy-s">🏆</span><div><b>${esc(S.champion)}</b> champions<div class="muted" style="font-size:13px">Runners-up: ${esc(S.runnerUp)}</div>${S.promoted ? `<div class="muted" style="font-size:13px">⬆ ${S.promoted.map(esc).join(', ')} · ⬇ ${S.relegated.map(esc).join(', ')}</div>` : ''}</div></div>
          ${S.playerOfSeries ? `<div class="hist-champ pos"><span class="trophy-s">👑</span><div><div class="cc-kicker">Player of the series</div><b><button class="plink" data-player="${S.playerOfSeries.pid}">${esc(S.playerOfSeries.name)}</button></b><div class="muted" style="font-size:13px">${S.playerOfSeries.runs} runs · ${S.playerOfSeries.wkts} wkt${S.playerOfSeries.wkts === 1 ? '' : 's'} · ${S.playerOfSeries.mat} matches</div></div></div>` : ''}
        </div>
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
      text: `This permanently deletes every season, scorecard and player stat (${db.matches.length} matches)${state.store === 'cloud' ? ` in ${state.profile.name}'s profile. Other profiles are not touched` : ''}. The 120 players and their teams stay. It can't be undone.`,
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
