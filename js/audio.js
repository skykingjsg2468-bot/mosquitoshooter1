/* ==========================================================================
   Mosquito Shooter — Sound manager
   Uses ONLY the four uploaded sound files:
     buzz  -> assets/sounds/mosquito-flying.mp3   (looping, volume follows mosquito count)
     swarm -> assets/sounds/mosquito-excess.mp3   (special chaos event, has a cooldown)
     bite  -> assets/sounds/mosquito-bite.mp3     (every successful bite)
     over  -> assets/sounds/game-over.mp3         (health reached zero)

   Engine: Web Audio API (works on iOS/Android, allows overlap + volume control).
   Fallback: plain HTMLAudio elements (e.g. when the page is opened via file://).
   Audio only starts after the first user gesture (Sound.unlock()).
   ========================================================================== */
const Sound = (() => {
  const FILES = {
    buzz:  'assets/sounds/mosquito-flying.mp3',
    swarm: 'assets/sounds/mosquito-excess.mp3',
    bite:  'assets/sounds/mosquito-bite.mp3',
    over:  'assets/sounds/game-over.mp3',
    scream:'assets/sounds/rekha-scream.mp3'
  };
  const KEY = 'mosquitoShooter.audio.v1';

  let ctx = null, master = null, busBuzz = null, busFx = null;
  let raw = {};            // ArrayBuffers fetched before unlock
  let buffers = {};        // decoded AudioBuffers
  let htmlEls = null;      // fallback elements
  let useHtml = false;
  let unlocked = false, suspended = false;
  let buzzSrc = null, buzzGain = null, buzzStopTimer = null, buzzLevel = 0;
  let active = { bite: [], swarm: [], over: [], scream: [] };
  let lastBite = 0;

  const settings = Object.assign({ master: 0.85, buzz: 0.7, fx: 1.0, muted: false }, load());

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) {} }

  /* ---- preload raw bytes early (no AudioContext needed, so no gesture needed) ---- */
  function preload() {
    Object.keys(FILES).forEach(k => {
      fetch(FILES[k]).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(b => { raw[k] = b; if (ctx) decode(k); })
        .catch(() => { /* will use HTMLAudio fallback */ });
    });
  }

  function decode(k) {
    if (!ctx || !raw[k] || buffers[k]) return Promise.resolve();
    const copy = raw[k].slice(0);
    return new Promise((res, rej) => {
      const p = ctx.decodeAudioData(copy, res, rej);
      if (p && p.catch) p.catch(rej);
    }).then(b => { buffers[k] = b; }).catch(() => {});
  }

  /* ---- must be called from inside a user gesture (tap / click / key) ---- */
  function unlock() {
    if (unlocked) { resume(); return; }
    unlocked = true;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      try {
        ctx = new AC();
        master = ctx.createGain();
        busBuzz = ctx.createGain();
        busFx = ctx.createGain();
        busBuzz.connect(master); busFx.connect(master); master.connect(ctx.destination);
        applyVolumes();
        ctx.resume && ctx.resume();
        // iOS: play a silent buffer inside the gesture to fully unlock
        const sb = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
        s.buffer = sb; s.connect(ctx.destination); s.start(0);
        // iOS: make sure sound is not muted by the ringer switch
        keepAliveElement();
        Object.keys(FILES).forEach(k => { if (raw[k]) decode(k); });
      } catch (e) { ctx = null; }
    }
    if (!ctx) { useHtml = true; initHtml(); }
    else {
      // If any file could not be fetched (file://), fall back for that file
      setTimeout(() => {
        const missing = Object.keys(FILES).filter(k => !buffers[k]);
        if (missing.length === Object.keys(FILES).length) { useHtml = true; initHtml(); }
      }, 2500);
    }
  }

  function keepAliveElement() {
    try {
      const a = document.createElement('audio');
      a.setAttribute('playsinline', ''); a.loop = true; a.volume = 0.0001;
      // 0.1s of silence (tiny WAV)
      a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      const p = a.play(); if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }

  function initHtml() {
    if (htmlEls) return;
    htmlEls = {};
    Object.keys(FILES).forEach(k => {
      const a = new Audio(FILES[k]); a.preload = 'auto';
      if (k === 'buzz') a.loop = true;
      htmlEls[k] = a;
    });
    applyVolumes();
  }

  function resume() {
    if (ctx && ctx.state !== 'running' && !suspended) {
      ctx.resume && ctx.resume();
      try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0); } catch (e) {}
    }
  }

  function applyVolumes() {
    const m = settings.muted ? 0 : settings.master;
    if (ctx) {
      master.gain.setTargetAtTime(m, ctx.currentTime, 0.02);
      busBuzz.gain.value = settings.buzz;
      busFx.gain.value = settings.fx;
    }
    if (htmlEls) {
      htmlEls.buzz.volume = clamp01(m * settings.buzz * buzzLevel);
      ['bite', 'swarm', 'over', 'scream'].forEach(k => htmlEls[k].volume = clamp01(m * settings.fx));
    }
  }
  const clamp01 = v => Math.max(0, Math.min(1, v));

  /* ---- one-shot effects ---- */
  function play(name) {
    if (!unlocked) return;
    if (name === 'bite') {
      const now = performance.now();
      if (now - lastBite < 140) return;           // avoid machine-gun stacking
      lastBite = now;
    }
    if (ctx && buffers[name]) {
      const src = ctx.createBufferSource();
      src.buffer = buffers[name];
      const g = ctx.createGain();
      g.gain.value = name === 'over' ? 1.0 : name === 'swarm' ? 0.95 : 0.9;
      src.connect(g); g.connect(busFx);
      // limit overlapping copies of the same sound
      const list = active[name], max = name === 'bite' ? 3 : 1;
      while (list.length >= max) { const o = list.shift(); try { o.stop(); } catch (e) {} }
      list.push(src);
      src.onended = () => { const i = list.indexOf(src); if (i >= 0) list.splice(i, 1); };
      src.start(0);
    } else if (htmlEls && htmlEls[name]) {
      const a = htmlEls[name];
      try { a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
    }
  }

  /* ---- looping mosquito buzz; level 0..1 (follows the number of mosquitoes) ---- */
  function setBuzz(level) {
    if (!unlocked) return;
    level = clamp01(level);
    buzzLevel = level;
    const m = settings.muted ? 0 : settings.master;
    if (ctx && buffers.buzz) {
      if (level > 0.001) {
        if (buzzStopTimer) { clearTimeout(buzzStopTimer); buzzStopTimer = null; }
        if (!buzzSrc) {
          buzzSrc = ctx.createBufferSource(); buzzSrc.buffer = buffers.buzz; buzzSrc.loop = true;
          buzzGain = ctx.createGain(); buzzGain.gain.value = 0;
          buzzSrc.connect(buzzGain); buzzGain.connect(busBuzz);
          buzzSrc.start(0, Math.random() * 2);
        }
        buzzGain.gain.setTargetAtTime(level, ctx.currentTime, 0.18);
      } else if (buzzSrc && !buzzStopTimer) {
        buzzGain.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
        const s = buzzSrc;
        buzzStopTimer = setTimeout(() => {
          try { s.stop(); } catch (e) {}
          if (buzzSrc === s) { buzzSrc = null; buzzGain = null; }
          buzzStopTimer = null;
        }, 600);
      }
    } else if (htmlEls) {
      const a = htmlEls.buzz;
      a.volume = clamp01(m * settings.buzz * level);
      if (level > 0.001 && a.paused) { const p = a.play(); if (p && p.catch) p.catch(() => {}); }
      else if (level <= 0.001 && !a.paused) a.pause();
    }
  }

  function stopBuzzNow() {
    if (buzzStopTimer) { clearTimeout(buzzStopTimer); buzzStopTimer = null; }
    if (buzzSrc) { try { buzzSrc.stop(); } catch (e) {} buzzSrc = null; buzzGain = null; }
    if (htmlEls) { htmlEls.buzz.pause(); }
    buzzLevel = 0;
  }

  /* stop everything (restart / menu / game over) */
  function stopAll(except) {
    stopBuzzNow();
    ['bite', 'swarm', 'over', 'scream'].forEach(k => {
      if (k === except) return;
      active[k].forEach(s => { try { s.stop(); } catch (e) {} });
      active[k] = [];
      if (htmlEls) { htmlEls[k].pause(); try { htmlEls[k].currentTime = 0; } catch (e) {} }
    });
  }

  function suspend() {
    suspended = true;
    if (ctx && ctx.state === 'running') ctx.suspend();
    if (htmlEls) Object.values(htmlEls).forEach(a => a.pause());
  }
  function unsuspend() {
    suspended = false;
    if (ctx && ctx.state !== 'running') ctx.resume();
  }

  function set(kind, v) { settings[kind] = v; applyVolumes(); save(); }
  function setMuted(m) { settings.muted = !!m; applyVolumes(); save(); }
  function toggleMute() { setMuted(!settings.muted); return settings.muted; }

  return { preload, unlock, play, setBuzz, stopAll, suspend, unsuspend, set, setMuted, toggleMute,
           settings, get unlocked() { return unlocked; }, get ready() { return !!(Object.keys(buffers).length || htmlEls); } };
})();
