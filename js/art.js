/* ==========================================================================
   Mosquito Shooter — all artwork is drawn procedurally on <canvas>
   (bedroom, sleeping hero, third-leg blaster, mosquitoes, flames, bullets)
   ========================================================================== */
const Art = (() => {
  const W = 480;
  let H = 854, BY = 639, FY = 569;
  let bg = null;

  /* Bite spots on the hero's skin, relative to bed origin (0, BY) */
  const SPOTS = [
    { x: 122, y: -38, name: 'face' },
    { x: 190, y: -24, name: 'arm' },
    { x: 238, y: -40, name: 'belly' },
    { x: 382, y: -24, name: 'foot' }
  ];
  const PIVOT = { x: 306, y: -50 };   // where the "third leg" comes out of the blanket
  const LEG_LEN = 70;

  function layout(h) { H = h; BY = Math.round(H - 215); FY = BY - 70; }
  const geo = () => ({ W, H, BY, FY });
  const spot = i => ({ x: SPOTS[i].x, y: BY + SPOTS[i].y });
  const pivot = () => ({ x: PIVOT.x, y: BY + PIVOT.y });

  /* ---------- helpers ---------- */
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function lin(g, x0, y0, x1, y1, stops) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(s => gr.addColorStop(s[0], s[1])); return gr;
  }
  function star4(g, x, y, r) {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, rad = i % 2 ? r * 0.35 : r;
      g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    g.closePath();
  }

  /* ======================================================================
     STATIC BACKGROUND (rendered once into an offscreen canvas)
     ====================================================================== */
  const WIN = { x: 170, y: 118, w: 140, h: 190 };

  function buildBackground(k) {
    const c = document.createElement('canvas');
    c.width = Math.round(W * k); c.height = Math.round(H * k);
    const g = c.getContext('2d'); g.scale(k, k);
    const R = rnd(42);

    /* wall */
    g.fillStyle = lin(g, 0, 0, 0, FY, [[0, '#0d0a2a'], [0.55, '#1d1650'], [1, '#2b1f63']]);
    g.fillRect(0, 0, W, FY);
    g.fillStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < W; x += 48) g.fillRect(x, 0, 24, FY);
    g.fillStyle = 'rgba(170,160,255,0.09)';
    for (let y = 40; y < FY - 40; y += 64) for (let x = 24 + ((y / 64) % 2) * 48; x < W; x += 96) { star4(g, x, y, 5); g.fill(); }
    // wainscot
    g.fillStyle = lin(g, 0, FY - 78, 0, FY, [[0, '#251a58'], [1, '#170f3b']]);
    g.fillRect(0, FY - 78, W, 78);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, FY - 80, W, 3);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, FY - 77, W, 3);
    for (let x = 18; x < W; x += 96) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; rr(g, x, FY - 66, 70, 50, 6); g.stroke(); }
    // baseboard
    g.fillStyle = '#120a2c'; g.fillRect(0, FY - 12, W, 12);
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, FY - 12, W, 2);

    /* floor */
    g.fillStyle = lin(g, 0, FY, 0, H, [[0, '#2c1a35'], [1, '#120a1c']]);
    g.fillRect(0, FY, W, H - FY);
    for (let y = FY + 16, i = 0; y < H; y += 26 + i * 2.2, i++) {
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y, W, 2);
      const off = (i % 2) * 70;
      for (let x = -off; x < W; x += 140 + R() * 40) { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x, y, 2, 26 + i * 2.2); }
    }
    g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 40; i++) g.fillRect(R() * W, FY + R() * (H - FY), 30 + R() * 50, 2);

    /* window */
    drawWindow(g);

    /* WANTED poster */
    g.save(); g.translate(78, 214); g.rotate(-0.05);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-42, -58, 94, 124);
    g.fillStyle = '#e6d3a3'; g.fillRect(-46, -62, 92, 124);
    g.fillStyle = 'rgba(120,80,30,.18)'; g.fillRect(-46, -62, 92, 124);
    g.strokeStyle = '#7a4d1a'; g.lineWidth = 2; g.strokeRect(-41, -57, 82, 114);
    g.fillStyle = '#7b1d1d'; g.textAlign = 'center';
    g.font = '26px Bangers, Impact, sans-serif'; g.fillText('WANTED', 0, -30);
    g.fillStyle = '#e2c88f'; g.fillRect(-28, -22, 56, 40); g.strokeStyle = '#7a4d1a'; g.strokeRect(-28, -22, 56, 40);
    drawMosquito(g, { x: 0, y: -2, r: 11, type: 'normal', face: 1, tilt: 0, phase: 0, hitFlash: 0, suck: 0 }, 0, true);
    g.fillStyle = '#4a2a0a'; g.font = '12px Bangers, Impact, sans-serif';
    g.fillText('DEAD OR ITCHY', 0, 33); g.fillText('REWARD: SLEEP', 0, 49);
    g.fillStyle = '#c0392b'; g.beginPath(); g.arc(0, -62, 4, 0, 7); g.fill();   // pin
    g.restore();

    /* shelf (right) */
    g.fillStyle = '#4a2f1e'; g.fillRect(338, 232, 132, 9);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(338, 241, 132, 5);
    const books = [['#e74c8b', 38], ['#43c6ff', 30], ['#ffd84a', 34], ['#8e5cff', 28], ['#4cd987', 36]];
    let bx = 346; books.forEach(b => { g.fillStyle = b[0]; g.fillRect(bx, 232 - b[1], 12, b[1]); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(bx + 2, 232 - b[1] + 4, 8, 2); bx += 13; });
    // plant
    g.fillStyle = '#b5532e'; g.beginPath(); g.moveTo(424, 232); g.lineTo(458, 232); g.lineTo(453, 208); g.lineTo(429, 208); g.fill();
    g.fillStyle = '#2fae5e'; [[-14, -30], [0, -40], [14, -28], [-6, -24], [8, -34]].forEach(p => { g.beginPath(); g.ellipse(441 + p[0], 208 + p[1] + 12, 6, 14, p[0] * 0.04, 0, 7); g.fill(); });
    // alarm clock
    g.fillStyle = '#2a2a3d'; rr(g, 346, 169, 62, 30, 6); g.fill();
    g.fillStyle = '#000'; rr(g, 351, 174, 52, 20, 3); g.fill();
    g.fillStyle = '#ff2b4a'; g.font = '17px Bangers, monospace'; g.textAlign = 'center'; g.fillText('3:17', 377, 190);
    g.fillStyle = '#2a2a3d'; g.fillRect(352, 199, 6, 5); g.fillRect(396, 199, 6, 5);

    /* rug */
    const rx = 240, ry = BY + 152;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(rx, ry + 5, 218, 44, 0, 0, 7); g.fill();
    g.fillStyle = '#4b1f6e'; g.beginPath(); g.ellipse(rx, ry, 212, 40, 0, 0, 7); g.fill();
    g.strokeStyle = '#ff4fa6'; g.lineWidth = 4; g.beginPath(); g.ellipse(rx, ry, 190, 33, 0, 0, 7); g.stroke();
    g.strokeStyle = '#3ad7ff'; g.lineWidth = 3; g.beginPath(); g.ellipse(rx, ry, 150, 25, 0, 0, 7); g.stroke();
    g.strokeStyle = '#ffd84a'; g.lineWidth = 2; g.beginPath(); g.ellipse(rx, ry, 100, 16, 0, 0, 7); g.stroke();

    /* floor props: slippers + spray can */
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(70, BY + 138, 34, 7, 0, 0, 7); g.fill();
    g.fillStyle = '#ff7ab8'; g.beginPath(); g.ellipse(58, BY + 128, 17, 8, -0.1, 0, 7); g.fill(); g.beginPath(); g.ellipse(86, BY + 130, 17, 8, 0.1, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(52, BY + 126, 7, 4, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(92, BY + 128, 7, 4, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(446, BY + 134, 16, 5, 0, 0, 7); g.fill();
    g.fillStyle = '#d9e2ff'; rr(g, 436, BY + 98, 20, 36, 5); g.fill();
    g.fillStyle = '#e8453c'; g.fillRect(436, BY + 108, 20, 12);
    g.fillStyle = '#9aa7d6'; g.fillRect(442, BY + 92, 8, 8); g.fillStyle = '#fff'; g.font = '8px Bangers'; g.textAlign = 'center'; g.fillText('BUG', 446, BY + 118);

    /* nightstand + lamp */
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(450, BY + 94, 36, 8, 0, 0, 7); g.fill();
    g.fillStyle = '#4e3020'; rr(g, 424, BY - 4, 54, 92, 4); g.fill();
    g.fillStyle = '#6a4630'; g.fillRect(420, BY - 10, 62, 9);
    g.fillStyle = '#5c3b27'; rr(g, 430, BY + 6, 42, 28, 3); g.fill(); rr(g, 430, BY + 40, 42, 34, 3); g.fill();
    g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(451, BY + 20, 3, 0, 7); g.fill(); g.beginPath(); g.arc(451, BY + 57, 3, 0, 7); g.fill();
    // lamp
    g.fillStyle = '#6b5ab5'; g.beginPath(); g.ellipse(451, BY - 11, 12, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#b9a9ff'; g.fillRect(449, BY - 52, 4, 42);
    g.fillStyle = lin(g, 425, 0, 477, 0, [[0, '#ffb347'], [0.5, '#ffe29a'], [1, '#ffb347']]);
    g.beginPath(); g.moveTo(430, BY - 48); g.lineTo(472, BY - 48); g.lineTo(480, BY - 82); g.lineTo(422, BY - 82); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(428, BY - 80, 6, 30);

    /* ---- BED ---- */
    g.save(); g.translate(0, BY);
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(222, 112, 218, 14, 0, 0, 7); g.fill();
    // legs
    g.fillStyle = '#3a2314'; g.fillRect(26, 70, 16, 44); g.fillRect(398, 70, 16, 44);
    // headboard (tall, left)
    g.fillStyle = lin(g, 22, 0, 64, 0, [[0, '#6d4630'], [1, '#4a2e1f']]);
    rr(g, 20, -112, 44, 210, 10); g.fill();
    g.fillStyle = 'rgba(0,0,0,.22)'; rr(g, 27, -98, 30, 70, 6); g.fill(); rr(g, 27, -20, 30, 90, 6); g.fill();
    g.fillStyle = '#8a5a3a'; g.beginPath(); g.arc(42, -112, 9, 0, 7); g.fill();
    // footboard (right, far side)
    g.fillStyle = '#4a2e1f'; rr(g, 392, -46, 24, 144, 8); g.fill();
    g.fillStyle = '#8a5a3a'; g.beginPath(); g.arc(404, -46, 7, 0, 7); g.fill();
    // frame
    g.fillStyle = lin(g, 0, 36, 0, 84, [[0, '#6d4630'], [1, '#3e2617']]);
    rr(g, 30, 34, 380, 54, 8); g.fill();
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(36, 38, 368, 3);
    // mattress
    g.fillStyle = lin(g, 0, -8, 0, 40, [[0, '#a9b6ff'], [1, '#6676d6']]);
    rr(g, 44, -8, 360, 46, 14); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(56, -6, 336, 3);
    g.restore();

    return c;
  }

  function drawWindow(g) {
    const { x, y, w, h } = WIN;
    // sky
    g.fillStyle = lin(g, 0, y, 0, y + h, [[0, '#040824'], [0.6, '#14235f'], [1, '#2c3f8f']]);
    g.fillRect(x, y, w, h);
    const R = rnd(7);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.6})`; g.fillRect(x + 4 + R() * (w - 8), y + 4 + R() * (h - 60), 1.4, 1.4); }
    // moon glow + moon
    const mx = x + 92, my = y + 56;
    const gl = g.createRadialGradient(mx, my, 6, mx, my, 62);
    gl.addColorStop(0, 'rgba(255,245,200,.55)'); gl.addColorStop(1, 'rgba(255,245,200,0)');
    g.fillStyle = gl; g.fillRect(x, y, w, h);
    g.fillStyle = '#fff6cf'; g.beginPath(); g.arc(mx, my, 24, 0, 7); g.fill();
    g.fillStyle = 'rgba(210,190,130,.55)';
    [[-8, -6, 6], [8, 4, 5], [-4, 11, 3.5], [10, -10, 3]].forEach(c => { g.beginPath(); g.arc(mx + c[0], my + c[1], c[2], 0, 7); g.fill(); });
    // skyline
    g.fillStyle = '#080d2b';
    let bx = x; const B = rnd(3);
    while (bx < x + w) { const bw = 12 + B() * 16, bh = 22 + B() * 42; g.fillRect(bx, y + h - bh, bw, bh); g.fillStyle = 'rgba(255,214,102,.8)';
      for (let wy = y + h - bh + 5; wy < y + h - 5; wy += 9) if (B() > 0.6) g.fillRect(bx + 3 + B() * (bw - 8), wy, 3, 3); g.fillStyle = '#080d2b'; bx += bw + 1; }
    // frame
    g.strokeStyle = '#4a2c1a'; g.lineWidth = 9; g.strokeRect(x - 2, y - 2, w + 4, h + 4);
    g.lineWidth = 5; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h * 0.45); g.lineTo(x + w, y + h * 0.45); g.stroke();
    g.fillStyle = '#6a4630'; g.fillRect(x - 12, y + h + 2, w + 24, 9);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - 12, y + h + 11, w + 24, 4);
    // curtain rod + curtains
    g.fillStyle = '#c9a24a'; g.fillRect(x - 36, y - 18, w + 72, 5);
    g.beginPath(); g.arc(x - 38, y - 15.5, 6, 0, 7); g.fill(); g.beginPath(); g.arc(x + w + 38, y - 15.5, 6, 0, 7); g.fill();
    curtain(g, x - 30, y - 13, 56, h + 30, 1);
    curtain(g, x + w + 30, y - 13, 56, h + 30, -1);
  }
  function curtain(g, x, y, w, h, dir) {
    const x0 = dir > 0 ? x : x - w;
    g.fillStyle = lin(g, x0, 0, x0 + w, 0, dir > 0 ? [[0, '#6c2a9e'], [0.5, '#8a3fc4'], [1, '#5a2288']] : [[0, '#5a2288'], [0.5, '#8a3fc4'], [1, '#6c2a9e']]);
    g.beginPath(); g.moveTo(x0, y);
    g.lineTo(x0 + w, y);
    g.bezierCurveTo(dir > 0 ? x0 + w * 0.6 : x0 + w * 1.0, y + h * 0.5, dir > 0 ? x0 + w * 0.7 : x0 + w * 0.3, y + h * 0.8, dir > 0 ? x0 + w * 0.5 : x0 + w * 0.5, y + h);
    g.lineTo(x0 + (dir > 0 ? 0 : 0), y + h); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2;
    for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x0 + (w / 5) * i, y); g.lineTo(x0 + (w / 5) * i + (dir > 0 ? -4 : 4), y + h); g.stroke(); }
    g.fillStyle = '#ffd84a'; g.beginPath(); g.ellipse(dir > 0 ? x0 + w * 0.5 : x0 + w * 0.5, y + h * 0.55, 5, 4, 0, 0, 7); g.fill();
  }

  /* ======================================================================
     DYNAMIC AMBIENT (twinkling stars, moonbeam, dust, lamp glow)
     ====================================================================== */
  function drawAmbient(g, T) {
    const { x, y, w, h } = WIN;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const R = rnd(99);
    for (let i = 0; i < 14; i++) {
      const sx = x + 6 + R() * (w - 12), sy = y + 6 + R() * (h * 0.6), ph = R() * 6;
      const a = 0.35 + 0.65 * Math.max(0, Math.sin(T * 2 + ph));
      g.fillStyle = `rgba(255,255,255,${a})`; star4(g, sx, sy, 2.4 * a + 0.6); g.fill();
    }
    // drifting cloud
    const cx = x + ((T * 6) % (w + 90)) - 45;
    g.fillStyle = 'rgba(120,140,220,.25)';
    [[0, 0, 22, 7], [14, -3, 16, 7], [-14, 2, 14, 5]].forEach(c => { g.beginPath(); g.ellipse(cx + c[0], y + 95 + c[1], c[2], c[3], 0, 0, 7); g.fill(); });
    g.restore();

    g.save(); g.globalCompositeOperation = 'lighter';
    // moonbeam
    const a = 0.085 + Math.sin(T * 0.8) * 0.012;
    const gr = g.createLinearGradient(0, y + h, 0, H);
    gr.addColorStop(0, `rgba(190,205,255,${a * 1.6})`); gr.addColorStop(1, 'rgba(190,205,255,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x, y + h + 4); g.lineTo(x + w, y + h + 4); g.lineTo(x + w + 90, H); g.lineTo(x - 90, H); g.closePath(); g.fill();
    // lamp glow
    const lf = 0.5 + Math.sin(T * 5.3) * 0.03 + Math.sin(T * 2.1) * 0.03;
    const lg = g.createRadialGradient(451, BY - 62, 4, 451, BY - 62, 150);
    lg.addColorStop(0, `rgba(255,190,90,${lf})`); lg.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = lg; g.fillRect(250, BY - 220, 230, 330);
    // dust motes
    for (let i = 0; i < 16; i++) {
      const px = x + 10 + ((i * 37 + Math.sin(T * 0.3 + i) * 18) % (w + 60)) + (i / 16) * 20;
      const py = y + h + 10 + ((i * 53 + T * (6 + (i % 4) * 2)) % (BY - y - h + 20));
      g.fillStyle = `rgba(220,230,255,${0.18 + 0.15 * Math.sin(T * 2 + i)})`;
      g.beginPath(); g.arc(px, py, 1.3 + (i % 3) * 0.4, 0, 7); g.fill();
    }
    g.restore();
  }

  /* ======================================================================
     HERO (sleeping man in bed + third-leg blaster)
     P = { hurt, shoot, dead, hpFrac, legAngle, recoil, flash }
     ====================================================================== */
  function drawPlayer(g, P, T) {
    g.save(); g.translate(0, BY);
    const shk = P.hurt > 0 ? Math.sin(T * 75) * 3.2 * Math.min(1, P.hurt * 2.2) : 0;
    const hop = P.hurt > 0 ? -Math.abs(Math.sin(T * 38)) * 3 : 0;
    g.translate(shk, hop);
    const br = P.dead ? 0 : (Math.sin(T * 1.7) * 0.5 + 0.5) * 3.2;

    /* pillow */
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(100, -8, 52, 14, 0, 0, 7); g.fill();
    g.fillStyle = lin(g, 0, -34, 0, 4, [[0, '#f4f0ff'], [1, '#c8c0ee']]);
    g.beginPath(); g.ellipse(98, -15, 50, 20, -0.03, 0, 7); g.fill();
    g.strokeStyle = 'rgba(120,100,200,.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(98, -15, 44, 15, -0.03, 0.3, 2.6); g.stroke();

    /* torso (pajama top) */
    const torso = new Path2D();
    torso.moveTo(134, -4); torso.bezierCurveTo(136, -30, 150, -37 - br * 0.3, 168, -35 - br * 0.5);
    torso.bezierCurveTo(190, -34 - br * 0.6, 206, -42 - br, 226, -47 - br);
    torso.bezierCurveTo(246, -53 - br * 1.2, 264, -42, 266, -4); torso.closePath();
    g.fillStyle = '#4b64e0'; g.fill(torso);
    g.save(); g.clip(torso);
    g.fillStyle = 'rgba(255,255,255,.22)'; for (let i = 0; i < 9; i++) g.fillRect(140 + i * 15, -60, 6, 70);
    // belly peeking out (pajama top rode up)
    g.fillStyle = '#f7cba2'; g.beginPath(); g.ellipse(240, -22 - br * 0.5, 27, 24, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(210,130,100,.35)'; g.beginPath(); g.ellipse(246, -18 - br * 0.5, 22, 18, 0, 0, 7); g.fill();
    g.restore();
    // navel + tiny hairs
    g.strokeStyle = '#c47d5a'; g.lineWidth = 1.8; g.lineCap = 'round';
    g.beginPath(); g.arc(238, -36 - br * 0.6, 2.6, 0.3, 3.0); g.stroke();
    g.lineWidth = 1.2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(222 + i * 8, -26 - br * 0.5); g.lineTo(224 + i * 8, -30 - br * 0.5); g.stroke(); }

    /* arm resting on chest */
    g.strokeStyle = '#4b64e0'; g.lineWidth = 16; g.lineCap = 'round';
    g.beginPath(); g.moveTo(150, -26); g.lineTo(174, -24); g.stroke();
    g.strokeStyle = '#f7cba2'; g.lineWidth = 12;
    g.beginPath(); g.moveTo(166, -24); g.lineTo(200, -20); g.stroke();
    g.beginPath(); g.arc(205, -19, 7.5, 0, 7); g.fillStyle = '#f7cba2'; g.fill();
    g.strokeStyle = '#d9996f'; g.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(208 + i * 1.5, -24 + i * 4); g.lineTo(214 + i * 1.5, -24 + i * 4.5); g.stroke(); }
    g.fillStyle = '#fff'; g.fillRect(163, -31, 6, 14);   // cuff

    /* head */
    drawHead(g, P, T, br);

    /* blanket */
    const bl = new Path2D();
    bl.moveTo(252, 30); bl.lineTo(254, -6);
    bl.bezierCurveTo(258, -34 - br * 0.6, 280, -42 - br * 0.8, 300, -43 - br);
    bl.bezierCurveTo(322, -50 - br, 338, -50 - br, 348, -38 - br * 0.6);
    bl.bezierCurveTo(358, -28, 362, -16, 364, -4);
    bl.lineTo(366, 30);
    for (let i = 0; i < 5; i++) { const x1 = 366 - (i + 1) * 22.8, x0 = 366 - i * 22.8; bl.quadraticCurveTo((x0 + x1) / 2, 42, x1, 30); }
    bl.closePath();
    g.fillStyle = lin(g, 0, -50, 0, 40, [[0, '#9b4dff'], [1, '#6a2fc4']]);
    g.fill(bl);
    g.save(); g.clip(bl);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(250, 8, 120, 6);
    g.fillStyle = 'rgba(255,216,74,.85)';
    [[272, -18], [300, -26], [330, -30], [350, -14], [286, 4], [318, 0], [342, 14], [268, 18], [300, 20]].forEach(s => { star4(g, s[0], s[1], 4.2); g.fill(); });
    g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.ellipse(310, 20, 60, 14, 0, 0, 7); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(262, -26); g.bezierCurveTo(272, -38, 290, -40 - br, 302, -40 - br); g.stroke();

    /* bare foot poking out */
    g.fillStyle = '#f7cba2'; g.save();
    g.beginPath(); g.ellipse(368, -17, 9, 7, 0, 0, 7); g.fill();
    g.translate(381, -25); g.rotate(-1.0);
    g.beginPath(); g.ellipse(0, 0, 17, 9, 0, 0, 7); g.fill();
    g.fillStyle = '#e9a97a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(14 + (i < 1 ? 0 : 0), -7 + i * 4.6, 3.4 - i * 0.2, 0, 7); g.fill(); }
    g.fillStyle = '#f7cba2'; g.beginPath(); g.arc(16, 8, 3.4, 0, 7); g.fill();
    g.restore();

    /* third leg (drawn after blanket, with collar on top) */
    drawLeg(g, P, T);
    g.fillStyle = '#8b45e8'; g.beginPath(); g.ellipse(PIVOT.x, PIVOT.y + 6, 17, 8, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.ellipse(PIVOT.x, PIVOT.y + 5, 17, 8, 0, 3.3, 6.1); g.stroke();
    g.fillStyle = '#5b24b0'; g.beginPath(); g.ellipse(PIVOT.x, PIVOT.y + 9, 14, 4, 0, 0, 3.14); g.fill();

    g.restore();
  }

  function drawHead(g, P, T, br) {
    const cx = 108, cy = -44;
    g.save(); g.translate(cx, cy);
    g.rotate(P.hurt > 0 ? Math.sin(T * 50) * 0.08 : (P.dead ? 0.25 : Math.sin(T * 1.2) * 0.02));
    // ear
    g.fillStyle = '#eeb98f'; g.beginPath(); g.ellipse(-25, 2, 5.5, 8, 0, 0, 7); g.fill();
    // head
    g.fillStyle = lin(g, 0, -28, 0, 28, [[0, '#ffd9b3'], [1, '#f2b98c']]);
    g.beginPath(); g.arc(0, 0, 27, 0, 7); g.fill();
    // hair
    g.fillStyle = '#3a2418';
    g.beginPath(); g.moveTo(-28, -2); g.bezierCurveTo(-34, -30, -10, -38, 6, -34);
    g.bezierCurveTo(22, -36, 32, -22, 28, -6);
    g.bezierCurveTo(22, -16, 12, -20, 0, -20); g.bezierCurveTo(-12, -20, -20, -14, -28, -2); g.fill();
    g.beginPath(); g.moveTo(-6, -36); g.lineTo(-12, -46); g.lineTo(0, -37); g.lineTo(6, -48); g.lineTo(10, -35); g.fill();   // cowlick
    // nightcap pom (funny)
    // cheeks
    g.fillStyle = 'rgba(255,110,130,.35)'; g.beginPath(); g.ellipse(-15, 9, 6, 4, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(15, 9, 6, 4, 0, 0, 7); g.fill();
    // nose
    g.fillStyle = '#e9a37b'; g.beginPath(); g.ellipse(1, 4, 4.5, 3.6, 0, 0, 7); g.fill();

    const mood = P.dead ? 'dead' : P.hurt > 0 ? 'hurt' : P.shoot > 0 ? 'shoot' : (P.hpFrac < 0.35 ? 'annoyed' : 'sleep');
    g.strokeStyle = '#2a1a12'; g.fillStyle = '#2a1a12'; g.lineCap = 'round'; g.lineWidth = 2.6;
    const ex = 10, ey = -4;
    if (mood === 'sleep') {
      // closed happy eyes
      g.beginPath(); g.arc(-ex, ey, 5.5, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      g.beginPath(); g.arc(ex, ey, 5.5, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      g.lineWidth = 2.2; g.beginPath(); g.moveTo(-17, -12); g.quadraticCurveTo(-10, -16, -4, -12); g.stroke();
      g.beginPath(); g.moveTo(17, -12); g.quadraticCurveTo(10, -16, 4, -12); g.stroke();
      // snoring mouth
      const o = 3 + br * 1.1;
      g.fillStyle = '#7a1f2b'; g.beginPath(); g.ellipse(2, 16, 5.5, o, 0, 0, 7); g.fill();
      g.fillStyle = '#ff7a8a'; g.beginPath(); g.ellipse(2, 16 + o * 0.45, 3.4, o * 0.45, 0, 0, 7); g.fill();
      // snot bubble
      const sb = 4 + br * 1.8; g.strokeStyle = 'rgba(170,230,255,.9)'; g.fillStyle = 'rgba(170,230,255,.25)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(9, 8 + sb * 0.3, sb, 0, 7); g.fill(); g.stroke();
    } else if (mood === 'shoot') {
      g.beginPath(); g.arc(-ex, ey + 1, 5, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke();
      g.beginPath(); g.arc(ex, ey + 1, 5, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke();
      g.lineWidth = 2.4; g.beginPath(); g.moveTo(-17, -9); g.lineTo(-5, -14); g.stroke(); g.beginPath(); g.moveTo(17, -15); g.lineTo(5, -11); g.stroke();
      g.fillStyle = '#7a1f2b'; g.beginPath(); g.moveTo(-8, 13); g.quadraticCurveTo(2, 25, 12, 12); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.fillRect(-5, 13, 14, 3);
    } else if (mood === 'hurt') {
      g.fillStyle = '#fff'; g.strokeStyle = '#2a1a12'; g.lineWidth = 2;
      g.beginPath(); g.arc(-ex, ey, 8, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(ex, ey, 8, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#2a1a12'; g.beginPath(); g.arc(-ex + Math.sin(T * 40) * 1.5, ey, 2.6, 0, 7); g.fill(); g.beginPath(); g.arc(ex + Math.sin(T * 40) * 1.5, ey, 2.6, 0, 7); g.fill();
      g.lineWidth = 3; g.beginPath(); g.moveTo(-21, -19); g.lineTo(-5, -12); g.stroke(); g.beginPath(); g.moveTo(21, -19); g.lineTo(5, -12); g.stroke();
      g.fillStyle = '#7a1f2b'; g.beginPath(); g.ellipse(2, 17, 8, 9, 0, 0, 7); g.fill();
      g.fillStyle = '#ff7a8a'; g.beginPath(); g.ellipse(2, 21, 5, 4, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(130,200,255,.95)'; const sw = (T * 30) % 14;
      g.beginPath(); g.ellipse(-27, -14 + sw * 0.4, 3, 4.5, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(27, -18 + sw * 0.5, 3, 4.5, 0, 0, 7); g.fill();
    } else if (mood === 'annoyed') {
      g.fillStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.arc(-ex, ey, 6.5, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(ex, ey, 6.5, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#2a1a12'; g.beginPath(); g.arc(-ex, ey + 1, 2.4, 0, 7); g.fill(); g.beginPath(); g.arc(ex, ey + 1, 2.4, 0, 7); g.fill();
      g.fillStyle = '#ffd9b3'; g.fillRect(-18, ey - 8, 16, 8); g.fillRect(2, ey - 8, 16, 8);      // heavy lids
      g.lineWidth = 2.6; g.beginPath(); g.moveTo(-18, ey); g.lineTo(-3, ey); g.stroke(); g.beginPath(); g.moveTo(3, ey); g.lineTo(18, ey); g.stroke();
      g.beginPath(); g.moveTo(-20, -14); g.lineTo(-5, -9); g.stroke(); g.beginPath(); g.moveTo(20, -14); g.lineTo(5, -9); g.stroke();
      g.beginPath(); g.moveTo(-7, 18); g.quadraticCurveTo(-2, 13, 2, 18); g.quadraticCurveTo(6, 23, 11, 17); g.stroke();
      g.strokeStyle = 'rgba(120,80,120,.5)'; g.lineWidth = 1.5; g.beginPath(); g.arc(-ex, ey + 9, 6, 0.2, 2.9); g.stroke(); g.beginPath(); g.arc(ex, ey + 9, 6, 0.2, 2.9); g.stroke();
    } else { // dead
      g.lineWidth = 2.8;
      [-ex, ex].forEach(x => { g.beginPath(); g.moveTo(x - 5, ey - 5); g.lineTo(x + 5, ey + 5); g.moveTo(x + 5, ey - 5); g.lineTo(x - 5, ey + 5); g.stroke(); });
      g.fillStyle = '#7a1f2b'; g.beginPath(); g.ellipse(2, 17, 6, 6, 0, 0, 7); g.fill();
      g.fillStyle = '#ff7a8a'; g.beginPath(); g.ellipse(4, 25, 4.5, 8, 0.2, 0, 7); g.fill();
    }
    g.restore();
  }

  function drawLeg(g, P, T) {
    g.save(); g.translate(PIVOT.x, PIVOT.y);
    const a = P.legAngle;
    g.rotate(a);
    if (Math.cos(a) < 0) g.scale(1, -1);
    const idle = P.dead ? 0 : Math.sin(T * 3.1) * 0.8;
    const L = LEG_LEN - P.recoil * 16;
    g.translate(0, idle * 0.3);
    // leg capsule
    const w0 = 13, w1 = 9.5;
    const leg = new Path2D();
    leg.moveTo(0, -w0); leg.lineTo(L, -w1); leg.arc(L, 0, w1, -Math.PI / 2, Math.PI / 2); leg.lineTo(0, w0); leg.closePath();
    g.fillStyle = '#f0b98d'; g.fill(leg);
    g.save(); g.clip(leg);
    // shading
    g.fillStyle = 'rgba(180,100,70,.35)'; g.fillRect(0, 2, L + 10, 12);
    // leg hair
    g.strokeStyle = '#6b3d22'; g.lineWidth = 1.3; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const x = 6 + i * 4.4; g.beginPath(); g.moveTo(x, -6.5 + i * 0.25); g.lineTo(x + 2, -9.5 + i * 0.25); g.stroke(); }
    // striped sock (from 40% to the end)
    const sx = L * 0.42;
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ff3d7a'; g.fillRect(sx + i * ((L - sx) / 7 + 1), -12, (L - sx) / 7 + 1.2, 24); }
    g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(sx, 3, L, 10);
    g.restore();
    g.strokeStyle = '#6b3d22'; g.lineWidth = 2; g.stroke(leg);
    // sock cuff
    g.fillStyle = '#fff'; rr(g, sx - 3, -w0 + 1.5, 7, w0 * 2 - 3, 3); g.fill();
    g.strokeStyle = '#6b3d22'; g.lineWidth = 1.2; g.stroke();
    // chunky sneaker (the "muzzle")
    g.fillStyle = '#ff3d7a'; g.beginPath(); g.ellipse(L + 5, 0, 12, 12.5, 0, 0, 7); g.fill();
    g.strokeStyle = '#6b3d22'; g.lineWidth = 1.8; g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(L + 5, 0, 12.5, -1.35, 1.35); g.lineTo(L + 5, 0); g.fill();   // rubber toe ring
    g.fillStyle = '#ff3d7a'; g.beginPath(); g.ellipse(L + 3, 0, 9, 10, 0, 0, 7); g.fill();
    g.fillStyle = '#2a1a12'; g.beginPath(); g.arc(L + 8, 0, 3.4, 0, 7); g.fill();                            // barrel hole
    g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(L - 4, i * 5, 1.4, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(L + 2, -6.5, 4, 2, 0.3, 0, 7); g.fill();
    // muzzle flash
    if (P.flash > 0) {
      const f = Math.min(1, P.flash / 0.09);
      g.save(); g.translate(L + 16, 0); g.rotate(T * 20);
      g.fillStyle = `rgba(255,250,160,${f})`; star4(g, 0, 0, 16 * f + 4); g.fill();
      g.fillStyle = `rgba(255,255,255,${f})`; star4(g, 0, 0, 8 * f + 2); g.fill();
      g.restore();
    }
    g.restore();
  }

  function legTip(P) {
    const p = pivot(), L = LEG_LEN - P.recoil * 16 + 20;
    return { x: p.x + Math.cos(P.legAngle) * L, y: p.y + Math.sin(P.legAngle) * L };
  }

  /* ======================================================================
     MOSQUITOES
     ====================================================================== */
  const PAL = {
    normal:  { body: '#40364f', stripe: '#d9d0ea', eye: '#ff3b3b', wing: 'rgba(210,235,255,.55)' },
    fast:    { body: '#6a24d6', stripe: '#d7b8ff', eye: '#ffe14a', wing: 'rgba(230,210,255,.55)' },
    fat:     { body: '#3f8a3a', stripe: '#c5f2a0', eye: '#ff5a3b', wing: 'rgba(210,255,220,.5)' },
    armored: { body: '#7d8c9d', stripe: '#d6dfe8', eye: '#ff3b3b', wing: 'rgba(210,235,255,.5)' },
    golden:  { body: '#e8a40c', stripe: '#fff2a8', eye: '#ffffff', wing: 'rgba(255,245,180,.7)' },
    queen:   { body: '#7a1038', stripe: '#ff9ac2', eye: '#ffe14a', wing: 'rgba(255,200,230,.55)' }
  };

  function drawMosquito(g, m, T, flat) {
    const pal = PAL[m.type] || PAL.normal;
    const s = m.r / 16;
    g.save();
    g.translate(m.x, m.y + (flat ? 0 : Math.sin(T * 9 + m.phase) * 1.6 * s));
    g.rotate(m.tilt || 0);
    g.scale(m.face * s, s);
    const flap = flat ? 0.7 : Math.sin(T * 62 + m.phase);
    const body = m.hitFlash > 0 ? '#ffffff' : pal.body;

    if (m.type === 'golden' && !flat) {          // halo
      const gr = g.createRadialGradient(0, 0, 4, 0, 0, 34);
      gr.addColorStop(0, 'rgba(255,230,120,.65)'); gr.addColorStop(1, 'rgba(255,230,120,0)');
      g.fillStyle = gr; g.fillRect(-40, -40, 80, 80);
    }
    if (m.type === 'fast' && !flat) {            // speed lines
      g.strokeStyle = 'rgba(200,170,255,.6)'; g.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-18 - i * 4, -5 + i * 5); g.lineTo(-34 - i * 6, -5 + i * 5); g.stroke(); }
    }
    const wingScale = m.type === 'queen' ? 1.4 : 1;
    // back wing
    wing(g, -3, -6, -0.9 + flap * 0.35, 0.6 + Math.abs(flap) * 0.4, pal.wing, wingScale, 0.7);
    // legs
    g.strokeStyle = m.hitFlash > 0 ? '#ddd' : '#2a2233'; g.lineWidth = 1.3; g.lineCap = 'round';
    const sw = flat ? 0 : Math.sin(T * 7 + m.phase) * 2;
    for (let i = 0; i < 3; i++) {
      const lx = -4 + i * 4;
      g.beginPath(); g.moveTo(lx, 5); g.lineTo(lx - 4 + sw * (i - 1) * 0.5, 13); g.lineTo(lx - 2 + sw, 20); g.stroke();
    }
    // abdomen
    const ab = 1 + (m.suck || 0) * 0.75;
    g.save(); g.translate(-13, 3); g.rotate(0.25);
    const abRx = (m.type === 'fat' ? 17 : m.type === 'queen' ? 16 : 13) * (m.type === 'fat' ? 1 : 1) * (0.9 + (ab - 1) * 0.5);
    const abRy = (m.type === 'fat' ? 11 : 6.8) * ab;
    g.fillStyle = (m.suck || 0) > 0.05 ? mix(body, '#d81e3a', Math.min(1, m.suck)) : body;
    g.beginPath(); g.ellipse(0, 0, abRx, abRy, 0, 0, 7); g.fill();
    g.fillStyle = (m.suck || 0) > 0.05 ? 'rgba(255,255,255,.35)' : pal.stripe; g.globalAlpha = m.hitFlash > 0 ? 0 : 0.9;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.ellipse(i * abRx * 0.42, 0, 1.8, abRy * 0.92, 0, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    if (m.type === 'armored') {                    // plates + rivets
      g.strokeStyle = '#4b5663'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, 0, abRx, abRy, 0, 0, 7); g.stroke();
      g.fillStyle = '#e8eef5'; [-7, 0, 7].forEach(x => { g.beginPath(); g.arc(x, -abRy * 0.5, 1.2, 0, 7); g.fill(); });
    }
    g.restore();
    // thorax
    g.fillStyle = body; g.beginPath(); g.arc(0, 0, 8.2, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.ellipse(-1, -3, 4.5, 2.5, 0, 0, 7); g.fill();
    // proboscis
    g.strokeStyle = '#1c1624'; g.lineWidth = 1.9; g.beginPath(); g.moveTo(16, 1); g.lineTo(31, 4); g.stroke();
    g.fillStyle = '#ff6a6a'; g.beginPath(); g.arc(31.5, 4.1, 1.4, 0, 7); g.fill();
    // antennae
    g.strokeStyle = '#1c1624'; g.lineWidth = 1; g.beginPath(); g.moveTo(12, -6); g.quadraticCurveTo(15, -13, 21, -13); g.moveTo(10, -6); g.quadraticCurveTo(10, -14, 15, -16); g.stroke();
    // head
    g.fillStyle = body; g.beginPath(); g.arc(11, -1, 6.8, 0, 7); g.fill();
    // eye
    g.fillStyle = '#fff'; g.beginPath(); g.arc(13.5, -2.5, 4.4, 0, 7); g.fill();
    g.fillStyle = pal.eye; g.beginPath(); g.arc(14.6, -2.2, 2.5, 0, 7); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(15.2, -2.2, 1.2, 0, 7); g.fill();
    g.strokeStyle = '#111'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(9.5, -8.6); g.lineTo(17.5, -4.8); g.stroke();   // angry brow
    // type extras
    if (m.type === 'armored') {
      g.fillStyle = '#aab6c4'; g.beginPath(); g.arc(11, -2, 8, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fill();
      g.strokeStyle = '#4b5663'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#e8eef5'; g.fillRect(10, -11, 2.2, 7);
    }
    if (m.type === 'queen') {
      g.fillStyle = '#ffd84a'; g.beginPath(); g.moveTo(5, -8); g.lineTo(6, -17); g.lineTo(9, -12); g.lineTo(12, -19); g.lineTo(15, -12); g.lineTo(18, -17); g.lineTo(19, -8); g.closePath(); g.fill();
      g.strokeStyle = '#a77a0d'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#ff3b6b'; g.beginPath(); g.arc(12, -12, 1.5, 0, 7); g.fill();
    }
    if (m.type === 'fat') {      // little bored mouth sweat
      g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); g.moveTo(9, 3); g.lineTo(13, 3.5); g.stroke();
    }
    // front wing
    wing(g, -1, -7, -0.35 - flap * 0.45, 0.55 + Math.abs(flap) * 0.45, pal.wing, wingScale, 1);
    g.restore();

    // hp bar
    if (!flat && m.maxhp > 1 && m.hp > 0 && m.state !== 'orbit') {
      const bw = Math.max(26, m.r * 1.8), bx = m.x - bw / 2, by = m.y - m.r - 16;
      g.fillStyle = 'rgba(0,0,0,.6)'; rr(g, bx - 1, by - 1, bw + 2, 6, 3); g.fill();
      g.fillStyle = m.hp / m.maxhp > 0.4 ? '#7dff6a' : '#ff5a4a'; rr(g, bx, by, Math.max(2, bw * m.hp / m.maxhp), 4, 2); g.fill();
    }
  }
  function wing(g, x, y, rot, sy, col, sc, a) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc * sy);
    g.fillStyle = col; g.globalAlpha = a; g.beginPath(); g.ellipse(0, -12, 6.5, 14, 0, 0, 7); g.fill();
    g.globalAlpha = a * 0.7; g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.9; g.stroke();
    g.beginPath(); g.moveTo(0, -2); g.lineTo(0, -24); g.stroke();
    g.restore();
  }
  function mix(a, b, t) {
    const pa = hex(a), pb = hex(b);
    return `rgb(${Math.round(pa[0] + (pb[0] - pa[0]) * t)},${Math.round(pa[1] + (pb[1] - pa[1]) * t)},${Math.round(pa[2] + (pb[2] - pa[2]) * t)})`;
  }
  function hex(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }

  /* ======================================================================
     FIRE (cartoon flames on a bite) + WELT (red bump left behind)
     ====================================================================== */
  function drawFire(g, f, T) {
    const t = f.life / f.max;                       // 1 -> 0
    const grow = Math.min(1, (1 - t) / 0.12);
    const fade = Math.min(1, t / 0.3);
    g.save(); g.translate(f.x, f.y); g.globalAlpha = fade;
    const gl = g.createRadialGradient(0, -8, 2, 0, -8, 40 * f.s);
    gl.addColorStop(0, 'rgba(255,170,50,.55)'); gl.addColorStop(1, 'rgba(255,100,20,0)');
    g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.fillRect(-45, -60, 90, 80); g.globalCompositeOperation = 'source-over';
    const cols = [['#ff3d14', 1], ['#ff9a1a', 0.72], ['#ffe45c', 0.46], ['#ffffff', 0.2]];
    for (let i = 0; i < 5; i++) {
      const ox = (i - 2) * 6.5 * f.s, ph = f.seed + i * 1.9;
      const hgt = (20 + (i === 2 ? 12 : i % 2 ? 0 : 5) + Math.sin(T * 15 + ph) * 6) * f.s * grow;
      const wd = (7.5 + Math.sin(T * 11 + ph) * 1.2) * f.s;
      const sway = Math.sin(T * 8 + ph) * 3.5 * f.s;
      cols.forEach(c => {
        const k = c[1];
        g.fillStyle = c[0]; g.beginPath(); g.moveTo(ox, 3);
        g.bezierCurveTo(ox + wd * k * 1.1, -hgt * 0.25 * k, ox + wd * 0.55 * k + sway, -hgt * 0.75 * k, ox + sway, -hgt * k);
        g.bezierCurveTo(ox - wd * 0.55 * k + sway, -hgt * 0.75 * k, ox - wd * k * 1.1, -hgt * 0.25 * k, ox, 3); g.fill();
      });
    }
    g.restore();
  }
  function drawWelt(g, w) {
    const t = Math.min(1, w.life / 1.5), grow = Math.min(1, (w.max - w.life) / 0.4 + 0.2);
    g.save(); g.globalAlpha = t; g.translate(w.x, w.y);
    g.fillStyle = 'rgba(214,60,70,.5)'; g.beginPath(); g.arc(0, 0, 9 * grow, 0, 7); g.fill();
    g.fillStyle = '#e8434f'; g.beginPath(); g.arc(0, 0, 5.6 * grow, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(-1.6, -1.8, 1.7, 0, 7); g.fill();
    g.fillStyle = '#7a1020'; g.beginPath(); g.arc(1, 1, 0.9, 0, 7); g.fill();
    g.restore();
  }

  /* ======================================================================
     BULLET (neon sock-star)
     ====================================================================== */
  function drawBullet(g, b, T) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const dx = b.vx / b.sp, dy = b.vy / b.sp;
    for (let i = 5; i >= 1; i--) {
      g.fillStyle = `rgba(120,255,160,${0.11 * (6 - i)})`;
      g.beginPath(); g.arc(b.x - dx * i * 7, b.y - dy * i * 7, b.r * (1 - i * 0.12) + 1, 0, 7); g.fill();
    }
    const gr = g.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.r * 2.8);
    gr.addColorStop(0, 'rgba(180,255,120,.9)'); gr.addColorStop(1, 'rgba(80,255,150,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, b.r * 2.8, 0, 7); g.fill();
    g.restore();
    g.save(); g.translate(b.x, b.y); g.rotate(T * 14);
    g.fillStyle = '#f4ffd0'; star4(g, 0, 0, b.r + 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, b.r * 0.5, 0, 7); g.fill();
    g.restore();
  }

  /* ======================================================================
     PARTICLES (dots, splats, rings, text, wings, Zzz, smoke)
     ====================================================================== */
  function drawParticle(g, p) {
    const t = p.life / p.max;
    g.save(); g.globalAlpha = Math.max(0, Math.min(1, t * (p.type === 'text' ? 2.2 : 1.4)));
    switch (p.type) {
      case 'dot': g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size * (0.4 + t * 0.6), 0, 7); g.fill(); break;
      case 'spark': g.globalCompositeOperation = 'lighter'; g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size * t + 0.5, 0, 7); g.fill(); break;
      case 'splat': {
        g.translate(p.x, p.y); g.fillStyle = p.color; const s = p.size * (1.5 - t * 0.5);
        g.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, r = s * (i % 2 ? 0.55 : 1); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(-s * 0.2, -s * 0.25, s * 0.2, 0, 7); g.fill(); break; }
      case 'ring': g.strokeStyle = p.color; g.lineWidth = 3 * t + 0.5; g.beginPath(); g.arc(p.x, p.y, p.size * (1 - t) + 4, 0, 7); g.stroke(); break;
      case 'wing': g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = 'rgba(220,240,255,.7)'; g.beginPath(); g.ellipse(0, 0, 4, 9, 0, 0, 7); g.fill(); break;
      case 'smoke': g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size * (1.6 - t * 0.8), 0, 7); g.fill(); break;
      case 'z': g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.color; g.strokeStyle = 'rgba(20,10,60,.7)'; g.lineWidth = 3; g.lineJoin = 'round';
        g.font = `${p.size}px Bangers, Impact, sans-serif`; g.textAlign = 'center'; g.strokeText(p.text, 0, 0); g.fillText(p.text, 0, 0); break;
      case 'text': {
        const pop = 1 + Math.max(0, (t - 0.8) / 0.2) * 0.6;
        g.translate(p.x, p.y); g.rotate(p.rot); g.scale(pop, pop);
        g.font = `${p.size}px Bangers, Impact, sans-serif`; g.textAlign = 'center'; g.lineJoin = 'round';
        g.lineWidth = Math.max(3, p.size * 0.2); g.strokeStyle = p.stroke || 'rgba(20,10,50,.95)'; g.strokeText(p.text, 0, 0);
        g.fillStyle = p.color; g.fillText(p.text, 0, 0); break; }
    }
    g.restore();
  }

  /* vignette (rendered once per resize) */
  function buildVignette(k) {
    const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
    const g = c.getContext('2d'); g.scale(k, k);
    const gr = g.createRadialGradient(W / 2, H * 0.55, H * 0.25, W / 2, H * 0.55, H * 0.75);
    gr.addColorStop(0, 'rgba(5,2,20,0)'); gr.addColorStop(1, 'rgba(5,2,20,.62)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    return c;
  }

  return { W, layout, geo, spot, pivot, SPOTS, buildBackground, buildVignette, drawAmbient, drawPlayer,
           drawMosquito, drawFire, drawWelt, drawBullet, drawParticle, legTip, LEG_LEN };
})();
