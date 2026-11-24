/* ==========================================================================
   Mosquito Shooter — game logic, input, UI, waves, scoring
   ========================================================================== */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const W = Art.W;
  let H = 854, K = 1;

  const cv = $('cv'), ctx = cv.getContext('2d'), gameEl = $('game');
  let bg = null, vig = null;

  /* ---------------- storage ---------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  let best = parseInt(store.get('mosquitoShooter.best', '0'), 10) || 0;
  const opts = { shake: store.get('mosquitoShooter.shake', '1') === '1', vibe: store.get('mosquitoShooter.vibe', '1') === '1' };

  /* ---------------- state ---------------- */
  let state = 'menu';                 // menu | playing | paused | gameover
  let T = 0;                          // animation clock (stops while paused)
  const S = { hp: 100, score: 0, shownScore: 0, kills: 0, combo: 0, comboT: 0, streak: 0, wave: 0 };
  const P = { hurt: 0, shoot: 0, dead: false, hpFrac: 1, legAngle: -Math.PI / 2, recoil: 0, flash: 0 };
  const WV = { n: 0, state: 'intro', t: 0, total: 0, spawned: 0, interval: 1.5, timer: 0, speedMul: 1, bites: 0, queenDone: false };
  let mosq = [], bullets = [], parts = [], fires = [], welts = [];
  let shake = 0, cooldown = 0, zzzT = 0, queenT = 0;
  let swarmArmed = true, lastSwarm = -99, biteTimes = [];
  let goTimer = null, goCount = 0, goTarget = 0;
  let settingsFrom = 'menu';

  const BSPEED = 980;
  const TYPES = {
    normal:  { r: 15, hp: 1,  speed: 54,  dmg: 7,  pts: 10,  wob: 0.9 },
    fast:    { r: 12, hp: 1,  speed: 112, dmg: 6,  pts: 20,  wob: 1.4 },
    fat:     { r: 23, hp: 3,  speed: 36,  dmg: 12, pts: 35,  wob: 0.5 },
    armored: { r: 19, hp: 3,  speed: 46,  dmg: 10, pts: 50,  wob: 0.6 },
    golden:  { r: 16, hp: 2,  speed: 88,  dmg: 4,  pts: 200, wob: 1.7 },
    queen:   { r: 34, hp: 14, speed: 24,  dmg: 22, pts: 500, wob: 0.3 },
    rekha:   { r: 21, hp: 4,  speed: 66,  dmg: 14, pts: 150, wob: 1.2 }
  };
  const KILL_WORDS = ['SPLAT!', 'BZZT!', 'PFFT!', 'NOPE!', 'SQUISH!', 'BYE!', 'POP!', 'ZAP!'];
  const BITE_WORDS = ['OUCH!', 'ITCHY!', 'AARGH!', 'MY SKIN!', 'BURNS!', 'YEOWCH!'];
  const WAVE_QUIPS = ['A few slow, sleepy bugs…', 'They brought friends!', 'Turbo mosquitoes incoming!', 'Coordinated attack!', 'THE QUEEN ARRIVES!', 'It\'s a mosquito rave!', 'Bite club is in session!', 'Absolute buzz-hem!', 'Nobody sleeps tonight!', 'THE QUEEN IS BACK!'];
  const GO_QUIPS = ['The mosquitoes win this round…', 'Itchy. So very itchy.', 'He\'ll be scratching for days.', 'Should have used a net!', 'Blood bank: closed.', 'Sweet dreams turned into itchy dreams.'];

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ======================================================================
     LAYOUT / RESIZE
     ====================================================================== */
  function resize() {
    const aw = window.innerWidth, ah = window.innerHeight;
    const ar = clamp(aw / ah, 0.46, 0.5621);
    const bw = Math.min(aw, ah * ar), bh = bw / ar;
    gameEl.style.width = bw + 'px'; gameEl.style.height = bh + 'px';
    gameEl.style.fontSize = (bw / 30) + 'px';          // 1em = 16 game units
    H = Math.round(W / ar);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(bw * dpr); cv.height = Math.round(bh * dpr);
    K = cv.width / W;
    Art.layout(H);
    bg = Art.buildBackground(K);
    vig = Art.buildVignette(K);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 150));

  /* ======================================================================
     PARTICLE HELPERS
     ====================================================================== */
  function addP(o) { if (parts.length < 520) parts.push(Object.assign({ vx: 0, vy: 0, g: 0, drag: 0, rot: 0, vr: 0, size: 4, color: '#fff' }, o)); }
  function burst(x, y, color, n, sp, size, life) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, s = rand(sp * 0.3, sp);
      addP({ type: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 300, life: rand(life * 0.6, life), max: life, size: rand(size * 0.6, size), color });
    }
  }
  function floatText(x, y, text, color, size, life, stroke) {
    addP({ type: 'text', x, y, vy: -46, drag: 0.9, rot: rand(-0.12, 0.12), text, color, size, life: life || 0.9, max: life || 0.9, stroke });
  }

  /* ======================================================================
     HUD
     ====================================================================== */
  const el = {
    hud: $('hud'), score: $('score'), kills: $('killNum'), wave: $('waveNum'), best: $('bestNum'),
    hpFill: $('hpFill'), hpGhost: $('hpGhost'), hpText: $('hpText'), hpBar: $('hpBar'),
    combo: $('combo'), banner: $('banner'), shoot: $('shootBtn'), flash: $('redflash'),
    menuBest: $('menuBest')
  };
  const screens = { menu: $('menu'), howto: $('howto'), settings: $('settings'), pause: $('pause'), gameover: $('gameover') };
  function showScreen(name) { Object.keys(screens).forEach(k => screens[k].classList.toggle('show', k === name)); }

  function hudHP() {
    const pct = clamp(S.hp, 0, 100);
    el.hpFill.style.width = pct + '%'; el.hpGhost.style.width = pct + '%';
    el.hpText.textContent = Math.ceil(pct);
    el.hpBar.classList.toggle('mid', pct < 60 && pct >= 30);
    el.hpBar.classList.toggle('low', pct < 30);
    el.hud.classList.toggle('low', pct < 30);
    P.hpFrac = pct / 100;
  }
  function hudStats() {
    el.kills.textContent = S.kills; el.wave.textContent = Math.max(1, WV.n); el.best.textContent = Math.max(best, S.score);
  }
  function popScore() { el.score.classList.remove('pop'); void el.score.offsetWidth; el.score.classList.add('pop'); }
  function showBanner(title, sub, cls, dur) {
    const b = el.banner; b.className = ''; void b.offsetWidth;
    b.querySelector('.b-title').textContent = title; b.querySelector('.b-sub').textContent = sub || '';
    b.style.animationDuration = (dur || 2.3) + 's';
    b.classList.add('show'); if (cls) b.classList.add(cls);
  }
  function showCombo(n, mult) {
    el.combo.textContent = 'COMBO x' + n + (mult > 1 ? '  •  ' + mult + 'x POINTS' : '');
    el.combo.classList.remove('show'); void el.combo.offsetWidth; el.combo.classList.add('show');
  }
  function redFlash(alert) {
    el.flash.classList.toggle('alert', !!alert); el.flash.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => el.flash.classList.remove('on')));
  }
  function updateSoundIcons() {
    ['btnSoundHud', 'btnSoundMenu'].forEach(id => $(id).classList.toggle('muted', Sound.settings.muted));
    setSwitch($('swMute'), !Sound.settings.muted);
  }
  function setSwitch(b, on) { b.setAttribute('aria-checked', on ? 'true' : 'false'); }

  /* ======================================================================
     MOSQUITOES
     ====================================================================== */
  function spawnMosquito(type, x, y) {
    if (mosq.length >= 40) return null;
    const d = TYPES[type];
    if (x === undefined) {
      const side = Math.random(), top = 0.42, left = 0.72;
      if (side < top) { x = rand(-10, W + 10); y = -30; }
      else if (side < left) { x = -30; y = rand(30, H * 0.5); }
      else { x = W + 30; y = rand(30, H * 0.5); }
    }
    const w = Math.max(1, WV.n);
    let hp = d.hp;
    if (type === 'armored') hp = 3 + Math.floor(w / 6);
    if (type === 'fat') hp = 3 + Math.floor(w / 8);
    if (type === 'queen') hp = 14 + 4 * Math.floor(w / 5);
    if (type === 'rekha') { hp = 4 + Math.floor(w / 4); if (mosq.length < 40 && WV.n > 0) { showBanner('REKHA ARRIVES!', 'The diva mosquito screams back…', 'alert', 2); } }
    const si = Math.floor(Math.random() * Art.SPOTS.length), sp = Art.spot(si);
    const m = {
      type, def: d, x, y, vx: 0, vy: 0, hp, maxhp: hp, r: d.r, speed: d.speed * WV.speedMul * rand(0.9, 1.15),
      tx: sp.x + rand(-4, 4), ty: sp.y + rand(-3, 3), spot: si, state: 'fly', life: 0, phase: rand(0, 6.28), wobF: rand(2.5, 5.5),
      face: x < W / 2 ? 1 : -1, dir: x < W / 2 ? 1 : -1, tilt: 0, hitFlash: 0, suck: 0, suckT: 0
    };
    if (type === 'golden') m.speed = d.speed * Math.min(1.4, WV.speedMul);
    mosq.push(m);
    return m;
  }

  function pickType(w) {
    const bag = [['normal', 100]];
    if (w >= 2) bag.push(['fast', 18 + w * 3]);
    if (w >= 3) bag.push(['fat', 14 + w * 2]);
    if (w >= 4) bag.push(['armored', 12 + w * 2]);
    if (w >= 3 && !mosq.some(m => m.type === 'golden') && Math.random() < 0.09) return 'golden';
    if (w >= 3 && !mosq.some(m => m.type === 'rekha') && Math.random() < Math.min(0.3, 0.12 + 0.02 * (w - 3))) return 'rekha';
    const tot = bag.reduce((a, b) => a + b[1], 0); let r = Math.random() * tot;
    for (const b of bag) { r -= b[1]; if (r <= 0) return b[0]; }
    return 'normal';
  }

  function updateMosquito(m, dt) {
    m.life += dt; m.hitFlash = Math.max(0, m.hitFlash - dt);
    const ox = m.x, oy = m.y;

    if (m.state === 'fly' || m.state === 'flee') {
      let tx = m.tx, ty = m.ty, sp = m.speed;
      if (m.state === 'flee') { tx = m.x < W / 2 ? -80 : W + 80; ty = -80; sp = 170; }
      const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d;
      const near = Math.min(1, d / 150);
      const wob = Math.sin(m.life * m.wobF + m.phase) * m.def.wob * near;
      const vx = ux * sp - uy * sp * wob, vy = uy * sp + ux * sp * wob;
      const k = Math.min(1, dt * 7);
      m.vx += (vx - m.vx) * k; m.vy += (vy - m.vy) * k;
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.state === 'fly' && d < 14) startBite(m);
      if (m.state === 'fly' && m.type === 'golden' && m.life > 13) { m.state = 'flee'; floatText(m.x, m.y, 'BYE BYE!', '#ffe14a', 26, 1); }
      if (m.state === 'flee' && (m.y < -60 || m.x < -70 || m.x > W + 70)) m.gone = true;
    } else if (m.state === 'suck') {
      m.suckT += dt; m.suck = Math.min(1, m.suckT / 0.5);
      m.x = m.tx + Math.sin(T * 60) * 1.2; m.y = m.ty + Math.cos(T * 53) * 1.2;
      m.vx = m.vy = 0;
      if (m.suckT >= 0.6) {            // bite complete -> mosquito disappears
        burst(m.x, m.y, '#d81e3a', 8, 120, 4, 0.5);
        for (let i = 0; i < 4; i++) addP({ type: 'smoke', x: m.x, y: m.y, vx: rand(-30, 30), vy: rand(-40, -10), life: 0.6, max: 0.6, size: 8, color: 'rgba(230,230,255,.6)' });
        floatText(m.x, m.y - 20, 'BURP!', '#ff9ab3', 24, 0.8);
        m.gone = true;
      }
    } else if (m.state === 'orbit') {
      const t = T * m.os + m.ph;
      m.x = m.cx + Math.cos(t) * m.orx; m.y = m.cy + Math.sin(t * 1.31) * m.ory;
      m.vx = (m.x - ox) / Math.max(dt, 0.001); m.vy = (m.y - oy) / Math.max(dt, 0.001);
    }
    if (Math.abs(m.vx) > 8) m.dir = m.vx > 0 ? 1 : -1;
    m.face += (m.dir - m.face) * Math.min(1, dt * 14);
    const ha = Math.atan2(m.vy, Math.max(1, Math.abs(m.vx)));
    const tl = clamp(ha * m.dir, -1, 1) * 0.45;
    m.tilt += (tl - m.tilt) * Math.min(1, dt * 8);
  }

  function startBite(m) {
    m.state = 'suck'; m.suckT = 0; m.x = m.tx; m.y = m.ty;
    const d = m.def;
    S.hp = Math.max(0, S.hp - d.dmg);
    WV.bites++; S.streak = 0;
    P.hurt = 0.85;
    const f = Art.spot(m.spot);
    fires.push({ x: f.x, y: f.y, life: 1.7, max: 1.7, s: m.type === 'queen' ? 1.5 : m.type === 'fat' ? 1.2 : 1, seed: rand(0, 6) });
    welts.push({ x: f.x, y: f.y, life: 6, max: 6 });
    floatText(f.x + rand(-10, 10), f.y - 44, '-' + d.dmg, '#ff5a5a', 38, 1.1);
    floatText(f.x + rand(-20, 20), f.y - 82, m.type === 'rekha' ? 'AAAAAAGH!!' : pick(BITE_WORDS), m.type === 'rekha' ? '#ff6ad5' : '#ffd84a', m.type === 'rekha' ? 40 : 28, 0.9);
    shake = Math.max(shake, 9); redFlash(false);
    el.hpBar.classList.remove('shake'); void el.hpBar.offsetWidth; el.hpBar.classList.add('shake');
    Sound.play(m.type === 'rekha' ? 'scream' : 'bite');
    if (opts.vibe && navigator.vibrate) { try { navigator.vibrate(d.dmg > 10 ? [60, 30, 60] : 50); } catch (e) {} }
    S.combo = 0;
    biteTimes.push(T); biteTimes = biteTimes.filter(t => T - t < 3);
    if (biteTimes.length >= 3) triggerSwarm('MULTI-BITE!');
    hudHP();
    if (S.hp <= 0) gameOver();
  }

  function killMosquito(m) {
    m.gone = true;
    const d = m.def;
    S.combo++; S.comboT = 1.7;
    const mult = Math.min(5, 1 + Math.floor(S.combo / 3));
    const pts = d.pts * mult;
    S.score += pts; S.kills++; S.streak++;
    // visuals
    const col = m.type === 'rekha' ? '#ff6ad5' : m.type === 'golden' ? '#ffd84a' : m.type === 'fast' ? '#b07aff' : m.type === 'queen' ? '#ff4f8f' : '#7dff4a';
    addP({ type: 'splat', x: m.x, y: m.y, size: m.r * 1.3, life: 0.45, max: 0.45, color: col });
    addP({ type: 'ring', x: m.x, y: m.y, size: m.r * 3.2, life: 0.4, max: 0.4, color: 'rgba(255,255,255,.9)' });
    burst(m.x, m.y, col, m.type === 'queen' ? 36 : 12, 260, 5, 0.7);
    for (let i = 0; i < 2; i++) addP({ type: 'wing', x: m.x, y: m.y, vx: rand(-70, 70), vy: rand(-90, -20), g: 160, rot: rand(0, 6), vr: rand(-6, 6), life: 1, max: 1 });
    floatText(m.x, m.y - m.r - 6, pick(KILL_WORDS), '#fff', m.type === 'queen' ? 42 : 24, 0.75);
    floatText(m.x, m.y + m.r + 12, '+' + pts, mult > 1 ? '#ffe14a' : '#9be8ff', 22 + mult * 2, 0.9);
    shake = Math.max(shake, m.type === 'queen' ? 16 : m.def.hp > 2 ? 5 : 2.5);
    if (m.type === 'golden') {
      S.hp = Math.min(100, S.hp + 15); hudHP();
      floatText(m.x, m.y - 50, '+15 HEALTH!', '#7dff6a', 30, 1.2);
    }
    if (m.type === 'queen') showBanner('QUEEN DOWN!', '+' + pts + ' points', 'good', 1.8);
    if (S.combo >= 3) showCombo(S.combo, mult);
    if (S.streak > 0 && S.streak % 10 === 0) {
      const bonus = 50 * (S.streak / 10); S.score += bonus;
      floatText(W / 2, H * 0.3, 'STREAK ' + S.streak + '!  +' + bonus, '#ff9ee0', 34, 1.4);
    }
    popScore(); hudStats();
  }

  function triggerSwarm(label) {
    if (T - lastSwarm < 14) return;
    lastSwarm = T;
    Sound.play('swarm');
    showBanner('SWARM ALERT!', label || 'THEY ARE EVERYWHERE!', 'alert', 2.2);
    redFlash(true); shake = Math.max(shake, 8);
  }

  /* ======================================================================
     WAVES
     ====================================================================== */
  function startWave(n) {
    WV.n = n; S.wave = n;
    WV.total = 4 + 2 * n + Math.floor(n * n / 5);
    WV.spawned = 0; WV.bites = 0; WV.queenDone = false;
    WV.interval = Math.max(0.5, 1.9 - 0.11 * n);
    WV.speedMul = Math.min(2.4, 1 + 0.07 * (n - 1));
    WV.timer = 0.4; WV.state = 'intro'; WV.t = 2.3;
    const queen = n % 5 === 0;
    if (queen) WV.total += 1;
    const sub = n === 1 ? 'Tap to shoot • hold SHOOT to auto-aim' : (queen ? WAVE_QUIPS[4 + ((n / 5 - 1) % 2) * 5] : WAVE_QUIPS[Math.min(n - 1, 8)] || 'Absolute chaos!');
    showBanner('WAVE ' + n, sub, queen ? 'alert' : '', 2.3);
    hudStats();
  }

  function updateWaves(dt) {
    if (WV.state === 'intro') { WV.t -= dt; if (WV.t <= 0) WV.state = 'active'; return; }
    if (WV.state === 'clear') { WV.t -= dt; if (WV.t <= 0) startWave(WV.n + 1); return; }
    // active
    WV.timer -= dt;
    if (WV.spawned < WV.total && WV.timer <= 0) {
      if (WV.n % 5 === 0 && !WV.queenDone) {
        WV.queenDone = true; WV.spawned++; spawnMosquito('queen', W / 2, -50); queenT = 3.2;
        triggerSwarm('THE QUEEN IS HERE!');
      } else {
        let burstN = 1;
        if (WV.n >= 4 && Math.random() < Math.min(0.45, 0.1 + 0.04 * (WV.n - 4))) burstN = Math.floor(rand(2, Math.min(5, 2 + (WV.n - 4) / 3) + 1));
        burstN = Math.min(burstN, WV.total - WV.spawned);
        const side = Math.random();
        for (let i = 0; i < burstN; i++) {
          const t = pickType(WV.n);
          if (burstN > 1) { // simultaneous attack from one direction
            const x = side < 0.5 ? rand(40, W - 40) : (side < 0.75 ? -30 : W + 30);
            const y = side < 0.5 ? -30 - i * 16 : rand(30, H * 0.4);
            spawnMosquito(t, x + (side < 0.5 ? 0 : (side < 0.75 ? -i * 16 : i * 16)), y);
          } else spawnMosquito(t);
          WV.spawned++;
        }
      }
      WV.timer = WV.interval * rand(0.7, 1.3);
    }
    // queen keeps spawning minions
    if (mosq.some(m => m.type === 'queen' && m.state === 'fly')) {
      queenT -= dt;
      if (queenT <= 0) {
        const q = mosq.find(m => m.type === 'queen'); queenT = 3.4;
        if (q && mosq.length < 30) { const c = spawnMosquito(Math.random() < 0.3 ? 'fast' : 'normal', q.x, q.y + 20); if (c) { addP({ type: 'ring', x: q.x, y: q.y, size: 50, life: 0.4, max: 0.4, color: '#ff9ac2' }); floatText(q.x, q.y - 50, 'KIDS!', '#ff9ac2', 22, 0.8); } }
      }
    }
    if (WV.spawned >= WV.total && mosq.length === 0) waveClear();
  }

  function waveClear() {
    WV.state = 'clear'; WV.t = 2.6;
    const perfect = WV.bites === 0;
    const bonus = 100 * WV.n + (perfect ? 250 : 0);
    S.score += bonus; S.hp = Math.min(100, S.hp + 8); hudHP(); popScore(); hudStats();
    showBanner(perfect ? 'PERFECT WAVE!' : 'WAVE CLEAR!', '+' + bonus + ' bonus' + (perfect ? ' • no bites!' : ' • +8 health'), 'good', 2.4);
    for (let i = 0; i < 24; i++) addP({ type: 'spark', x: rand(40, W - 40), y: rand(H * 0.2, H * 0.5), vx: rand(-60, 60), vy: rand(-120, -20), g: 140, life: 1.1, max: 1.1, size: 5, color: pick(['#ffd84a', '#7dff6a', '#35e6ff', '#ff3fa4']) });
  }

  /* ======================================================================
     SHOOTING
     ====================================================================== */
  const input = { ptr: null, down: false, id: null, btn: false, key: false, hover: null, queued: null };

  function lead(m, from) {
    const d = Math.hypot(m.x - from.x, m.y - from.y), t = d / BSPEED;
    return { x: clamp(m.x + m.vx * t, 0, W), y: clamp(m.y + m.vy * t, 0, H) };
  }
  function assist(x, y) {
    const pv = Art.pivot(); let bestM = null, bd = 1e9;
    for (const m of mosq) {
      if (m.state === 'orbit') continue;
      const d = Math.hypot(m.x - x, m.y - y);
      if (d < 36 + m.r * 1.3 && d < bd) { bd = d; bestM = m; }
    }
    return bestM ? lead(bestM, pv) : { x, y };
  }
  function nearestThreat() {
    let bestM = null, bd = 1e9;
    for (const m of mosq) {
      if (m.state !== 'fly') continue;
      const d = Math.hypot(m.tx - m.x, m.ty - m.y) - (m.type === 'queen' ? 60 : 0);
      if (d < bd) { bd = d; bestM = m; }
    }
    return bestM;
  }
  function angleTo(tx, ty) {
    const pv = Art.pivot();
    let a = Math.atan2(ty - pv.y, tx - pv.x);
    const lim = 25 * Math.PI / 180;
    if (a > 0) { if (a < Math.PI / 2) a = Math.min(a, lim); else a = Math.max(a, Math.PI - lim); }
    return a;
  }

  function desiredAim() {
    if (input.down && input.ptr) return assist(input.ptr.x, input.ptr.y);
    if (input.btn) { const m = nearestThreat(); if (m) return lead(m, Art.pivot()); }
    if (input.hover) return input.hover;
    const m = nearestThreat(); if (m) return { x: m.x, y: m.y };
    return null;
  }

  function fire() {
    let target = null;
    if (input.down && input.ptr) target = assist(input.ptr.x, input.ptr.y);
    else if (input.queued) target = assist(input.queued.x, input.queued.y);
    else if (input.btn) { const m = nearestThreat(); target = m ? lead(m, Art.pivot()) : null; }
    else if (input.key) {
      if (input.hover) target = assist(input.hover.x, input.hover.y);
      else { const m = nearestThreat(); target = m ? lead(m, Art.pivot()) : null; }
    }
    if (!target) target = { x: Art.pivot().x, y: 0 };
    const a = angleTo(target.x, target.y);
    P.legAngle = a; P.recoil = 1; P.flash = 0.09; P.shoot = 0.28;
    const tip = Art.legTip(P);
    const c = Math.cos(a), s = Math.sin(a);
    bullets.push({ x: tip.x, y: tip.y, vx: c * BSPEED, vy: s * BSPEED, sp: BSPEED, r: 8, life: 1.6 });
    for (let i = 0; i < 5; i++) addP({ type: 'spark', x: tip.x, y: tip.y, vx: c * rand(80, 260) + rand(-80, 80), vy: s * rand(80, 260) + rand(-80, 80), life: 0.3, max: 0.3, size: 4, color: pick(['#fff6a0', '#b6ff6a', '#ffffff']) });
    if (Math.random() < 0.13) floatText(tip.x + c * 22, tip.y + s * 22 - 8, pick(['PEW!', 'BOING!', 'PFFT!', 'TOE-ZAP!', 'KICK!']), '#b6ff6a', 20, 0.6);
    cooldown = 0.17; input.queued = null;
  }

  function updateBullets(dt) {
    for (const b of bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40 || b.life <= 0) { b.dead = true; continue; }
      for (const m of mosq) {
        if (m.gone || m.state === 'orbit') continue;
        const rr = m.r + b.r;
        if ((m.x - b.x) ** 2 + (m.y - b.y) ** 2 < rr * rr) {
          b.dead = true; m.hp--; m.hitFlash = 0.12;
          m.vx += b.vx * 0.05; m.vy += b.vy * 0.05;
          addP({ type: 'ring', x: b.x, y: b.y, size: 26, life: 0.25, max: 0.25, color: '#b6ff6a' });
          burst(b.x, b.y, '#fff3a0', 6, 200, 4, 0.35);
          if (m.hp <= 0) killMosquito(m);
          else { shake = Math.max(shake, 3); floatText(m.x, m.y - m.r - 10, m.type === 'armored' ? 'CLANG!' : 'OOF!', '#ffe9a0', 22, 0.5); }
          break;
        }
      }
    }
    bullets = bullets.filter(b => !b.dead);
  }

  /* ======================================================================
     GAME FLOW
     ====================================================================== */
  function clearGame() {
    mosq = []; bullets = []; parts = []; fires = []; welts = [];
    S.hp = 100; S.score = 0; S.shownScore = 0; S.kills = 0; S.combo = 0; S.comboT = 0; S.streak = 0; S.wave = 0;
    P.hurt = 0; P.shoot = 0; P.dead = false; P.recoil = 0; P.flash = 0; P.hpFrac = 1; P.legAngle = -Math.PI / 2;
    WV.n = 0; shake = 0; cooldown = 0; swarmArmed = true; lastSwarm = -99; biteTimes = [];
    input.down = false; input.btn = false; input.key = false; input.ptr = null; input.queued = null;
    el.shoot.classList.remove('down');
    if (goTimer) { clearTimeout(goTimer); goTimer = null; }
    goTarget = 0; goCount = 0;
  }

  function startGame() {
    Sound.unlock(); Sound.stopAll();
    clearGame();
    state = 'playing';
    showScreen(null);
    el.hud.classList.remove('hidden'); el.shoot.classList.remove('hidden');
    el.score.textContent = '0'; hudHP(); startWave(1);
  }

  function toMenu() {
    Sound.stopAll(); clearGame();
    state = 'menu';
    el.hud.classList.add('hidden'); el.shoot.classList.add('hidden');
    el.banner.className = '';
    el.menuBest.textContent = best;
    seedOrbiters(menuOrbit);
    showScreen('menu');
  }

  function pause() {
    if (state !== 'playing') return;
    state = 'paused'; input.down = input.btn = input.key = false; el.shoot.classList.remove('down');
    Sound.suspend(); showScreen('pause');
  }
  function resume() {
    if (state !== 'paused') return;
    state = 'playing'; Sound.unsuspend(); showScreen(null);
  }

  function gameOver() {
    state = 'gameover'; P.dead = true;
    Sound.stopAll(); Sound.play('over');
    input.down = input.btn = input.key = false; el.shoot.classList.add('hidden'); el.shoot.classList.remove('down');
    shake = 18; redFlash(false);
    const isBest = S.score > best;
    if (isBest) { best = S.score; store.set('mosquitoShooter.best', String(best)); }
    $('newBest').classList.toggle('hidden', !isBest);
    $('goBest').textContent = best; $('goWave').textContent = Math.max(1, WV.n); $('goKills').textContent = S.kills;
    $('goQuip').textContent = pick(GO_QUIPS);
    goTarget = S.score; goCount = 0; $('goScore').textContent = '0';
    // surviving mosquitoes throw a party around the hero
    seedOrbiters(partyOrbit, true);
    for (let i = 0; i < 18; i++) addP({ type: 'spark', x: 240, y: Art.geo().BY - 60, vx: rand(-200, 200), vy: rand(-260, -40), g: 200, life: 1.2, max: 1.2, size: 5, color: pick(['#ff5a6e', '#ffd84a', '#ffffff']) });
    goTimer = setTimeout(() => { goTimer = null; if (state === 'gameover') { el.hud.classList.add('hidden'); showScreen('gameover'); } }, 1100);
  }

  /* orbiting decorative mosquitoes (menu + game-over party) */
  function menuOrbit(m) { m.cx = rand(120, 360); m.cy = rand(H * 0.18, H * 0.62); m.orx = rand(60, 190); m.ory = rand(40, 170); }
  function partyOrbit(m) { m.cx = 240; m.cy = Art.geo().BY - 70; m.orx = rand(70, 200); m.ory = rand(40, 130); }
  function seedOrbiters(fn, keep) {
    if (keep) {
      mosq.forEach(m => { m.state = 'orbit'; m.os = rand(1.2, 2.3); m.ph = rand(0, 6); fn(m); });
      for (let i = mosq.length; i < 6; i++) { const m = spawnMosquito('normal', rand(0, W), -20); if (m) { m.state = 'orbit'; m.os = rand(1.2, 2.3); m.ph = rand(0, 6); fn(m); } }
      return;
    }
    mosq = [];
    const types = ['normal', 'normal', 'fast', 'normal', 'fat', 'golden'];
    types.forEach(t => { const m = spawnMosquito(t, rand(0, W), rand(0, H * 0.5)); if (m) { m.state = 'orbit'; m.os = rand(0.6, 1.3); m.ph = rand(0, 6); fn(m); } });
  }

  /* ======================================================================
     MAIN UPDATE
     ====================================================================== */
  function update(dt) {
    T += dt;
    // hero animation timers
    P.hurt = Math.max(0, P.hurt - dt); P.shoot = Math.max(0, P.shoot - dt);
    P.flash = Math.max(0, P.flash - dt); P.recoil = Math.max(0, P.recoil - dt * 6);
    shake *= Math.exp(-dt * 9); if (shake < 0.2) shake = 0;

    // Zzz
    if (!P.dead && P.hurt <= 0) {
      zzzT -= dt;
      if (zzzT <= 0) {
        zzzT = rand(1.2, 1.8); const g = Art.geo();
        addP({ type: 'z', x: 128, y: g.BY - 76, vx: 14, vy: -22, drag: 0.1, rot: rand(-0.3, 0.3), vr: 0.15, text: pick(['Z', 'z', 'Zz']), size: rand(22, 34), color: '#cfd6ff', life: 2.2, max: 2.2 });
      }
    }

    if (state === 'playing') {
      /* leg aim */
      const aim = desiredAim();
      if (aim) {
        const ta = angleTo(aim.x, aim.y);
        let d = ta - P.legAngle; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283;
        P.legAngle += d * Math.min(1, dt * 16);
      }
      /* shooting */
      cooldown -= dt;
      if ((input.down || input.btn || input.key || input.queued) && cooldown <= 0) fire();

      updateWaves(dt);
      for (const m of mosq) updateMosquito(m, dt);
      updateBullets(dt);
      if (state === 'playing') {                        // (a bite may have ended the game)
        mosq = mosq.filter(m => !m.gone);
        if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }

        // audio: buzz volume follows mosquito count, swarm sound at thresholds
        const alive = mosq.length;
        Sound.setBuzz(alive === 0 ? 0 : Math.min(1, 0.18 + alive * 0.085));
        if (alive >= 9 && swarmArmed) { swarmArmed = false; triggerSwarm('TOO MANY MOSQUITOES!'); }
        if (alive <= 4) swarmArmed = true;
      }
    } else {
      for (const m of mosq) updateMosquito(m, dt);
      mosq = mosq.filter(m => !m.gone);
      if (state === 'gameover' && goTarget > 0 && goCount < goTarget) {
        goCount = Math.min(goTarget, goCount + goTarget * dt / 1.4 + 1);
        $('goScore').textContent = Math.round(goCount);
      } else if (state === 'gameover') $('goScore').textContent = goTarget;
    }

    // score count-up in HUD
    if (S.shownScore !== S.score) {
      S.shownScore += (S.score - S.shownScore) * Math.min(1, dt * 12);
      if (Math.abs(S.score - S.shownScore) < 1) S.shownScore = S.score;
      el.score.textContent = Math.round(S.shownScore);
    }

    // fires / welts / particles
    for (const f of fires) { f.life -= dt; if (Math.random() < dt * 14) addP({ type: 'smoke', x: f.x + rand(-6, 6), y: f.y - 18, vx: rand(-8, 8), vy: rand(-50, -25), life: 0.9, max: 0.9, size: 6, color: 'rgba(60,50,70,.55)' }); }
    fires = fires.filter(f => f.life > 0);
    for (const w of welts) w.life -= dt;
    welts = welts.filter(w => w.life > 0);
    for (const p of parts) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
      if (p.drag) { const k = Math.exp(-p.drag * dt * 3); p.vx *= k; if (p.type === 'text') p.vy *= k; }
      p.rot += p.vr * dt;
    }
    parts = parts.filter(p => p.life > 0);
  }

  /* ======================================================================
     RENDER
     ====================================================================== */
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0820'; ctx.fillRect(0, 0, cv.width, cv.height);
    let sx = 0, sy = 0;
    if (shake > 0 && opts.shake) { sx = (Math.random() - 0.5) * shake * 1.5; sy = (Math.random() - 0.5) * shake * 1.5; }
    ctx.setTransform(K, 0, 0, K, sx * K, sy * K);
    if (bg) ctx.drawImage(bg, 0, 0, W, H);
    Art.drawAmbient(ctx, T);
    Art.drawPlayer(ctx, P, T);
    for (const w of welts) Art.drawWelt(ctx, w);
    for (const f of fires) Art.drawFire(ctx, f, T);
    const sorted = mosq.length > 1 ? mosq.slice().sort((a, b) => a.r - b.r) : mosq;
    for (const m of sorted) Art.drawMosquito(ctx, m, T);
    for (const b of bullets) Art.drawBullet(ctx, b, T);
    for (const p of parts) Art.drawParticle(ctx, p);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (vig) ctx.drawImage(vig, 0, 0, cv.width, cv.height);
    // crosshair for mouse
    if (state === 'playing' && input.hover && !input.touchMode) {
      ctx.setTransform(K, 0, 0, K, 0, 0);
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
      const { x, y } = input.hover; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.moveTo(x - 20, y); ctx.lineTo(x - 8, y); ctx.moveTo(x + 8, y); ctx.lineTo(x + 20, y); ctx.moveTo(x, y - 20); ctx.lineTo(x, y - 8); ctx.moveTo(x, y + 8); ctx.lineTo(x, y + 20); ctx.stroke();
    }
  }

  let last = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    if (state !== 'paused') update(dt);
    render();
    requestAnimationFrame(frame);
  }

  /* ======================================================================
     INPUT
     ====================================================================== */
  function toLogical(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  cv.addEventListener('pointerdown', e => {
    if (state !== 'playing') return;
    e.preventDefault();
    input.touchMode = e.pointerType !== 'mouse';
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    input.id = e.pointerId; input.ptr = toLogical(e); input.hover = input.touchMode ? null : input.ptr; input.down = true;
    if (cooldown <= 0.08) { cooldown = 0; fire(); } else input.queued = input.ptr;
  });
  cv.addEventListener('pointermove', e => {
    if (state !== 'playing') return;
    const p = toLogical(e);
    if (e.pointerType === 'mouse') { input.hover = p; input.touchMode = false; }
    if (input.down && e.pointerId === input.id) input.ptr = p;
  });
  const up = e => { if (e.pointerId === input.id) input.down = false; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', up);
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') input.hover = null; });

  // on-screen SHOOT button (hold = auto-aim at the most dangerous mosquito)
  const sb = el.shoot;
  sb.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { sb.setPointerCapture(e.pointerId); } catch (err) {} input.btn = true; sb.classList.add('down'); if (state === 'playing' && cooldown <= 0.08) { cooldown = 0; fire(); } });
  const sbUp = () => { input.btn = false; sb.classList.remove('down'); };
  sb.addEventListener('pointerup', sbUp); sb.addEventListener('pointercancel', sbUp); sb.addEventListener('lostpointercapture', sbUp);

  window.addEventListener('keydown', e => {
    Sound.unlock();
    if (e.code === 'Space') {
      if (state === 'playing') { e.preventDefault(); if (!input.key) { input.key = true; if (cooldown <= 0.08) { cooldown = 0; fire(); } } }
    } else if (e.code === 'Escape' || e.code === 'KeyP') {
      if (state === 'playing') pause();
      else if (state === 'paused') resume();
      else if (screens.settings.classList.contains('show') || screens.howto.classList.contains('show')) goBack();
    } else if (e.code === 'KeyM') { Sound.toggleMute(); updateSoundIcons(); }
  });
  window.addEventListener('keyup', e => { if (e.code === 'Space') input.key = false; });
  window.addEventListener('blur', () => { input.down = input.btn = input.key = false; sb.classList.remove('down'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  ['contextmenu', 'gesturestart', 'dblclick'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
  ['pointerdown', 'touchend', 'click'].forEach(ev => document.addEventListener(ev, () => Sound.unlock(), { passive: true }));
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (b) b.blur(); });

  /* ======================================================================
     UI WIRING
     ====================================================================== */
  function goBack() {
    if (settingsFrom === 'pause' && state === 'paused') showScreen('pause');
    else if (state === 'paused') showScreen('pause');
    else showScreen('menu');
  }
  $('btnPlay').onclick = startGame;
  $('btnHow').onclick = () => showScreen('howto');
  $('btnSettingsMenu').onclick = () => { settingsFrom = 'menu'; showScreen('settings'); };
  document.querySelectorAll('[data-back]').forEach(b => b.onclick = goBack);
  $('btnPause').onclick = pause;
  $('btnSettingsHud').onclick = () => { if (state === 'playing') pause(); settingsFrom = 'pause'; showScreen('settings'); };
  $('btnResume').onclick = resume;
  $('btnRestartP').onclick = startGame;
  $('btnMenuP').onclick = () => { Sound.unsuspend(); toMenu(); };
  $('btnRestartG').onclick = startGame;
  $('btnMenuG').onclick = toMenu;
  ['btnSoundHud', 'btnSoundMenu'].forEach(id => $(id).onclick = () => { Sound.toggleMute(); updateSoundIcons(); });

  // settings
  const rg = { master: $('rgMaster'), buzz: $('rgBuzz'), fx: $('rgFx') };
  Object.keys(rg).forEach(k => {
    const r = rg[k]; r.value = Math.round(Sound.settings[k] * 100); r.style.setProperty('--v', r.value + '%');
    r.addEventListener('input', () => { r.style.setProperty('--v', r.value + '%'); Sound.set(k, r.value / 100); });
  });
  $('swMute').onclick = () => { Sound.toggleMute(); updateSoundIcons(); };
  setSwitch($('swShake'), opts.shake); setSwitch($('swVibe'), opts.vibe);
  $('swShake').onclick = () => { opts.shake = !opts.shake; store.set('mosquitoShooter.shake', opts.shake ? '1' : '0'); setSwitch($('swShake'), opts.shake); };
  $('swVibe').onclick = () => { opts.vibe = !opts.vibe; store.set('mosquitoShooter.vibe', opts.vibe ? '1' : '0'); setSwitch($('swVibe'), opts.vibe); if (opts.vibe && navigator.vibrate) navigator.vibrate(40); };
  let resetArm = 0;
  $('btnReset').onclick = function () {
    if (!resetArm) { this.textContent = 'TAP AGAIN TO CONFIRM'; resetArm = setTimeout(() => { resetArm = 0; this.textContent = 'RESET HIGH SCORE'; }, 3000); }
    else { clearTimeout(resetArm); resetArm = 0; best = 0; store.set('mosquitoShooter.best', '0'); el.menuBest.textContent = '0'; hudStats(); this.textContent = 'HIGH SCORE RESET ✓'; setTimeout(() => this.textContent = 'RESET HIGH SCORE', 1500); }
  };
  updateSoundIcons();

  /* ---------------- PWA install ---------------- */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; $('btnInstall').classList.remove('hidden'); });
  $('btnInstall').onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); try { await deferredPrompt.userChoice; } catch (e) {}
    deferredPrompt = null; $('btnInstall').classList.add('hidden');
  };
  window.addEventListener('appinstalled', () => $('btnInstall').classList.add('hidden'));
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  if (isIOS && !standalone) $('iosTip').classList.remove('hidden');
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}));
  }

  /* ---------------- boot ---------------- */
  el.menuBest.textContent = best; el.best.textContent = best;
  Sound.preload();
  resize();
  seedOrbiters(menuOrbit);
  const fontsReady = (document.fonts && document.fonts.load)
    ? Promise.race([Promise.all([document.fonts.load('20px Bangers'), document.fonts.load('700 16px Fredoka')]), new Promise(r => setTimeout(r, 2500))])
    : Promise.resolve();
  fontsReady.then(() => resize());
  requestAnimationFrame(frame);

  // small hook for automated testing / debugging
  window.__ms = { get state() { return state; }, S, P, WV, get mosq() { return mosq; }, spawn: spawnMosquito, bite: n => { S.hp = Math.max(1, S.hp - n); hudHP(); }, kill: () => gameOver(), resize };
})();
