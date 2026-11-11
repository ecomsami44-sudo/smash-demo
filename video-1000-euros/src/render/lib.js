// Shared drawing library: math, easing, environment, characters, props.
const W = 1080, H = 1920;
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, v) => clamp((v - a) / (b - a));
const E = {
  inOut: t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => (t = clamp(t), 1 - Math.pow(1 - t, 3)),
  in: t => (t = clamp(t), t * t * t),
  back: t => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastic: t => { t = clamp(t); if (t === 0 || t === 1) return t; return Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (TAU / 3)) + 1; },
  sine: t => (1 - Math.cos(Math.PI * clamp(t))) / 2,
};
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function noise1(x, seed = 0) { // smooth value noise
  const h = n => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}
const OUT = '#1b1430';
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function fillStroke(ctx, fill, lw = 6, stroke = OUT) { if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); } }
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); }
function linGrad(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function radGrad(ctx, x, y, r0, r1, stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function mixColor(a, b, t) {
  const p = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(t))).toString(16).padStart(2, '0')).join('');
}
function desat(c, t) { const v = parseInt(c.slice(1, 3), 16) * .3 + parseInt(c.slice(3, 5), 16) * .59 + parseInt(c.slice(5, 7), 16) * .11; const g = '#' + Math.round(v * .8).toString(16).padStart(2, '0').repeat(3); return mixColor(c, g, t); }

// Camera: world point (x,y) is placed at screen center, zoom z, rotation r
function camera(ctx, x, y, z = 1, r = 0) { ctx.translate(W / 2, H / 2); ctx.rotate(r); ctx.scale(z, z); ctx.translate(-x, -y); }
function shake(t, amp, speed = 30, seed = 1) { return [noise1(t * speed, seed) * amp, noise1(t * speed, seed + 9) * amp]; }

// ---------- text ----------
function text(ctx, s, x, y, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || ''} ${o.size || 60}px ${o.font || 'Lucky'}`.trim();
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
  if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = 0; y = 0; }
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur || 20; }
  if (o.stroke) { ctx.lineWidth = o.lw || 10; ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = o.color || '#fff'; ctx.fillText(s, x, y);
  ctx.restore();
}

// ---------- environment ----------
function sky(ctx, c1, c2, c3) { ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [[0, c1], [.6, c2], [1, c3 || c2]]); ctx.fillRect(-2000, -2000, W + 4000, H + 4000); }

function buildings(seed, n, x0, x1, hMin, hMax) {
  const r = rng(seed); const out = []; let x = x0;
  while (x < x1) { const w = 110 + r() * 170; out.push({ x, w, h: hMin + r() * (hMax - hMin), roof: r(), win: r(), seed: Math.floor(r() * 1e6), tone: r() }); x += w + r() * 14; }
  return out;
}
const BCACHE = {};
function skyline(ctx, o) {
  // o: seed, baseY, color, winOn, winColor, x0,x1,hMin,hMax, lit(0-1), offsetX, outline
  const key = [o.seed, o.x0, o.x1, o.hMin, o.hMax].join(',');
  const bs = BCACHE[key] || (BCACHE[key] = buildings(o.seed, 0, o.x0 ?? -600, o.x1 ?? W + 600, o.hMin ?? 300, o.hMax ?? 900));
  ctx.save(); ctx.translate(o.offsetX || 0, 0);
  for (const b of bs) {
    const top = o.baseY - b.h;
    const col = o.tones ? mixColor(o.color, o.tones, b.tone * .6) : o.color;
    ctx.beginPath(); ctx.rect(b.x, top, b.w, b.h + 2000);
    if (b.roof > .7) { ctx.moveTo(b.x + b.w * .3, top); ctx.rect(b.x + b.w * .35, top - 40, b.w * .3, 40); }
    if (b.roof < .15) { ctx.rect(b.x + b.w * .45, top - 90, 8, 90); }
    ctx.fillStyle = col; ctx.fill();
    if (o.outline) { ctx.lineWidth = o.outline; ctx.strokeStyle = OUT; ctx.stroke(); }
    if (o.winColor) {
      const r = rng(b.seed); const cols = Math.max(2, Math.floor(b.w / 42)); const gw = b.w / cols;
      for (let yy = top + 30; yy < o.baseY - 30; yy += 54) for (let i = 0; i < cols; i++) {
        const on = r() < (o.lit ?? .5);
        const fl = o.flicker ? (noise1(o.t * 2 + i * 3.1 + yy, b.seed % 97) > .6) : false;
        ctx.fillStyle = on !== fl ? o.winColor : (o.winOff || 'rgba(0,0,0,0.18)');
        ctx.fillRect(b.x + i * gw + gw * .22, yy, gw * .56, 30);
      }
    }
  }
  ctx.restore();
}
function ground(ctx, y, side = '#c9b8a6', road = '#4a4458', line = '#f4e9c8') {
  ctx.fillStyle = side; ctx.fillRect(-2000, y, W + 4000, 160);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let x = -2000; x < W + 2000; x += 140) ctx.fillRect(x, y, 4, 160);
  ctx.fillStyle = OUT; ctx.fillRect(-2000, y + 150, W + 4000, 14);
  ctx.fillStyle = road; ctx.fillRect(-2000, y + 164, W + 4000, 2000);
  ctx.fillStyle = line; for (let x = -2000; x < W + 2000; x += 220) ctx.fillRect(x, y + 330, 120, 14);
}
function lamp(ctx, x, y, h, on = 1, t = 0) {
  ctx.save();
  if (on > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = radGrad(ctx, x + 60, y - h + 30, 10, 520, [[0, `rgba(255,214,140,${.55 * on})`], [1, 'rgba(255,200,120,0)']]); ctx.beginPath(); ctx.moveTo(x + 40, y - h + 30); ctx.lineTo(x + 80, y - h + 30); ctx.lineTo(x + 320, y + 40); ctx.lineTo(x - 200, y + 40); ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  rr(ctx, x - 9, y - h, 18, h, 6); fillStroke(ctx, '#2e2a40', 5);
  ctx.beginPath(); ctx.moveTo(x, y - h + 10); ctx.quadraticCurveTo(x + 10, y - h - 40, x + 60, y - h + 10); ctx.lineWidth = 12; ctx.strokeStyle = '#2e2a40'; ctx.stroke();
  rr(ctx, x + 35, y - h + 10, 50, 26, 8); fillStroke(ctx, on > 0 ? '#ffe6a8' : '#777', 5);
  ctx.restore();
}
function rain(ctx, t, amt = 1, seed = 3, wind = .25) {
  const r = rng(seed); ctx.save(); ctx.strokeStyle = 'rgba(200,215,255,0.45)'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 260 * amt; i++) {
    const x0 = r() * (W + 600) - 300, sp = 1800 + r() * 900, ph = r();
    const y = ((t * sp + ph * H * 1.3) % (H * 1.3)) - 200; const x = x0 + y * wind;
    ctx.moveTo(x, y); ctx.lineTo(x + 18 * wind * 3, y + 60);
  }
  ctx.stroke(); ctx.restore();
}
function vignette(ctx, a = .55, col = '0,0,0') { ctx.fillStyle = radGrad(ctx, W / 2, H * .48, H * .25, H * .78, [[0, `rgba(${col},0)`], [1, `rgba(${col},${a})`]]); ctx.fillRect(0, 0, W, H); }
function lightBeam(ctx, x, y, w0, w1, len, color, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = linGrad(ctx, x, y, x, y + len, [[0, `rgba(${color},${a})`], [1, `rgba(${color},0)`]]);
  ctx.beginPath(); ctx.moveTo(x - w0 / 2, y); ctx.lineTo(x + w0 / 2, y); ctx.lineTo(x + w1 / 2, y + len); ctx.lineTo(x - w1 / 2, y + len); ctx.closePath(); ctx.fill(); ctx.restore();
}

// ---------- particles ----------
function coin(ctx, x, y, r, spin, col = '#ffc93c') {
  const sx = Math.abs(Math.cos(spin)) * .85 + .15;
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1);
  circle(ctx, 0, 0, r); fillStroke(ctx, col, r * .12);
  circle(ctx, 0, 0, r * .72); ctx.lineWidth = r * .07; ctx.strokeStyle = '#d99a14'; ctx.stroke();
  if (sx > .45) { ctx.fillStyle = '#b97a06'; ctx.font = `${r * 1.1}px Lucky`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('€', 0, r * .08); }
  ctx.restore();
}
function banknote(ctx, x, y, s, rot, flip, col = '#7bc96f') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * (Math.cos(flip) * .8 + .2), s);
  rr(ctx, -70, -36, 140, 72, 8); fillStroke(ctx, col, 4);
  rr(ctx, -58, -25, 116, 50, 6); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.stroke();
  circle(ctx, 0, 0, 18); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill();
  ctx.fillStyle = '#1e5a2a'; ctx.font = '30px Lucky'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('€', 0, 2);
  ctx.restore();
}
function rainCoins(ctx, t, o = {}) {
  const r = rng(o.seed || 11); const n = o.n || 40;
  for (let i = 0; i < n; i++) {
    const x = r() * (W + 200) - 100, sp = 500 + r() * 700, ph = r(), sz = 22 + r() * 30, k = r();
    const life = (t * sp / (H + 300) + ph) % 1; if (o.start !== undefined && t < o.start + ph * .8) continue;
    const y = life * (H + 300) - 150 + (o.dy || 0);
    if (k < (o.noteRatio ?? .4)) banknote(ctx, x + Math.sin(t * 2 + i) * 40, y, sz / 40, Math.sin(t * 3 + i) * .6, t * 4 + i);
    else coin(ctx, x, y, sz, t * 6 + i);
  }
}
function confetti(ctx, t, t0, x, y, o = {}) {
  const dt = t - t0; if (dt < 0 || dt > (o.life || 2.2)) return;
  const r = rng(o.seed || 5); const cols = o.cols || ['#ff5d73', '#ffd23f', '#3bceac', '#4d7cff', '#ffffff'];
  for (let i = 0; i < (o.n || 60); i++) {
    const a = r() * TAU, sp = (o.speed || 900) * (.3 + r() * .7);
    const px = x + Math.cos(a) * sp * dt, py = y + Math.sin(a) * sp * dt + 900 * dt * dt * (o.g ?? 1);
    ctx.save(); ctx.globalAlpha = clamp(1 - dt / (o.life || 2.2)) ; ctx.translate(px, py); ctx.rotate(dt * 8 + i); ctx.scale(1, Math.cos(dt * 10 + i));
    ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-9, -5, 18, 10); ctx.restore();
  }
}
function burst(ctx, x, y, r, n, col, a, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.fillStyle = col;
  ctx.beginPath(); for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + .5) / n * TAU; ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a1); ctx.closePath(); } ctx.fill(); ctx.restore();
}

// ---------- characters ----------
const SKIN = ['#f2c7a5', '#d9a07a', '#a8704f', '#7a4a32', '#ffdcc0'];
const LEO = { skin: '#f0c19e', shirt: '#2bb3a3', shirt2: '#1f8f83', pants: '#3b4a6b', shoes: '#f4f1ea', hair: '#4a2c1d', hairStyle: 'messy', hood: true };
const BAKER = { skin: '#f6cdb0', shirt: '#f1c27d', pants: '#5a4a6b', shoes: '#3b2e2e', hair: '#7a3b1f', hairStyle: 'bun', apron: '#ffffff', chef: true, female: true };
const BOSS = { skin: '#f0b994', shirt: '#6b3fa0', shirt2: '#4e2b7a', pants: '#3a2559', shoes: '#1b1430', hair: '#2b2b2b', hairStyle: 'bald', tophat: true, mustache: true, belly: 1.35, tie: '#ffc93c', chain: true };

function person(ctx, c, p = {}) {
  // p: x,y,s, mouth(0-1), expr, look[x,y], blink(0-1), armL, armR (radians, 0=down, + = forward/out), walk (phase), walkAmt, bob, flip, gray(0-1), hold(fn)
  const g = v => p.gray ? desat(v, p.gray) : v;
  const s = p.s || 1; const walk = p.walk || 0; const wa = p.walkAmt ?? (p.walk !== undefined ? 1 : 0);
  ctx.save(); ctx.translate(p.x || 0, p.y || 0);
  // shadow
  ellipse(ctx, 0, 0, 120 * s * (c.belly || 1), 22 * s); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill();
  ctx.scale(s * (p.flip ? -1 : 1), s);
  if (p.rot) ctx.rotate(p.rot);
  const bob = (p.bob || 0) + Math.abs(Math.sin(walk)) * -14 * wa;
  const bw = c.belly || 1;
  // legs
  const legSw = Math.sin(walk) * .45 * wa;
  const leg = (dx, ang) => {
    ctx.save(); ctx.translate(dx, -200 + bob); ctx.rotate(ang);
    rr(ctx, -24, -10, 48, 195, 20); fillStroke(ctx, g(c.pants), 6);
    ellipse(ctx, 14, 192, 42, 22); fillStroke(ctx, g(c.shoes), 6);
    ctx.restore();
  };
  leg(-36, legSw); leg(36, -legSw);
  // back arm
  const arm = (side, ang, front) => {
    ctx.save(); ctx.translate(side * 78 * bw, -365 + bob); ctx.rotate(-side * (ang || 0));
    rr(ctx, -21, -10, 42, 170, 20); fillStroke(ctx, g(c.shirt2 || c.shirt), 6);
    circle(ctx, 0, 168, 25); fillStroke(ctx, g(c.skin), 6);
    if (front && p.hold && side === (p.holdSide || 1)) { ctx.translate(0, 175); ctx.rotate(side * (ang || 0)); p.hold(ctx); }
    ctx.restore();
  };
  const aL = p.armL ?? Math.sin(walk) * .35 * wa + .08, aR = p.armR ?? -Math.sin(walk) * .35 * wa + .08;
  // torso
  ctx.save(); ctx.translate(0, bob);
  ctx.beginPath(); ctx.moveTo(-72 * bw, -385); ctx.quadraticCurveTo(-95 * bw * bw, -300, -84 * bw, -190); ctx.lineTo(84 * bw, -190); ctx.quadraticCurveTo(95 * bw * bw, -300, 72 * bw, -385); ctx.quadraticCurveTo(0, -410, -72 * bw, -385); ctx.closePath();
  fillStroke(ctx, g(c.shirt), 6);
  if (c.hood) { ctx.beginPath(); ctx.moveTo(-60, -385); ctx.quadraticCurveTo(0, -330, 60, -385); ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-18, -360); ctx.lineTo(-22, -300); ctx.moveTo(18, -360); ctx.lineTo(22, -300); ctx.lineWidth = 5; ctx.stroke(); rr(ctx, -50, -270, 100, 50, 18); fillStroke(ctx, g(c.shirt2), 5); }
  if (c.apron) { rr(ctx, -62, -350, 124, 165, 24); fillStroke(ctx, g(c.apron), 5); }
  if (c.tie) { ctx.beginPath(); ctx.moveTo(-14, -385); ctx.lineTo(14, -385); ctx.lineTo(20, -260); ctx.lineTo(0, -235); ctx.lineTo(-20, -260); ctx.closePath(); fillStroke(ctx, g(c.tie), 5); ctx.beginPath(); ctx.moveTo(-40, -392); ctx.lineTo(0, -330); ctx.lineTo(40, -392); ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.stroke(); }
  if (c.chain) { ctx.beginPath(); ctx.moveTo(-60 * bw, -260); ctx.quadraticCurveTo(-20, -220, 20, -250); ctx.lineWidth = 6; ctx.strokeStyle = '#ffc93c'; ctx.stroke(); }
  ctx.restore();
  arm(-1, aL, false);
  // head
  const hy = -478 + bob + (p.headY || 0);
  ctx.save(); ctx.translate(p.headX || 0, hy); ctx.rotate(p.tilt || 0);
  rr(ctx, -22, 50, 44, 50, 10); fillStroke(ctx, g(c.skin), 6);
  // hair back
  if (c.hairStyle === 'long' || c.hairStyle === 'bun') { ellipse(ctx, 0, 10, 108, 105); fillStroke(ctx, g(c.hair), 6); }
  circle(ctx, -98, 8, 20); fillStroke(ctx, g(c.skin), 6); circle(ctx, 98, 8, 20); fillStroke(ctx, g(c.skin), 6);
  ellipse(ctx, 0, 0, 100, 104); fillStroke(ctx, g(c.skin), 6);
  // cheeks
  ellipse(ctx, -58, 30, 18, 11); ctx.fillStyle = 'rgba(255,110,110,.28)'; ctx.fill(); ellipse(ctx, 58, 30, 18, 11); ctx.fill();
  face(ctx, c, p, g);
  hair(ctx, c, g, p);
  ctx.restore();
  arm(1, aR, true);
  if (p.hold && (p.holdSide || 1) === -1) { /* held on back arm already drawn under */ }
  ctx.restore();
}
function hair(ctx, c, g, p) {
  const col = g(c.hair);
  if (c.hairStyle === 'messy') {
    ctx.beginPath(); ctx.moveTo(-100, -5);
    const pts = [[-108, -60], [-80, -88], [-70, -118], [-30, -100], [-10, -135], [20, -104], [55, -128], [62, -92], [100, -95], [92, -55], [104, -20]];
    pts.forEach(([x, y], i) => ctx.quadraticCurveTo(x, y, (x + (pts[i + 1] || [100, -10])[0]) / 2, (y + (pts[i + 1] || [100, -10])[1]) / 2));
    ctx.quadraticCurveTo(60, -60, 10, -58); ctx.quadraticCurveTo(-50, -65, -100, -5); ctx.closePath(); fillStroke(ctx, col, 6);
  } else if (c.hairStyle === 'bun') {
    circle(ctx, 0, -112, 42); fillStroke(ctx, col, 6);
    ctx.beginPath(); ctx.moveTo(-100, 0); ctx.quadraticCurveTo(-100, -110, 0, -104); ctx.quadraticCurveTo(100, -110, 100, 0); ctx.quadraticCurveTo(50, -60, 0, -62); ctx.quadraticCurveTo(-50, -60, -100, 0); fillStroke(ctx, col, 6);
  } else if (c.hairStyle === 'long') {
    ctx.beginPath(); ctx.moveTo(-100, 10); ctx.quadraticCurveTo(-100, -110, 0, -106); ctx.quadraticCurveTo(100, -110, 100, 10); ctx.quadraticCurveTo(40, -50, -20, -55); ctx.quadraticCurveTo(-70, -40, -100, 10); fillStroke(ctx, col, 6);
  } else if (c.hairStyle === 'short') {
    ctx.beginPath(); ctx.moveTo(-98, -10); ctx.quadraticCurveTo(-95, -108, 0, -106); ctx.quadraticCurveTo(95, -108, 98, -10); ctx.quadraticCurveTo(70, -65, 0, -66); ctx.quadraticCurveTo(-70, -65, -98, -10); fillStroke(ctx, col, 6);
  } else if (c.hairStyle === 'cap') {
    ctx.beginPath(); ctx.moveTo(-100, -25); ctx.quadraticCurveTo(-95, -112, 0, -110); ctx.quadraticCurveTo(95, -112, 100, -25); ctx.closePath(); fillStroke(ctx, g(c.cap || '#e74c3c'), 6);
    ctx.beginPath(); ctx.ellipse(55, -28, 80, 18, 0, 0, TAU); fillStroke(ctx, g(c.cap || '#e74c3c'), 6);
  } else if (c.hairStyle === 'bald') {
    ctx.beginPath(); ctx.moveTo(-100, 10); ctx.quadraticCurveTo(-104, -30, -88, -40); ctx.lineTo(-84, 10); ctx.moveTo(100, 10); ctx.quadraticCurveTo(104, -30, 88, -40); ctx.lineTo(84, 10); fillStroke(ctx, col, 5);
  }
  if (c.chef) { rr(ctx, -70, -150, 140, 70, 20); fillStroke(ctx, '#fff', 6); circle(ctx, -45, -160, 38); fillStroke(ctx, '#fff', 6); circle(ctx, 45, -160, 38); fillStroke(ctx, '#fff', 6); circle(ctx, 0, -180, 44); fillStroke(ctx, '#fff', 6); rr(ctx, -72, -110, 144, 34, 8); fillStroke(ctx, '#fff', 6); }
  if (c.tophat) { rr(ctx, -75, -250, 150, 160, 10); fillStroke(ctx, '#1b1430', 6); rr(ctx, -75, -130, 150, 26, 4); fillStroke(ctx, '#ffc93c', 4); ellipse(ctx, 0, -92, 120, 20); fillStroke(ctx, '#1b1430', 6); }
  if (c.glasses) { ctx.lineWidth = 6; ctx.strokeStyle = OUT; circle(ctx, -36, -6, 26); ctx.stroke(); circle(ctx, 36, -6, 26); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(10, -6); ctx.stroke(); }
}
function face(ctx, c, p, g) {
  const ex = p.expr || 'neutral'; const look = p.look || [0, 0]; const mouth = clamp(p.mouth || 0);
  const blink = p.blink || 0; const big = ex === 'shock' ? 1.25 : 1;
  // brows
  const brow = { neutral: [0, 0], happy: [-6, 0], shock: [-26, 0], sad: [-4, .35], worried: [-10, .3], angry: [6, -.4], smirk: [-4, 0], think: [0, .1], smug: [-2, -.15] }[ex] || [0, 0];
  ctx.lineWidth = 9; ctx.strokeStyle = g(c.hair === '#2b2b2b' && c.hairStyle === 'bald' ? '#2b2b2b' : c.hair); ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const lift = ex === 'smirk' && sd === 1 ? -14 : 0;
    ctx.save(); ctx.translate(sd * 36, -48 + brow[0] + lift); ctx.rotate(sd * brow[1]);
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(0, -8, 18, 0); ctx.stroke(); ctx.restore();
  }
  // eyes
  for (const sd of [-1, 1]) {
    const ex0 = sd * 36, ey = -8;
    ctx.save(); ellipse(ctx, ex0, ey, 19 * big, 25 * big); fillStroke(ctx, '#fff', 5);
    ctx.clip();
    if (p.euroEyes) { ctx.fillStyle = '#2bb35a'; ctx.font = `${44 * big}px Lucky`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('€', ex0, ey + 3); }
    else { circle(ctx, ex0 + look[0] * 8, ey + look[1] * 8 + 2, 11 * (ex === 'shock' ? .8 : 1)); ctx.fillStyle = '#1b1430'; ctx.fill(); circle(ctx, ex0 + look[0] * 8 + 4, ey + look[1] * 8 - 3, 4); ctx.fillStyle = '#fff'; ctx.fill(); }
    // lids
    let lid = blink;
    if (ex === 'sad' || ex === 'smug') lid = Math.max(lid, .35);
    if (ex === 'angry') lid = Math.max(lid, .3);
    if (ex === 'think') lid = Math.max(lid, .2);
    if (lid > 0) { ctx.fillStyle = g(c.skin); ctx.fillRect(ex0 - 30, ey - 30, 60, 55 * lid); ctx.beginPath(); ctx.moveTo(ex0 - 22, ey - 30 + 55 * lid); ctx.lineTo(ex0 + 22, ey - 30 + 55 * lid); ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.stroke(); }
    ctx.restore();
    ellipse(ctx, ex0, ey, 19 * big, 25 * big); ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.stroke();
  }
  // nose
  ctx.beginPath(); ctx.moveTo(-4, 8); ctx.quadraticCurveTo(10, 26, -6, 30); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(80,40,30,.6)'; ctx.stroke();
  if (c.mustache) { ctx.beginPath(); ctx.moveTo(0, 40); ctx.quadraticCurveTo(-30, 30, -58, 50); ctx.quadraticCurveTo(-30, 52, 0, 46); ctx.quadraticCurveTo(30, 52, 58, 50); ctx.quadraticCurveTo(30, 30, 0, 40); fillStroke(ctx, '#2b2b2b', 4); }
  // mouth
  const my = 55;
  ctx.lineWidth = 6; ctx.strokeStyle = OUT;
  if (mouth > .06 || ex === 'shock') {
    const o = Math.max(mouth, ex === 'shock' ? .55 : 0);
    const w = ex === 'happy' || ex === 'smug' ? 34 : 24, h = 6 + o * 30;
    ctx.beginPath();
    if (ex === 'happy' || ex === 'smug') { ctx.moveTo(-w, my - 4); ctx.quadraticCurveTo(0, my + h * 2, w, my - 4); ctx.quadraticCurveTo(0, my + 6, -w, my - 4); }
    else ctx.ellipse(0, my + h * .4, w * (ex === 'shock' ? .8 : 1), h * .75, 0, 0, TAU);
    ctx.fillStyle = '#5a1f2a'; ctx.fill(); ctx.stroke();
    ctx.save(); ctx.clip(); ellipse(ctx, 0, my + h, w * .7, h * .45); ctx.fillStyle = '#e36d7d'; ctx.fill(); ctx.restore();
  } else {
    ctx.beginPath();
    if (ex === 'happy') { ctx.moveTo(-30, my - 4); ctx.quadraticCurveTo(0, my + 26, 30, my - 4); }
    else if (ex === 'sad' || ex === 'worried') { ctx.moveTo(-24, my + 10); ctx.quadraticCurveTo(0, my - 8, 24, my + 10); }
    else if (ex === 'smirk' || ex === 'smug') { ctx.moveTo(-22, my + 4); ctx.quadraticCurveTo(10, my + 10, 30, my - 8); }
    else if (ex === 'angry') { ctx.moveTo(-22, my + 6); ctx.lineTo(22, my + 6); }
    else if (ex === 'think') { ctx.moveTo(-14, my + 4); ctx.quadraticCurveTo(4, my, 20, my + 6); }
    else { ctx.moveTo(-20, my + 2); ctx.quadraticCurveTo(0, my + 8, 20, my + 2); }
    ctx.stroke();
  }
}
// crowd character variants
function crowdChar(seed) {
  const r = rng(seed * 7919 + 13);
  const shirts = ['#ff6b6b', '#ffd23f', '#4d7cff', '#ff9f43', '#a55eea', '#26de81', '#fd79a8', '#00b8d4', '#e17055'];
  const styles = ['short', 'long', 'cap', 'bun', 'short', 'messy'];
  const hairs = ['#2b1d14', '#6b3e1f', '#e0b04a', '#1b1b1b', '#b5462e', '#8a8a8a'];
  const sh = shirts[Math.floor(r() * shirts.length)];
  return { skin: SKIN[Math.floor(r() * SKIN.length)], shirt: sh, shirt2: mixColor(sh, '#000000', .18), pants: ['#3b4a6b', '#2d3436', '#6c5ce7', '#5f4b3a'][Math.floor(r() * 4)], shoes: '#2d2d2d', hair: hairs[Math.floor(r() * hairs.length)], hairStyle: styles[Math.floor(r() * styles.length)], cap: shirts[Math.floor(r() * shirts.length)], glasses: r() < .2 };
}

// ---------- props ----------
function phone(ctx, x, y, s, rot, screen) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rr(ctx, -110, -200, 220, 400, 34); fillStroke(ctx, '#20202c', 8);
  rr(ctx, -96, -184, 192, 368, 24); ctx.fillStyle = '#0e0e18'; ctx.fill();
  ctx.save(); rr(ctx, -96, -184, 192, 368, 24); ctx.clip(); ctx.translate(-96, -184); if (screen) screen(ctx, 192, 368); ctx.restore();
  rr(ctx, -30, -178, 60, 14, 7); ctx.fillStyle = '#20202c'; ctx.fill();
  ctx.restore();
}
function shoppingBag(col, label) { return ctx => { ctx.save(); ctx.translate(0, 10); ctx.beginPath(); ctx.arc(0, 20, 26, Math.PI, 0); ctx.lineWidth = 7; ctx.strokeStyle = OUT; ctx.stroke(); rr(ctx, -50, 20, 100, 110, 8); fillStroke(ctx, col, 6); if (label) text(ctx, label, 0, 78, { size: 34, color: '#fff', stroke: OUT, lw: 6 }); ctx.restore(); }; }
function priceTag(ctx, x, y, s, rot, label, col = '#fff', tcol = '#1b1430') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-90, -50); ctx.lineTo(70, -50); ctx.lineTo(110, 0); ctx.lineTo(70, 50); ctx.lineTo(-90, 50); ctx.closePath(); fillStroke(ctx, col, 6);
  circle(ctx, 70, 0, 10); fillStroke(ctx, '#ddd', 4);
  text(ctx, label, -12, 4, { size: 54, color: tcol });
  ctx.restore();
}
function envelope(ctx, x, y, s, rot, open = 0, col = '#f5ecd7', seal = '#c0392b') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rr(ctx, -150, -95, 300, 190, 10); fillStroke(ctx, col, 6);
  ctx.beginPath(); ctx.moveTo(-150, 95); ctx.lineTo(0, 0); ctx.lineTo(150, 95); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-150, -95); ctx.lineTo(0, -95 + 120 * (1 - 2 * open)); ctx.lineTo(150, -95); ctx.closePath(); fillStroke(ctx, mixColor(col, '#000000', .08), 6);
  if (open < .3) { circle(ctx, 0, -95 + 115 * (1 - 2 * open), 24); fillStroke(ctx, seal, 4); }
  ctx.restore();
}
function sparkle(ctx, x, y, r, a, col = '#fff6c2') { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); ctx.restore(); }

module.exports = { W, H, TAU, clamp, lerp, inv, E, rng, noise1, OUT, rr, fillStroke, circle, ellipse, linGrad, radGrad, mixColor, desat, camera, shake, text, sky, skyline, ground, lamp, rain, vignette, lightBeam, coin, banknote, rainCoins, confetti, burst, person, crowdChar, LEO, BAKER, BOSS, phone, shoppingBag, priceTag, envelope, sparkle };
