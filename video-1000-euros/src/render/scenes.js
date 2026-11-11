const L = require('./lib');
const { W, H, TAU, clamp, lerp, inv, E, rng, noise1, OUT, rr, fillStroke, circle, ellipse, linGrad, radGrad, mixColor, camera, shake, text, sky, skyline, ground, lamp, rain, vignette, lightBeam, coin, banknote, rainCoins, confetti, burst, person, crowdChar, LEO, BAKER, BOSS, phone, shoppingBag, priceTag, envelope, sparkle } = L;
const TL = require('../timeline.json');
const FPS = 30, TOTAL = 90.5;

// ---------- timeline helpers ----------
const SEG = {};
for (const s of TL.segments) {
  s.end = s.start + s.dur;
  const words = s.cap.replace(/(\d) (\d{3})/g, '$1\u00a0$2').replace(/ (€|\?|!|:|»)/g, '\u00a0$1').replace(/(«) /g, '$1\u00a0').split(/ +/).filter(Boolean);
  const wts = words.map(w => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1.5 + (/[.,?!…:]$/.test(w) ? 3.5 : 0));
  const sum = wts.reduce((a, b) => a + b, 0); let acc = 0;
  s.words = words.map((w, i) => { const t0 = s.start + acc / sum * s.dur * .97; acc += wts[i]; return { w, t0, t1: s.start + acc / sum * s.dur * .97 }; });
  SEG[s.id] = s;
}
const seg = id => SEG[id];
function wt(id, sub, nth = 0) { const s = SEG[id]; let k = 0; for (const w of s.words) if (w.w.toLowerCase().includes(sub.toLowerCase())) { if (k++ === nth) return w.t0; } throw new Error('word ' + sub + ' in ' + id); }
function amp(spk, t) {
  for (const s of TL.segments) if (s.spk === spk && t >= s.start && t < s.end) { const i = Math.floor((t - s.start) * FPS); const v = s.env[i] || 0; const v2 = s.env[i + 1] || 0; return clamp(lerp(v, v2, (t - s.start) * FPS - i) * 1.1); }
  return 0;
}
function blink(t, seed = 0) { const p = (t + seed * 1.37) % 3.3; return p < .14 ? Math.sin(p / .14 * Math.PI) : 0; }

// ---------- scene order ----------
const ORDER = ['hook', 'phone', 'spree', 'bakery', 'prices', 'profit', 'night', 'fine', 'letters', 'debt', 'last', 'reveal', 'end'];
const RANGES = ORDER.map((n, i) => {
  const first = TL.segments.find(s => s.scene === n);
  const start = i === 0 ? 0 : first.start - .2;
  return { n, start };
});
RANGES.forEach((r, i) => r.end = i < RANGES.length - 1 ? RANGES[i + 1].start : TOTAL);

// ---------- reusable bits ----------
function streetBg(ctx, t, o = {}) {
  const pan = o.pan || 0, gray = o.gray || 0;
  sky(ctx, o.sky1 || '#ffb36b', o.sky2 || '#ffd9a0', o.sky3 || '#fff1d6');
  if (o.sun !== false) { circle(ctx, 760 - pan * .05, 520, 150); ctx.fillStyle = o.sunCol || 'rgba(255,240,200,.9)'; ctx.fill(); }
  skyline(ctx, { seed: 21, baseY: o.baseY || 1180, color: o.far || '#e79a7c', tones: o.farT || '#d07d8a', offsetX: -pan * .25, hMin: 380, hMax: 860, x0: -900, x1: W + 3200, winColor: o.winFar || 'rgba(255,240,200,.55)', lit: .35 });
  skyline(ctx, { seed: 57, baseY: (o.baseY || 1180) + 40, color: o.mid || '#8f5b7a', tones: o.midT || '#6a4a7a', offsetX: -pan * .55, hMin: 260, hMax: 640, x0: -900, x1: W + 3600, winColor: o.winMid || '#ffd98a', lit: o.lit ?? .45, outline: 5, flicker: o.flicker, t });
  if (gray) { ctx.fillStyle = `rgba(90,96,110,${gray * .75})`; ctx.fillRect(-500, -500, W + 1000, H + 1000); }
}
function title(ctx, t, s, x, y, size, t0, o = {}) {
  const k = E.back(inv(t0, t0 + .35, t)); if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); if (o.rot) ctx.rotate(o.rot);
  text(ctx, s, 0, 0, { size, color: o.color || '#fff', stroke: o.stroke || OUT, lw: o.lw || size * .18, shadow: o.shadow, shadowBlur: 30 }); ctx.restore();
}
function calendar(ctx, x, y, s, day, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rr(ctx, -170, -190, 340, 380, 24); fillStroke(ctx, '#fff', 8);
  rr(ctx, -170, -190, 340, 110, [24, 24, 0, 0]); fillStroke(ctx, '#e74c3c', 8);
  text(ctx, 'JOUR', 0, -132, { size: 60, color: '#fff' });
  text(ctx, String(day), 0, 50, { size: 170, color: OUT });
  for (const dx of [-90, 90]) { rr(ctx, dx - 12, -220, 24, 60, 12); fillStroke(ctx, '#888', 6); }
  if (flip > 0 && flip < .5) { ctx.save(); ctx.transform(1, 0, 0, Math.cos(flip * Math.PI), 0, -80 * (1 - Math.cos(flip * Math.PI))); rr(ctx, -170, -80, 340, 270, 12); ctx.fillStyle = '#f2f2f2'; ctx.fill(); ctx.restore(); }
  ctx.restore();
}
function tv(ctx, s = 1, t = 0) { ctx.save(); ctx.scale(s, s); rr(ctx, -120, -85, 240, 160, 14); fillStroke(ctx, '#2d2d3a', 7); rr(ctx, -104, -70, 208, 130, 8); ctx.fillStyle = linGrad(ctx, 0, -70, 0, 60, [[0, '#6ec6ff'], [1, '#b388ff']]); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(-90, -60); ctx.lineTo(-30, -60); ctx.lineTo(-80, 40); ctx.closePath(); ctx.fill(); ctx.restore(); }
function scooter(ctx, x, y, s, col = '#ff4d6d', rider) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  for (const wx of [-120, 130]) { circle(ctx, wx, -40, 42); fillStroke(ctx, '#222', 8); circle(ctx, wx, -40, 16); fillStroke(ctx, '#bbb', 5); }
  ctx.beginPath(); ctx.moveTo(-170, -70); ctx.quadraticCurveTo(-160, -150, -60, -140); ctx.lineTo(60, -100); ctx.lineTo(110, -100); ctx.lineTo(150, -230); ctx.lineTo(175, -225); ctx.lineTo(150, -60); ctx.lineTo(-170, -60); ctx.closePath(); fillStroke(ctx, col, 7);
  rr(ctx, -150, -170, 140, 34, 16); fillStroke(ctx, '#2d2d3a', 6);
  rr(ctx, 130, -250, 80, 18, 9); fillStroke(ctx, '#2d2d3a', 6);
  if (rider) rider(ctx);
  ctx.restore();
}
function bottle(ctx, s, cork = true) { ctx.save(); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(-40, 120); ctx.lineTo(-40, -10); ctx.quadraticCurveTo(-40, -50, -16, -70); ctx.lineTo(-16, -120); ctx.lineTo(16, -120); ctx.lineTo(16, -70); ctx.quadraticCurveTo(40, -50, 40, -10); ctx.lineTo(40, 120); ctx.closePath(); fillStroke(ctx, '#1e6b3a', 6); rr(ctx, -20, -125, 40, 50, 6); fillStroke(ctx, '#ffc93c', 5); rr(ctx, -34, 10, 68, 60, 6); fillStroke(ctx, '#f5ecd7', 4); if (cork) { rr(ctx, -12, -150, 24, 30, 6); fillStroke(ctx, '#c49a6c', 5); } ctx.restore(); }
function shopFront(ctx, x, y, w, col, sign, items, t, o = {}) {
  const h = 760;
  ctx.save(); ctx.translate(x, y);
  rr(ctx, 0, -h, w, h, 0); fillStroke(ctx, col, 7);
  for (let yy = -h + 40; yy < -460; yy += 120) for (let xx = 50; xx < w - 80; xx += 160) { rr(ctx, xx, yy, 90, 80, 6); fillStroke(ctx, o.night ? '#ffd98a' : '#bfe3ff', 5); }
  rr(ctx, 30, -460, w - 60, 90, 14); fillStroke(ctx, '#2d2440', 6);
  text(ctx, sign, w / 2, -413, { size: 64, color: o.signCol || '#ffd23f', shadow: o.signCol || '#ffd23f', shadowBlur: 16 });
  // awning
  const n = 7; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(20 + i * (w - 40) / n, -370); ctx.lineTo(20 + (i + 1) * (w - 40) / n, -370); ctx.lineTo(20 + (i + 1) * (w - 40) / n, -310); ctx.arc(20 + (i + .5) * (w - 40) / n, -310, (w - 40) / n / 2, 0, Math.PI); ctx.closePath(); ctx.fillStyle = i % 2 ? '#fff' : (o.awning || '#e74c3c'); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.stroke(); }
  rr(ctx, 40, -270, w - 220, 250, 8); fillStroke(ctx, o.dark ? '#3a3550' : '#cfeaff', 6);
  ctx.save(); rr(ctx, 40, -270, w - 220, 250, 8); ctx.clip(); if (items) items(ctx, 40, -270, w - 220, 250); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(60, -270); ctx.lineTo(160, -270); ctx.lineTo(60, -40); ctx.closePath(); ctx.fill(); ctx.restore();
  rr(ctx, w - 160, -300, 120, 300, 6); fillStroke(ctx, mixColor(col, '#000000', .3), 6); circle(ctx, w - 60, -150, 8); ctx.fillStyle = '#ffd23f'; ctx.fill();
  if (o.closed) { ctx.save(); ctx.translate(w / 2 - 60, -150); ctx.rotate(-.12); rr(ctx, -150, -45, 300, 90, 10); fillStroke(ctx, '#c0392b', 6); text(ctx, 'FERMÉ', 0, 4, { size: 64, color: '#fff' }); ctx.restore(); }
  ctx.restore();
}
function flash(ctx, a, col = '255,255,255') { if (a > 0) { ctx.fillStyle = `rgba(${col},${clamp(a)})`; ctx.fillRect(0, 0, W, H); } }
function speedLines(ctx, a, cx = W / 2, cy = H / 2, seed = 4, t = 0) {
  if (a <= 0) return; const r = rng(seed + Math.floor(t * 12)); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff';
  for (let i = 0; i < 46; i++) { const ang = r() * TAU, r0 = 520 + r() * 260, wv = .012 + r() * .02; ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); ctx.lineTo(cx + Math.cos(ang - wv) * 1500, cy + Math.sin(ang - wv) * 1500); ctx.lineTo(cx + Math.cos(ang + wv) * 1500, cy + Math.sin(ang + wv) * 1500); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function bubble(ctx, x, y, s, label, col = '#2bd67b') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rr(ctx, -150, -55, 300, 110, 30); fillStroke(ctx, '#ffffff', 6);
  circle(ctx, -100, 0, 34); fillStroke(ctx, col, 5); text(ctx, '€', -100, 3, { size: 44, color: '#fff' });
  text(ctx, label, 30, 4, { size: 54, color: '#18a558' });
  ctx.beginPath(); ctx.moveTo(-20, 52); ctx.lineTo(0, 85); ctx.lineTo(20, 52); fillStroke(ctx, '#fff', 0);
  ctx.restore();
}
function lightRays(ctx, x, y, a, t, col = '255,220,140', n = 14) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.rotate(t * .1);
  for (let i = 0; i < n; i++) { ctx.rotate(TAU / n); ctx.fillStyle = linGrad(ctx, 0, 0, 1400, 0, [[0, `rgba(${col},${a})`], [1, `rgba(${col},0)`]]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1400, -70); ctx.lineTo(1400, 70); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function sweat(ctx, x, y, s, a) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(22, 5, 0, 18); ctx.quadraticCurveTo(-22, 5, 0, -30); fillStroke(ctx, '#8fd3ff', 4); ctx.restore(); }

// =====================================================================
const SC = {};

// ---- 1. HOOK ----
SC.hook = (ctx, t, lt) => {
  const s01 = seg('s01'), s02 = seg('s02');
  const tLui = wt('s02', 'LUI');
  if (t < s02.start - .05) {
    // shot A: golden morning city, notifications popping
    const z = lerp(1.0, 1.18, E.sine(lt / 2.6));
    ctx.save(); camera(ctx, W / 2, H / 2 + 60, z);
    streetBg(ctx, t, { baseY: 1500, lit: .6 });
    const r = rng(77);
    for (let i = 0; i < 9; i++) {
      const x = 120 + r() * 840, y = 650 + r() * 700, t0 = .15 + i * .2;
      const k = E.back(inv(t0, t0 + .3, t)); if (k > 0) bubble(ctx, x, y - (t - t0) * 30, k * .9, '+1 000 €');
    }
    ctx.restore();
    rainCoins(ctx, t, { seed: 3, n: 34, start: .4 });
    // counter title
    const v = Math.round(1000 * E.out(inv(.2, 2.2, t)));
    const pulse = 1 + Math.sin(t * 12) * .02;
    ctx.save(); ctx.translate(W / 2, 360); ctx.scale(pulse, pulse);
    text(ctx, (v >= 1000 ? '1 000' : String(v)) + ' €', 0, 0, { size: 210, color: '#ffd23f', stroke: OUT, lw: 26, shadow: 'rgba(255,200,60,.8)', shadowBlur: 50 });
    ctx.restore();
    text(ctx, 'POUR CHAQUE HABITANT', W / 2, 540, { size: 64, color: '#fff', stroke: OUT, lw: 12 });
    flash(ctx, 1 - inv(0, .25, t));
    return;
  }
  // shot B: street celebration, Léo alone
  const lb = t - s02.start;
  const frozen = t > tLui ? tLui : t;
  const fz = E.inOut(inv(tLui, tLui + .5, t));
  const zoom = lerp(1, 1.55, E.back(inv(tLui, tLui + .55, t)));
  ctx.save(); camera(ctx, W / 2, lerp(H / 2 + 80, 1020, fz), zoom);
  streetBg(ctx, frozen, { baseY: 1250, gray: fz * .7 });
  ground(ctx, 1450, mixColor('#d6c2ac', '#888888', fz), mixColor('#4a4458', '#3a3a3a', fz));
  const crowd = [[60, 1600, 1.0, 2], [250, 1540, .85, 5], [830, 1540, .85, 8], [1030, 1600, 1.0, 11], [130, 1760, 1.2, 14], [960, 1770, 1.2, 17]];
  crowd.forEach(([x, y, s, sd], i) => {
    if (i >= 4) return;
    const c = crowdChar(sd); const ft = frozen + i;
    person(ctx, c, { x, y, s: s * .85, expr: 'happy', mouth: .4 + .3 * Math.sin(ft * 9), armL: 2.6 + Math.sin(ft * 7) * .3, armR: 2.5 + Math.cos(ft * 6) * .3, bob: Math.sin(ft * 9) * 8, gray: fz * .85, hold: i % 2 ? ctx => phone(ctx, 0, -30, .35, 0, (c2, w, h) => { c2.fillStyle = '#18a558'; c2.fillRect(0, 0, w, h); text(c2, '+1000€', w / 2, h / 2, { size: 46, color: '#fff' }); }) : null });
  });
  if (fz > 0) { ctx.fillStyle = `rgba(20,20,40,${fz * .45})`; ctx.fillRect(-500, -500, W + 1000, H + 1000); lightBeam(ctx, W / 2, 300, 120, 700, 1500, '255,230,170', .35 * fz); }
  person(ctx, LEO, { x: W / 2, y: 1660, s: 1.05, expr: t > tLui ? 'sad' : 'neutral', look: [0, .8], armR: .7, blink: blink(t, 2), hold: ctx => phone(ctx, 0, -40, .35, -.1, (c2, w, h) => { c2.fillStyle = '#1d1d2b'; c2.fillRect(0, 0, w, h); text(c2, '0 €', w / 2, h / 2, { size: 60, color: '#ff5d5d' }); }) });
  crowd.slice(4).forEach(([x, y, s, sd], j) => { const i = j + 4; const c = crowdChar(sd); const ft = frozen + i; person(ctx, c, { x, y, s: s * .85, expr: 'happy', mouth: .4 + .3 * Math.sin(ft * 9), armL: 2.6 + Math.sin(ft * 7) * .3, armR: 2.4 + Math.cos(ft * 6) * .3, bob: Math.sin(ft * 9) * 8, gray: fz * .85 }); });
  confetti(ctx, frozen, s02.start, W / 2, 900, { n: 90, speed: 1100, seed: 8, life: 3 });
  ctx.restore();
  if (fz < 1) rainCoins(ctx, frozen, { seed: 4, n: 20 });
  flash(ctx, (1 - inv(tLui, tLui + .2, t)) * (t > tLui ? .7 : 0));
  flash(ctx, (1 - inv(s02.start, s02.start + .15, t)) * .6);
};

// ---- 2. PHONE close-up ----
SC.phone = (ctx, t, lt) => {
  const s03 = seg('s03');
  const shocked = t > s03.start;
  const [sx, sy] = shake(t, shocked ? 6 * (1 - inv(s03.start, s03.start + .6, t)) + 2 : 2, 3);
  ctx.save(); camera(ctx, W / 2 + sx, H / 2 + sy, lerp(1, 1.12, E.sine(lt / 3.6)));
  // bokeh background
  ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [[0, '#3b2a5c'], [1, '#ff9e6b']]); ctx.fillRect(-300, -300, W + 600, H + 600);
  const r = rng(5);
  for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H * .9, rad = 40 + r() * 110; const c = ['255,210,90', '255,120,140', '120,200,255', '120,255,170'][i % 4]; ctx.fillStyle = radGrad(ctx, x + Math.sin(t * .5 + i) * 20, y, 0, rad, [[0, `rgba(${c},.55)`], [.7, `rgba(${c},.25)`], [1, `rgba(${c},0)`]]); circle(ctx, x + Math.sin(t * .5 + i) * 20, y, rad); ctx.fill(); }
  // floating other people's notifications
  for (let i = 0; i < 5; i++) { const t0 = seg('s02b').start + i * .35; const k = E.back(inv(t0, t0 + .3, t)); if (k > 0) { ctx.save(); ctx.globalAlpha = .75; bubble(ctx, 140 + (i * 233) % 820, 420 + (i * 377) % 500 - (t - t0) * 40, k * .55, '+1 000 €'); ctx.restore(); } }
  // Léo close-up
  const m = amp('H', t);
  person(ctx, LEO, { x: 640, y: 2420, s: 2.35, expr: shocked ? (t > s03.end - .3 ? 'sad' : 'shock') : 'neutral', mouth: m, look: shocked ? [-.6, -.1] : [-.8, .3], blink: shocked ? 0 : blink(t), tilt: shocked ? -.05 : .03, armL: 0, armR: 0 });
  sweat(ctx, 860, 1060, 1.4, inv(s03.start + .3, s03.start + .5, t));
  // phone in hand
  const pull = inv(seg('s02b').start + .6, seg('s02b').start + 1.6, t);
  phone(ctx, 330, 900 + (shocked ? Math.sin(t * 40) * 4 : 0), 1.55, -.12, (c, w, h) => {
    c.fillStyle = '#f4f6fb'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2b59ff'; c.fillRect(0, 0, w, 70); text(c, 'MA BANQUE', w / 2, 44, { size: 22, font: 'Inter', weight: 800, color: '#fff' });
    text(c, 'Solde disponible', w / 2, 120, { size: 16, font: 'Inter', weight: 600, color: '#667' });
    const spin = pull < 1;
    if (spin && pull > 0) { c.save(); c.translate(w / 2, 175); c.rotate(t * 10); c.beginPath(); c.arc(0, 0, 16, 0, 4.5); c.lineWidth = 5; c.strokeStyle = '#2b59ff'; c.stroke(); c.restore(); }
    else text(c, '0,00 €', w / 2, 178, { size: 44, font: 'Inter', weight: 900, color: shocked ? '#e53935' : '#1b1430' });
    c.fillStyle = '#e3e6ef'; for (let i = 0; i < 3; i++) { rr(c, 14, 230 + i * 44, w - 28, 34, 8); c.fill(); }
    text(c, 'Aucune opération', w / 2, 247, { size: 14, font: 'Inter', weight: 600, color: '#99a' });
  });
  circle(ctx, 420, 1170, 52); fillStroke(ctx, LEO.skin, 7);
  ctx.restore();
  if (shocked) speedLines(ctx, .35 * (1 - inv(s03.start, s03.start + .5, t)), 640, 1000, 2, t);
  vignette(ctx, .5);
  flash(ctx, 1 - inv(lt0(t, 'phone'), lt0(t, 'phone') + .15, t), '255,255,255');
};
function lt0(t, n) { return RANGES.find(r => r.n === n).start; }

// ---- 3. SPREE ----
SC.spree = (ctx, t, lt) => {
  const s04 = seg('s04'), s04b = seg('s04b');
  const tTv = wt('s04', 'télés'), tSc = wt('s04', 'scooters'), tCh = wt('s04', 'champagne');
  if (t < s04b.start - .05) {
    const pan = lerp(0, 1500, E.inOut(inv(s04.start - .2, s04b.start, t)));
    ctx.save(); camera(ctx, W / 2 + pan, H / 2 + 120, 1.0);
    streetBg(ctx, t, { baseY: 1100, pan: 0 });
    ctx.restore();
    ctx.save(); camera(ctx, W / 2 + pan, H / 2 + 120, 1.0);
    const shops = [['TÉLÉS', '#4d7cff', (c, x, y, w, h) => { for (let i = 0; i < 3; i++) { c.save(); c.translate(x + 90 + i * 150, y + 140 + Math.sin(t * 3 + i) * 3); tv(c, .55); c.restore(); } }],
      ['SCOOTERS', '#ff6b6b', (c, x, y, w, h) => { scooter(c, x + w / 2, y + h - 10, .6, '#ffd23f'); }],
      ['CHAMPAGNE', '#a55eea', (c, x, y, w, h) => { for (let i = 0; i < 5; i++) { c.save(); c.translate(x + 60 + i * 85, y + 150); bottle(c, .6); c.restore(); } }],
      ['BIJOUX', '#26a69a', (c, x, y, w, h) => { for (let i = 0; i < 4; i++) { circle(c, x + 80 + i * 100, y + 130, 30); fillStroke(c, '#ffd23f', 5); } }]];
    shops.forEach(([nm, col, it], i) => shopFront(ctx, -80 + i * 720, 1430, 700, col, nm, it, t, { awning: ['#e74c3c', '#2bb3a3', '#ffd23f', '#ff6b6b'][i] }));
    ground(ctx, 1430);
    // crowd walking with bags
    for (let i = 0; i < 9; i++) {
      const c = crowdChar(30 + i); const dir = i % 3 === 0 ? -1 : 1; const sp = 140 + (i * 37) % 90;
      const x = ((i * 380 + dir * t * sp) % 3400 + 3400) % 3400 - 400; const y = 1610 + (i % 3) * 30;
      person(ctx, c, { x, y, s: .7, walk: t * 7 + i, flip: dir < 0, expr: 'happy', blink: blink(t, i), holdSide: 1, hold: shoppingBag(['#ff5d73', '#ffd23f', '#4d7cff', '#26de81'][i % 4], i % 2 ? '€' : '') });
    }
    // TV carrier
    if (t > tTv - .6) { const k = (t - tTv + .6); const x = pan - 200 + k * 520; const c = crowdChar(91); person(ctx, c, { x, y: 1760, s: .95, walk: k * 8, expr: 'happy', armL: 2.9, armR: 2.9, mouth: .3 }); ctx.save(); ctx.translate(x, 1760 - 640 * .95 + Math.abs(Math.sin(k * 8)) * -12); tv(ctx, 1.25); ctx.restore(); }
    // scooter zoom
    if (t > tSc - .5 && t < tSc + 1.6) { const k = (t - tSc + .5) / 1.6; const x = pan + lerp(1500, -900, E.inOut(k)); scooter(ctx, x, 1920, 1.3, '#ff4d6d', c2 => person(c2, crowdChar(5), { x: -40, y: -120, s: .75, expr: 'happy', armR: 1.4, armL: 1.4, mouth: .5 })); ctx.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 6; i++) ctx.fillRect(x + 260 + i * 40, 1700 + i * 30, 160, 8); }
    ctx.restore();
    // champagne pop (screen space foreground)
    if (t > tCh - .5) {
      const k = t - tCh; ctx.save(); ctx.translate(880, 1700); ctx.rotate(-.5); bottle(ctx, 2.0, k < 0); ctx.restore();
      if (k > 0) {
        const cx = 880 + Math.sin(-.5) * -300, cy = 1700 - 300; ctx.save();
        coin(ctx, cx - k * 900, cy - k * 1500 + k * k * 1400, 0, 0);
        rr(ctx, cx - 600 * k - 12, cy - 1200 * k + 900 * k * k, 24, 30, 6); fillStroke(ctx, '#c49a6c', 5);
        const r = rng(9); for (let i = 0; i < 70; i++) { const a = -2.2 + r() * .9, v = 600 + r() * 1300; const px = 820 + Math.cos(a) * v * k, py = 1400 + Math.sin(a) * v * k + 1200 * k * k; circle(ctx, px, py, 8 + r() * 16); ctx.fillStyle = `rgba(255,250,225,${clamp(1 - k / 1.4)})`; ctx.fill(); }
        ctx.restore(); title(ctx, t, 'POP !', 640, 1000, 150, tCh, { color: '#ffd23f', rot: -.15 });
      }
    }
    vignette(ctx, .35);
    flash(ctx, (1 - inv(lt0(t, 'spree'), lt0(t, 'spree') + .15, t)) * .8);
    return;
  }
  // shot: shopkeeper with euro eyes
  const lb = t - s04b.start;
  const [sx, sy] = shake(t, lb < .3 ? 10 : 2);
  ctx.save(); camera(ctx, W / 2 + sx, H / 2 + sy, lerp(1.25, 1.05, E.out(lb / .6)));
  ctx.fillStyle = radGrad(ctx, W / 2, 800, 50, 1300, [[0, '#ffe08a'], [1, '#e0884a']]); ctx.fillRect(-300, -300, W + 600, H + 600);
  lightRays(ctx, W / 2, 800, .18, t);
  // shelves
  for (let i = 0; i < 3; i++) { ctx.fillStyle = '#8a5a3c'; ctx.fillRect(-100, 420 + i * 260, W + 200, 26); for (let j = 0; j < 6; j++) { ctx.save(); ctx.translate(80 + j * 180, 360 + i * 260); i === 1 ? tv(ctx, .4) : bottle(ctx, .45); ctx.restore(); } }
  const keeper = { ...crowdChar(44), mustache: true, apron: '#fff', hairStyle: 'short' };
  person(ctx, keeper, { x: W / 2, y: 2050, s: 1.9, expr: 'happy', euroEyes: true, mouth: .35 + .25 * Math.sin(t * 10), armL: 1.3 + Math.sin(t * 14) * .25, armR: 1.3 + Math.cos(t * 14) * .25, bob: Math.sin(t * 10) * 6 });
  // register
  ctx.save(); ctx.translate(W / 2, 1640); rr(ctx, -300, -120, 600, 330, 20); fillStroke(ctx, '#c0392b', 8); rr(ctx, -240, -260, 480, 150, 16); fillStroke(ctx, '#2d2d3a', 8); text(ctx, '1 000 €', 0, -185, { size: 90, color: '#3bff8a', shadow: '#3bff8a' });
  const dr = E.back(inv(s04b.start + .25, s04b.start + .5, t)); rr(ctx, -260, 120 + dr * 90, 520, 110, 12); fillStroke(ctx, '#ffd23f', 8); ctx.restore();
  ctx.restore();
  for (let k = 0; k < 4; k++) { const t0 = s04b.start + .25 + k * .45; if (t > t0) confetti(ctx, t, t0, W / 2, 1500, { n: 0 }); }
  rainCoins(ctx, t, { seed: 12, n: 30, noteRatio: .7 });
  title(ctx, t, 'KA-CHING !', W / 2, 520, 140, s04b.start + .25, { color: '#ffd23f', rot: -.08 });
  vignette(ctx, .4);
  flash(ctx, (1 - inv(s04b.start - .05, s04b.start + .12, t)) * .8);
};

// ---- 4. BAKERY ----
function bakeryInterior(ctx, t) {
  ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [[0, '#f7d9a8'], [1, '#e8b27a']]); ctx.fillRect(-500, -500, W + 1000, H + 1000);
  ctx.fillStyle = '#d99a5b'; for (let x = -500; x < W + 500; x += 90) ctx.fillRect(x, -500, 6, 1700);
  for (let i = 0; i < 3; i++) { ctx.fillStyle = '#7a4a2c'; ctx.fillRect(-500, 300 + i * 230, W + 1000, 24); for (let j = -3; j < 10; j++) { ctx.save(); ctx.translate(j * 150 + 40, 260 + i * 230); ctx.rotate(.3); rr(ctx, -70, -22, 140, 44, 22); fillStroke(ctx, '#d9903d', 5); ctx.beginPath(); for (let k = -2; k <= 2; k++) { ctx.moveTo(k * 24 - 8, -14); ctx.lineTo(k * 24 + 8, 14); } ctx.lineWidth = 4; ctx.strokeStyle = '#f5d39a'; ctx.stroke(); ctx.restore(); } }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = radGrad(ctx, 300, 200, 20, 900, [[0, 'rgba(255,230,170,.45)'], [1, 'rgba(255,230,170,0)']]); ctx.fillRect(-500, -500, W + 1000, H + 1000); ctx.restore();
}
function counter(ctx, y, priceLabel, flipK) {
  rr(ctx, -400, y, W + 800, 900, 0); fillStroke(ctx, '#8a5a3c', 8);
  rr(ctx, -400, y, W + 800, 50, 0); fillStroke(ctx, '#b07a4f', 8);
  // basket of baguettes
  ctx.save(); ctx.translate(300, y - 10); for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate(-.5 + i * .22); rr(ctx, -20, -230, 40, 240, 20); fillStroke(ctx, '#d9903d', 5); ctx.restore(); } rr(ctx, -110, -60, 220, 110, 20); fillStroke(ctx, '#c49a6c', 6); ctx.restore();
  if (priceLabel) { const sc = 1 + Math.sin(flipK * Math.PI) * .25; priceTag(ctx, 830, y - 70, 1.4 * sc, -.08, priceLabel, flipK > .5 ? '#ffe0e0' : '#fff', flipK > .5 ? '#d62828' : OUT); }
}
SC.bakery = (ctx, t, lt) => {
  const s05 = seg('s05'), s06 = seg('s06'), s07 = seg('s07'), s08 = seg('s08');
  if (t < s06.start - .05) {
    // exterior tracking shot
    const k = inv(s05.start - .2, s06.start, t);
    const lx = lerp(-150, 760, k);
    ctx.save(); camera(ctx, lerp(300, 820, E.sine(k)), 1100, 1.15);
    streetBg(ctx, t, { baseY: 950 });
    shopFront(ctx, 820, 1400, 760, '#f3d9b1', 'BOULANGERIE', (c, x, y, w, h) => { for (let i = 0; i < 6; i++) { c.save(); c.translate(x + 50 + i * 80, y + 150); c.rotate(.5); rr(c, -14, -90, 28, 180, 14); fillStroke(c, '#d9903d', 4); c.restore(); } }, t, { awning: '#c0392b', signCol: '#fff3c4' });
    shopFront(ctx, -10, 1400, 760, '#9ad0c2', 'SOLDES', null, t, { awning: '#ff6b6b' });
    ground(ctx, 1400);
    for (let i = 0; i < 3; i++) { const c = crowdChar(60 + i); const x = 1500 - ((t * 200 + i * 400) % 2000); person(ctx, c, { x, y: 1600 + i * 20, s: .7, walk: t * 7 + i, flip: true, expr: 'happy', hold: shoppingBag('#ffd23f', '€') }); }
    person(ctx, LEO, { x: lx, y: 1680, s: .8, walk: t * 6.5, expr: 'neutral', blink: blink(t, 1) });
    ctx.restore(); vignette(ctx, .35);
    flash(ctx, (1 - inv(lt0(t, 'bakery'), lt0(t, 'bakery') + .15, t)) * .8);
    return;
  }
  const tDeux = wt('s06', '2');
  const flipK = inv(tDeux - .1, tDeux + .25, t);
  const label = flipK > .5 ? '2 €' : '1 €';
  const mB = amp('B', t), mH = amp('H', t);
  let shot = t < s07.start - .05 ? 1 : t < s08.start - .05 ? 2 : 3;
  if (shot === 1) { // baker medium shot
    const z = lerp(1.05, 1.15, inv(s06.start, s07.start, t));
    ctx.save(); camera(ctx, W / 2, H / 2, z); bakeryInterior(ctx, t);
    person(ctx, BAKER, { x: 500, y: 1880, s: 1.6, expr: flipK > .5 ? 'smug' : 'happy', mouth: mB, blink: blink(t, 4), armR: 1.0, armL: .4, look: [.3, .2] });
    counter(ctx, 1380, label, flipK); ctx.restore();
    if (flipK > 0 && flipK < 1) burst(ctx, 830, 1310, 260, 16, '#fff', (1 - flipK) * .6, t);
  } else if (shot === 2) { // Léo shocked close-up
    const lb = t - s07.start; const [sx, sy] = shake(t, 10 * (1 - inv(0, .5, lb)) + 1.5, 30, 7);
    ctx.save(); camera(ctx, W / 2 + sx, H / 2 + sy, lerp(1.35, 1.2, E.out(lb / .5))); bakeryInterior(ctx, t);
    person(ctx, LEO, { x: 540, y: 2150, s: 2.2, expr: 'shock', mouth: mH, blink: 0, armL: 1.6, armR: 1.6 });
    ctx.restore(); speedLines(ctx, .3 * (1 - inv(0, .6, lb)), 540, 900, 3, t);
    sweat(ctx, 800, 820, 1.6, inv(.2, .4, lb));
    // memory tag
    ctx.save(); ctx.globalAlpha = .9; priceTag(ctx, 250, 420, 1.1, -.15, '1 €'); ctx.restore();
    ctx.save(); ctx.translate(250, 420); ctx.strokeStyle = '#d62828'; ctx.lineWidth = 16; const kk = inv(.3, .6, lb); ctx.beginPath(); ctx.moveTo(-110, -60); ctx.lineTo(-110 + 220 * kk, -60 + 120 * kk); ctx.stroke(); ctx.restore();
    priceTag(ctx, 800, 420, 1.3 * E.back(inv(.1, .4, lb)), .1, '2 €', '#ffe0e0', '#d62828');
  } else { // two-shot
    const lb = t - s08.start;
    ctx.save(); camera(ctx, W / 2, H / 2 + 40, lerp(1.0, 1.06, inv(0, 1.6, lb))); bakeryInterior(ctx, t);
    person(ctx, BAKER, { x: 740, y: 1760, s: 1.3, expr: 'smug', mouth: mB, blink: blink(t, 6), armL: 1.6 + Math.sin(lb * 3) * .1, armR: 1.6, tilt: .08, flip: true, look: [-.6, 0] });
    counter(ctx, 1450, '2 €', 1);
    person(ctx, LEO, { x: 260, y: 2350, s: 1.75, expr: 'sad', blink: blink(t, 3), look: [.6, -.2], armL: 0, armR: .3 });
    ctx.restore();
  }
  vignette(ctx, .4);
};

// ---- 5. PRICES ----
SC.prices = (ctx, t, lt) => {
  const s = seg('s09');
  const tP1 = wt('s09', 'Puis', 0), tP2 = wt('s09', 'Puis', 1), t900 = wt('s09', '900');
  if (t < tP1 - .1) {
    const calK = inv(s.start - .2, s.start + .7, t);
    ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [[0, '#2f3b6b'], [1, '#6c4f8a']]); ctx.fillRect(0, 0, W, H);
    if (calK < 1) { calendar(ctx, W / 2, 900, 1.6, calK < .5 ? 1 : 2, calK); return; }
    // apartment door with rent sign
    const lb = t - (s.start + .7);
    ctx.save(); camera(ctx, W / 2, H / 2, lerp(1.0, 1.12, inv(0, 3, lb)));
    sky(ctx, '#6fa8dc', '#cfe2f3');
    rr(ctx, 90, 200, 900, 1720, 10); fillStroke(ctx, '#e2a46d', 8);
    for (let y = 260; y < 900; y += 200) for (let x = 150; x < 950; x += 220) { rr(ctx, x, y, 140, 140, 8); fillStroke(ctx, '#bfe3ff', 6); }
    rr(ctx, 380, 1200, 320, 720, [160, 160, 0, 0]); fillStroke(ctx, '#7a3b2e', 8);
    ctx.restore();
    // rent board
    const k = E.back(inv(0, .35, lb));
    ctx.save(); ctx.translate(W / 2, 1000); ctx.scale(k, k); ctx.rotate(-.04);
    rr(ctx, -380, -220, 760, 440, 26); fillStroke(ctx, '#fff', 10);
    text(ctx, 'LOYER', 0, -130, { size: 90, color: OUT });
    const roll = E.inOut(inv(t900 - .5, t900 + .2, t)); const val = Math.round(lerp(600, 900, roll) / 10) * 10;
    text(ctx, val + ' €', 0, 50, { size: 190, color: roll > 0 ? mixColor('#1b1430', '#e53935', roll) : OUT });
    text(ctx, '/ mois', 0, 170, { size: 50, color: '#666' });
    ctx.restore();
    if (roll >= 1) { title(ctx, t, '+50 %', 820, 640, 130, t900 + .2, { color: '#ff4d4d', rot: .12 }); }
    flash(ctx, (1 - inv(lt0(t, 'prices'), lt0(t, 'prices') + .15, t)) * .8);
    vignette(ctx, .35);
    return;
  }
  if (t < tP2 - .1) {
    // gas pump
    const lb = t - tP1; const [sx, sy] = shake(t, 2);
    ctx.save(); camera(ctx, W / 2 + sx, H / 2 + sy, lerp(1.2, 1.0, E.out(lb / .5)));
    sky(ctx, '#ff9a5a', '#ffd29a');
    skyline(ctx, { seed: 88, baseY: 1300, color: '#c07a6a', hMin: 200, hMax: 500 });
    ctx.fillStyle = '#5b5670'; ctx.fillRect(-200, 1300, W + 400, 800);
    rr(ctx, -100, 420, W + 200, 90, 10); fillStroke(ctx, '#e74c3c', 8); text(ctx, 'STATION', W / 2, 468, { size: 70, color: '#fff' });
    rr(ctx, 300, 700, 480, 900, 30); fillStroke(ctx, '#f1f1f1', 8);
    rr(ctx, 350, 760, 380, 260, 16); fillStroke(ctx, '#1b1b26', 6);
    const pr = lerp(1.89, 2.79, E.inOut(inv(tP1 + .3, tP2 - .3, t)));
    text(ctx, pr.toFixed(2).replace('.', ',') + ' €', 540, 860, { size: 92, color: '#ff5d5d', font: 'Lucky', shadow: '#ff3030' });
    text(ctx, 'LE LITRE', 540, 960, { size: 40, color: '#aaa' });
    ctx.beginPath(); ctx.moveTo(780, 1100); ctx.quadraticCurveTo(940, 1150, 900, 1500); ctx.lineWidth = 22; ctx.strokeStyle = OUT; ctx.stroke();
    rr(ctx, 860, 1060, 90, 160, 18); fillStroke(ctx, '#2d2d3a', 6);
    ctx.restore();
    // arrow
    ctx.save(); ctx.translate(200, 1300 - E.out(inv(tP1, tP2, t)) * 300); ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.moveTo(0, -120); ctx.lineTo(90, 0); ctx.lineTo(35, 0); ctx.lineTo(35, 140); ctx.lineTo(-35, 140); ctx.lineTo(-35, 0); ctx.lineTo(-90, 0); ctx.closePath(); fillStroke(ctx, '#ff3b3b', 8); ctx.restore();
    flash(ctx, (1 - inv(tP1 - .1, tP1 + .05, t)) * .7);
    vignette(ctx, .35);
    return;
  }
  // everything else: price tags flipping + chart
  const lb = t - tP2; const [sx, sy] = shake(t, 4 + lb * 3);
  ctx.save(); ctx.translate(sx, sy);
  ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [[0, '#1c1633'], [1, '#4a1f3d']]); ctx.fillRect(-50, -50, W + 100, H + 100);
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 3; for (let x = 0; x < W; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y < H; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const items = [['LAIT', 1.2, 2.1], ['PAIN', 1, 2], ['CAFÉ', 3, 5.5], ['BUS', 2, 3.5], ['PIZZA', 9, 16], ['CINÉ', 10, 19]];
  items.forEach(([nm, a, b], i) => {
    const x = 220 + (i % 2) * 640, y = 420 + Math.floor(i / 2) * 330; const k = inv(tP2 + i * .12, tP2 + i * .12 + .35, t);
    const v = lerp(a, b, E.out(k)); ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(i) * .1);
    text(ctx, nm, 0, -90, { size: 54, color: '#fff' });
    priceTag(ctx, 0, 0, 1.15 * (1 + Math.sin(k * Math.PI) * .2), 0, (v % 1 ? v.toFixed(1).replace('.', ',') : v) + '€', k > .9 ? '#ffe0e0' : '#fff', k > .9 ? '#d62828' : OUT);
    ctx.restore();
  });
  // chart line
  const ck = inv(tP2, seg('s09').end + .2, t);
  ctx.save(); ctx.beginPath(); const pts = 24;
  for (let i = 0; i <= pts * ck; i++) { const x = -40 + i / pts * (W + 120); const y = 1700 - Math.pow(i / pts, 1.8) * 1500 + Math.sin(i * 1.7) * 40; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.lineWidth = 34; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke(); ctx.lineWidth = 20; ctx.strokeStyle = '#ff3b3b'; ctx.shadowColor = '#ff3b3b'; ctx.shadowBlur = 30; ctx.stroke(); ctx.restore();
  ctx.restore();
  flash(ctx, (1 - inv(tP2 - .1, tP2 + .05, t)) * .7, '255,80,80');
  vignette(ctx, .45);
};

// ---- 6. PROFIT ----
SC.profit = (ctx, t, lt) => {
  const s = seg('s10'); const tProp = wt('s10', 'propriétaire'), tVend = wt('s10', 'vendeur');
  if (t < tVend - .1) {
    const sub2 = t > tProp - .1;
    const lb = t - (sub2 ? tProp : s.start);
    ctx.save(); camera(ctx, W / 2, H / 2 + (sub2 ? 0 : 100), sub2 ? lerp(1.15, 1.0, E.out(lb / 1.2)) : lerp(1.3, 1.15, E.out(lb / 1.6)));
    ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [[0, '#1a1030'], [.6, '#5a2d5f'], [1, '#d9893a']]); ctx.fillRect(-300, -300, W + 600, H + 600);
    lightRays(ctx, W / 2, 1100, .14, t, '255,200,90');
    if (sub2) {
      // buildings getting SOLD stamps
      const bs = [[60, 300, 900], [330, 260, 1150], [600, 280, 800], [860, 260, 1050]];
      bs.forEach(([x, w, h], i) => { rr(ctx, x - 40, 1500 - h, w, h + 400, 6); fillStroke(ctx, ['#4f4a7a', '#6a4a7a', '#4a5a7a', '#5a4a6a'][i], 7); for (let yy = 1500 - h + 40; yy < 1450; yy += 90) for (let xx = x - 10; xx < x + w - 70; xx += 70) { ctx.fillStyle = '#ffd98a'; ctx.fillRect(xx, yy, 36, 50); }
        const t0 = tProp + .5 + i * .45; const k = inv(t0, t0 + .15, t); if (k > 0) { ctx.save(); ctx.translate(x + w / 2 - 40, 1500 - h + 200); ctx.rotate(-.2); const sc = lerp(2.2, 1, E.out(k)); ctx.scale(sc, sc); ctx.globalAlpha = k; rr(ctx, -120, -50, 240, 100, 12); ctx.lineWidth = 12; ctx.strokeStyle = '#e53935'; ctx.stroke(); text(ctx, 'VENDU', 0, 6, { size: 66, color: '#e53935' }); ctx.restore(); } });
      person(ctx, BOSS, { x: 700, y: 2050, s: 1.3, expr: 'smug', euroEyes: inv(tProp + .5, tProp + .6, t) > 0, mouth: .15 + .1 * Math.sin(t * 8), armR: 2.0, armL: .6, blink: blink(t, 2), hold: ctx => { ctx.save(); ctx.rotate(-2.0); ctx.translate(0, 60); circle(ctx, 0, 70, 95); fillStroke(ctx, '#c9a46a', 7); text(ctx, '€', 0, 80, { size: 110, color: '#7a5a2a' }); ctx.restore(); } });
    } else {
      // boss reveal low angle, rubbing hands
      const rub = Math.sin(t * 16) * .12;
      person(ctx, BOSS, { x: 540, y: 2300, s: 2.4, expr: 'smug', mouth: .1, armL: 1.25 + rub, armR: 1.25 - rub, blink: blink(t, 7), look: [.2, .2] });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = radGrad(ctx, 540, 1300, 50, 700, [[0, 'rgba(255,170,60,.25)'], [1, 'rgba(255,170,60,0)']]); ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    ctx.restore();
    rainCoins(ctx, t, { seed: 33, n: 14, noteRatio: .8 });
    flash(ctx, (1 - inv(lt0(t, 'profit'), lt0(t, 'profit') + .15, t)) * .8);
    flash(ctx, sub2 ? (1 - inv(tProp - .1, tProp + .05, t)) * .6 : 0);
    vignette(ctx, .55);
    return;
  }
  // seller triples price
  const lb = t - tVend;
  ctx.save(); camera(ctx, W / 2, H / 2, lerp(1.1, 1.0, E.out(lb / .8)));
  ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [[0, '#ffefc2'], [1, '#ffb37a']]); ctx.fillRect(-300, -300, W + 600, H + 600);
  scooter(ctx, 540, 1550, 2.0, '#ff4d6d');
  const seller = { ...crowdChar(17), hairStyle: 'short', glasses: false, tie: '#e53935', shirt: '#2d3e70', shirt2: '#22305a' };
  person(ctx, seller, { x: 190, y: 1900, s: 1.25, expr: 'smirk', mouth: 0, armR: 2.2 + Math.sin(lb * 20) * .1 * (lb < 1.2), armL: .3, blink: blink(t, 9) });
  ctx.restore();
  const k1 = inv(.25, .55, lb), k2 = E.back(inv(.6, .9, lb));
  ctx.save(); ctx.translate(560, 640); ctx.rotate(-.05); rr(ctx, -330, -170, 660, 340, 24); fillStroke(ctx, '#fff', 10);
  text(ctx, '1 500 €', 0, -60, { size: 120, color: OUT });
  ctx.strokeStyle = '#e53935'; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(-230, -60); ctx.lineTo(-230 + 460 * k1, -60); ctx.stroke();
  if (k2 > 0) { ctx.save(); ctx.translate(0, 80); ctx.scale(k2, k2); text(ctx, '4 500 €', 0, 0, { size: 130, color: '#e53935', font: 'Hand' }); ctx.restore(); }
  ctx.restore();
  title(ctx, t, 'x3', 880, 380, 180, tVend + 1.0, { color: '#ffd23f', rot: .2 });
  flash(ctx, (1 - inv(tVend - .1, tVend + .05, t)) * .6);
  vignette(ctx, .35);
};

// ---- 7. NIGHT ----
function room(ctx, t) {
  ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [[0, '#141a3a'], [1, '#232b55']]); ctx.fillRect(-400, -400, W + 800, H + 800);
  // window with party city
  ctx.save(); rr(ctx, 520, 230, 480, 620, 12); ctx.clip();
  ctx.fillStyle = linGrad(ctx, 0, 230, 0, 850, [[0, '#0b0f2a'], [1, '#3a2a6a']]); ctx.fillRect(520, 230, 480, 620);
  for (let i = 0; i < 4; i++) { const per = 1.6, ph = (t + i * .41) % per, k = ph / per; const fx = 600 + ((i * 137) % 320), fy = 380 + ((i * 71) % 160); const r = rng(i + Math.floor((t + i * .41) / per) * 10); const cols = ['#ff5d73', '#ffd23f', '#3bceac', '#4d7cff']; ctx.globalAlpha = 1 - k; for (let j = 0; j < 16; j++) { const a = j / 16 * TAU; circle(ctx, fx + Math.cos(a) * 110 * E.out(k), fy + Math.sin(a) * 110 * E.out(k) + k * k * 40, 6); ctx.fillStyle = cols[i]; ctx.fill(); } ctx.globalAlpha = 1; }
  skyline(ctx, { seed: 5, baseY: 870, color: '#1a1840', x0: 480, x1: 1040, hMin: 120, hMax: 340, winColor: '#ffcf6b', lit: .6, flicker: true, t });
  ctx.restore();
  rr(ctx, 520, 230, 480, 620, 12); ctx.lineWidth = 16; ctx.strokeStyle = '#3a3150'; ctx.stroke(); ctx.fillStyle = '#3a3150'; ctx.fillRect(752, 230, 16, 620); ctx.fillRect(520, 532, 480, 16);
  // clock
  ctx.save(); ctx.translate(230, 420); circle(ctx, 0, 0, 100); fillStroke(ctx, '#f5ecd7', 8); const sec = Math.floor(t); ctx.rotate(sec * TAU / 60); ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -80); ctx.lineWidth = 5; ctx.strokeStyle = '#e53935'; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(230, 420); ctx.rotate(t * .05); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -60); ctx.lineWidth = 9; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore();
}
function notebook(ctx, x, y, s, lines, prog, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-.04);
  rr(ctx, -420, -300, 840, 600, 16); fillStroke(ctx, '#fffaf0', 8);
  ctx.strokeStyle = 'rgba(80,120,200,.35)'; ctx.lineWidth = 3; for (let yy = -230; yy < 290; yy += 70) { ctx.beginPath(); ctx.moveTo(-400, yy); ctx.lineTo(400, yy); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(220,80,80,.5)'; ctx.beginPath(); ctx.moveTo(-330, -300); ctx.lineTo(-330, 300); ctx.stroke();
  let pen = null;
  lines.forEach((ln, i) => {
    const k = clamp(prog * lines.length - i); if (k <= 0) return; const n = Math.ceil(ln.length * k);
    ctx.font = '64px Hand'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = i === lines.length - 1 ? '#d62828' : '#22305a';
    const str = ln.slice(0, n); ctx.fillText(str, -310, -245 + i * 140 + 120); if (k < 1) pen = [-310 + ctx.measureText(str).width, -245 + i * 140 + 120];
  });
  if (pen) { ctx.save(); ctx.translate(pen[0] + 10, pen[1] - 30 + Math.sin(t * 30) * 5); ctx.rotate(.6); rr(ctx, -12, -200, 24, 200, 8); fillStroke(ctx, '#ffd23f', 5); ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(0, 30); ctx.lineTo(12, 0); fillStroke(ctx, '#f5d39a', 5); ctx.restore(); }
  ctx.restore();
}
SC.night = (ctx, t, lt) => {
  const s11 = seg('s11'), s11b = seg('s11b');
  const tObs = wt('s11', 'observe'), tCpt = wt('s11', 'compte'), tLit = wt('s11', 'lit');
  if (t < s11b.start - .05) {
    ctx.save(); camera(ctx, W / 2 + Math.sin(t * .4) * 20, H / 2, lerp(1.0, 1.12, inv(s11.start, s11b.start, t)));
    room(ctx, t);
    const phase = t > tLit ? 3 : t > tCpt ? 2 : t > tObs ? 1 : 0;
    const look = [[0, .9], [1, -.4], [-.2, 1], [0, .9]][phase];
    const write = phase === 0 || phase === 3 ? Math.sin(t * 18) * .08 : 0;
    person(ctx, LEO, { x: 420, y: 1900, s: 1.45, expr: phase === 1 ? 'think' : 'think', look, blink: blink(t, 5), armR: 1.15 + write + (phase === 2 ? Math.abs(Math.sin(t * 14)) * .12 : 0), armL: .9, tilt: phase === 1 ? .1 : 0 });
    // desk
    rr(ctx, -200, 1480, W + 400, 700, 0); fillStroke(ctx, '#5a3a2a', 8);
    ctx.save(); ctx.translate(300, 1470); ctx.rotate(-.06); rr(ctx, -160, -40, 320, 50, 6); fillStroke(ctx, '#fffaf0', 6); ctx.restore();
    // calculator
    ctx.save(); ctx.translate(640, 1440); rr(ctx, -80, -60, 160, 100, 12); fillStroke(ctx, '#2d2d3a', 6); rr(ctx, -64, -48, 128, 30, 4); ctx.fillStyle = '#9fe0a0'; ctx.fill(); ctx.restore();
    // papers stack (reading)
    if (phase === 3) { ctx.save(); ctx.translate(420, 1300); ctx.rotate(.05); rr(ctx, -110, -140, 220, 280, 8); fillStroke(ctx, '#fff', 6); for (let i = 0; i < 7; i++) { ctx.fillStyle = '#bbb'; ctx.fillRect(-80, -100 + i * 32, 160, 8); } ctx.restore(); }
    // lamp
    ctx.save(); ctx.translate(860, 1480); rr(ctx, -70, -20, 140, 30, 10); fillStroke(ctx, '#3a3150', 6); ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-60, -300); ctx.lineTo(-140, -360); ctx.lineWidth = 14; ctx.strokeStyle = '#3a3150'; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-210, -320); ctx.lineTo(-90, -420); ctx.lineTo(-50, -340); ctx.closePath(); fillStroke(ctx, '#2bb3a3', 6); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = radGrad(ctx, 690, 1150, 20, 820, [[0, 'rgba(255,200,120,.55)'], [1, 'rgba(255,200,120,0)']]); ctx.fillRect(-300, -300, W + 600, H + 600); ctx.restore();
    ctx.restore();
    // labels
    if (phase >= 1) title(ctx, t, ['', 'OBSERVER', 'COMPTER', 'LIRE'][phase], W / 2, 260, 100, [0, tObs, tCpt, tLit][phase], { color: '#8ff0e0' });
    vignette(ctx, .6, '5,5,20');
    flash(ctx, (1 - inv(lt0(t, 'night'), lt0(t, 'night') + .15, t)) * .7);
    return;
  }
  // notebook close-up
  const prog = inv(s11b.start + .2, s11b.end - .1, t);
  ctx.save(); camera(ctx, W / 2, H / 2, lerp(1.0, 1.08, prog));
  ctx.fillStyle = '#4a2f22'; ctx.fillRect(-300, -300, W + 600, H + 600);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let y = -300; y < H + 300; y += 46) ctx.fillRect(-300, y, W + 600, 4);
  notebook(ctx, W / 2, 900, 1.15, ['Pain : 1€ → 2€', 'Loyer : 600 → 900', 'Essence : +47 %', 'TOUT : +100 % !'], prog, t);
  coin(ctx, 220, 1500, 70, .3); coin(ctx, 330, 1560, 60, 1.2);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = radGrad(ctx, 760, 500, 20, 1100, [[0, 'rgba(255,200,120,.4)'], [1, 'rgba(255,200,120,0)']]); ctx.fillRect(-300, -300, W + 600, H + 600); ctx.restore();
  ctx.restore();
  vignette(ctx, .55);
  flash(ctx, (1 - inv(s11b.start - .05, s11b.start + .1, t)) * .5);
};

// ---- 8. FINE PRINT ----
SC.fine = (ctx, t, lt) => {
  const s12 = seg('s12'), s13 = seg('s13');
  const tMin = wt('s12', 'minuscule');
  const lensK = E.inOut(inv(tMin - .6, tMin + .5, t));
  const z = lerp(1.0, 1.25, E.inOut(inv(s12.start, s13.start, t)));
  const shocked = t > s13.start - .05;
  const [sx, sy] = shake(t, shocked ? 5 : 1.5);
  ctx.save(); camera(ctx, W / 2 + sx, lerp(H / 2, H / 2 + 260 * lensK, 1) + sy, z);
  ctx.fillStyle = '#0d0f1e'; ctx.fillRect(-500, -500, W + 1000, H + 1000);
  // big phone
  const scr = (c, w, h) => {
    c.fillStyle = '#f4f6fb'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1e3a8a'; c.fillRect(0, 0, w, 64); text(c, 'MAIRIE', w / 2, 40, { size: 24, font: 'Inter', weight: 900, color: '#fff' });
    rr(c, 12, 84, w - 24, 230, 14); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#dde'; c.stroke();
    text(c, 'BONNE NOUVELLE !', w / 2, 116, { size: 17, font: 'Inter', weight: 900, color: '#1e3a8a' });
    text(c, 'Chaque habitant', w / 2, 150, { size: 15, font: 'Inter', weight: 600, color: '#334' });
    text(c, 'reçoit', w / 2, 172, { size: 15, font: 'Inter', weight: 600, color: '#334' });
    text(c, '1 000 €', w / 2, 214, { size: 40, font: 'Inter', weight: 900, color: '#18a558' });
    text(c, 'Profitez-en !', w / 2, 256, { size: 15, font: 'Inter', weight: 700, color: '#334' });
    text(c, '*Avance remboursable à 120 % sous 30 jours', w / 2, 300, { size: 6.5, font: 'Inter', weight: 600, color: '#99a' });
  };
  phone(ctx, W / 2, 820, 3.0, 0, scr);
  // magnifier
  if (lensK > 0) {
    const lx = lerp(1400, W / 2, lensK), ly = 820 + (-184 + 298) * 3.0, LR = 300;
    ctx.save(); circle(ctx, lx, ly, LR); ctx.clip();
    ctx.translate(lx, ly); ctx.scale(1.7, 1.7); ctx.translate(-W / 2, -ly); phone(ctx, W / 2, 820, 3.0, 0, scr);
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; circle(ctx, lx - 100, ly - 110, 70); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill(); ctx.restore();
    circle(ctx, lx, ly, LR); ctx.lineWidth = 34; ctx.strokeStyle = '#2d2d3a'; ctx.stroke(); ctx.lineWidth = 8; ctx.strokeStyle = '#8888a0'; ctx.stroke();
    ctx.save(); ctx.translate(lx + 210, ly + 210); ctx.rotate(-.8); rr(ctx, -40, 30, 80, 300, 30); fillStroke(ctx, '#7a3b2e', 8); ctx.restore();
  }
  ctx.restore();
  const ck = E.back(inv(tMin + .4, tMin + .75, t));
  if (ck > 0) { ctx.save(); ctx.translate(W / 2, 250); ctx.scale(ck, ck); ctx.rotate(-.03); rr(ctx, -470, -95, 940, 190, 24); fillStroke(ctx, '#fff3c4', 9); text(ctx, '*AVANCE REMBOURSABLE', 0, -32, { size: 66, color: '#c0392b' }); text(ctx, 'À 120 % SOUS 30 JOURS', 0, 44, { size: 58, color: OUT }); ctx.restore(); }
  if (shocked) {
    const lb = t - s13.start; const k = E.out(inv(0, .3, lb));
    ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = 'rgba(80,0,10,.55)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, H - 760 * k, W, 760); ctx.clip();
    ctx.fillStyle = linGrad(ctx, 0, H - 760, 0, H, [[0, '#3a0a14'], [1, '#14050a']]); ctx.fillRect(0, H - 760, W, 760);
    person(ctx, LEO, { x: W / 2, y: H + 820, s: 2.6, expr: 'shock', mouth: amp('H', t), armL: 0, armR: 0 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = linGrad(ctx, 0, H - 760, 0, H, [[0, 'rgba(255,60,60,.35)'], [1, 'rgba(255,60,60,0)']]); ctx.fillRect(0, H - 760, W, 760); ctx.restore();
    ctx.restore();
    ctx.fillStyle = OUT; ctx.fillRect(0, H - 760 * k - 8, W, 14);
  }
  vignette(ctx, .6);
  flash(ctx, (1 - inv(lt0(t, 'fine'), lt0(t, 'fine') + .15, t)) * .7);
};

// ---- 9. LETTERS ----
const NEI_W = { ...crowdChar(3), hairStyle: 'long', hair: '#b5462e', shirt: '#fd79a8', shirt2: '#d35f8b', skin: '#f2c7a5' };
const NEI_M = { ...crowdChar(8), hairStyle: 'cap', cap: '#4d7cff', shirt: '#ff9f43', shirt2: '#d9822e', skin: '#a8704f' };
function letterPaper(ctx, x, y, s, rot, big) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rr(ctx, -150, -200, 300, 400, 8); fillStroke(ctx, '#fff', 6);
  text(ctx, 'AVIS DE', 0, -150, { size: 34, color: '#555' }); text(ctx, 'REMBOURSEMENT', 0, -112, { size: 34, color: '#555' });
  for (let i = 0; i < 4; i++) { ctx.fillStyle = '#ccc'; ctx.fillRect(-110, -70 + i * 26, 220, 8); }
  text(ctx, '1 200 €', 0, 90, { size: 76, color: '#e53935' });
  ctx.save(); ctx.translate(40, 160); ctx.rotate(-.2); rr(ctx, -90, -26, 180, 52, 6); ctx.lineWidth = 6; ctx.strokeStyle = '#e53935'; ctx.stroke(); text(ctx, 'URGENT', 0, 3, { size: 34, color: '#e53935' }); ctx.restore();
  ctx.restore();
}
SC.letters = (ctx, t, lt) => {
  const s14 = seg('s14'), s15 = seg('s15'), s16 = seg('s16'), s16b = seg('s16b');
  if (t < s14.start + 1.3) {
    ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [[0, '#2f3b6b'], [1, '#1c1633']]); ctx.fillRect(0, 0, W, H);
    const k = inv(s14.start - .2, s14.start + 1.2, t); const day = Math.min(30, 2 + Math.floor(E.in(k) * 29));
    const fl = (k * 28) % 1;
    const [sx, sy] = shake(t, 3);
    calendar(ctx, W / 2 + sx, 900 + sy, 1.7 + (day === 30 ? .15 * E.back(inv(.95, 1, k)) : 0), day, day < 30 ? fl : 0);
    if (day === 30) burst(ctx, W / 2, 900, 900, 20, '#ffd23f', .15, t * .2);
    flash(ctx, (1 - inv(lt0(t, 'letters'), lt0(t, 'letters') + .15, t)) * .7);
    return;
  }
  if (t < s15.start - .05) {
    // mailbox wall, letters fly in
    const lb = t - (s14.start + 1.3);
    ctx.save(); camera(ctx, W / 2, H / 2, lerp(1.15, 1.0, E.out(lb / 2)));
    ctx.fillStyle = '#5b5670'; ctx.fillRect(-300, -300, W + 600, H + 600);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let y = -300; y < H + 300; y += 100) ctx.fillRect(-300, y, W + 600, 6);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      const x = 100 + c * 300, y = 380 + r * 300, i = r * 3 + c;
      rr(ctx, x, y, 280, 270, 12); fillStroke(ctx, ['#c9a46a', '#a0a7b8'][(r + c) % 2], 7);
      rr(ctx, x + 40, y + 50, 200, 26, 13); ctx.fillStyle = OUT; ctx.fill();
      rr(ctx, x + 70, y + 150, 140, 40, 6); fillStroke(ctx, '#fff', 4); ctx.fillStyle = '#555'; ctx.font = '26px Inter'; ctx.textAlign = 'center'; ctx.fillText('N° ' + (i + 1), x + 140, y + 180);
      const t0 = s14.start + 1.4 + i * .17; const k = inv(t0, t0 + .35, t);
      if (k > 0 && k < 1) { envelope(ctx, lerp(x + 140 + (c - 1) * 600, x + 140, E.out(k)), lerp(y - 600, y + 60, E.out(k)), .5, (1 - k) * 2, 0, '#fff', '#e53935'); }
      if (k >= 1) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, 280, 63); ctx.clip(); envelope(ctx, x + 140, y + 70, .5, .05, 0, '#fff', '#e53935'); ctx.restore(); }
    }
    ctx.restore(); vignette(ctx, .5);
    return;
  }
  // neighbours reacting
  const mW = amp('W', t), mM = amp('M', t);
  const shot = t < s16.start - .05 ? 1 : t < s16b.start - .05 ? 2 : 3;
  const tShot = [0, s15.start, s16.start, s16b.start][shot];
  const lb = t - tShot; const [sx, sy] = shake(t, 9 * (1 - inv(0, .4, lb)) + 1.5, 30, shot);
  ctx.save(); camera(ctx, W / 2 + sx, H / 2 + sy, lerp(1.2, 1.05, E.out(lb / .5)));
  ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [[0, '#4a4a6a'], [1, '#2a2a40']]); ctx.fillRect(-300, -300, W + 600, H + 600);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { rr(ctx, -60 + c * 300, 200 + r * 300, 280, 270, 12); fillStroke(ctx, '#3e3e58', 6); }
  if (shot === 1) {
    person(ctx, NEI_W, { x: 560, y: 2150, s: 2.0, expr: 'shock', mouth: mW, armR: 1.5, armL: 1.3, blink: 0, hold: ctx => letterPaper(ctx, 0, -120, .8, -.1) });
  } else if (shot === 2) {
    person(ctx, NEI_M, { x: 540, y: 2150, s: 2.0, expr: 'sad', mouth: mM, armL: 2.8, armR: 2.8, headY: 10, blink: blink(t, 3) });
    // empty pockets
    for (const sd of [-1, 1]) { ctx.save(); ctx.translate(540 + sd * 150, 1800); rr(ctx, -40, 0, 80, 90, 18); fillStroke(ctx, '#f5ecd7', 6); ctx.restore(); }
  } else {
    person(ctx, NEI_M, { x: 270, y: 2000, s: 1.4, expr: 'sad', blink: blink(t, 1), armL: .2, armR: .2 });
    person(ctx, NEI_W, { x: 790, y: 2050, s: 1.5, expr: 'worried', mouth: mW, armR: 1.2, armL: 1.4, flip: true, look: [-.6, 0], hold: ctx => letterPaper(ctx, 0, -100, .55, .1) });
  }
  ctx.restore();
  speedLines(ctx, .25 * (1 - inv(0, .5, lb)), W / 2, 900, shot, t);
  vignette(ctx, .55);
  flash(ctx, (1 - inv(0, .1, lb)) * .5);
};

// ---- 10. DEBT ----
SC.debt = (ctx, t, lt) => {
  const s17 = seg('s17'), s18 = seg('s18');
  if (t < s18.start - .05) {
    const lb = t - (s17.start - .2);
    ctx.save(); camera(ctx, W / 2 + lb * 30, lerp(H / 2 - 200, H / 2 + 60, E.inOut(lb / 4)), 1.05);
    streetBg(ctx, t, { sky1: '#2a2f3d', sky2: '#4a5263', sky3: '#5d6575', sun: false, far: '#3d4250', farT: '#353a46', mid: '#2c303b', midT: '#262a33', winMid: '#7a7f8a', lit: .15, baseY: 1100 });
    shopFront(ctx, -60, 1430, 620, '#6b6f7a', 'TÉLÉS', null, t, { awning: '#7d7d7d', signCol: '#9a9a9a', closed: true, dark: true });
    shopFront(ctx, 580, 1430, 620, '#5f6370', 'BOULANGERIE', null, t, { awning: '#7d7d7d', signCol: '#9a9a9a', dark: true });
    ctx.save(); ctx.translate(880, 1280); ctx.rotate(.08); rr(ctx, -120, -55, 240, 110, 10); fillStroke(ctx, '#fff', 6); text(ctx, 'x2', 0, 4, { size: 80, color: '#d62828' }); ctx.restore();
    ground(ctx, 1430, '#7a7a80', '#2e2e36', '#8a8a80');
    for (let i = 0; i < 4; i++) { const c = crowdChar(70 + i); const x = (i * 330 + 100 + (t - s17.start) * 50 * (i % 2 ? 1 : -1)); person(ctx, c, { x, y: 1620 + (i % 2) * 40, s: .8, walk: t * 3 + i, walkAmt: .6, flip: i % 2 === 0, expr: 'sad', gray: .75, headY: 14, blink: blink(t, i) }); }
    ctx.restore();
    rain(ctx, t, 1.0);
    const th = (t - s17.start); flash(ctx, th > 0 && th < .5 ? (th < .08 ? .8 : th > .15 && th < .22 ? .5 : 0) : 0, '220,230,255');
    ctx.fillStyle = 'rgba(20,25,45,.25)'; ctx.fillRect(0, 0, W, H);
    vignette(ctx, .6);
    return;
  }
  // Léo under the lamp, warm light
  const lb = t - s18.start;
  ctx.save(); camera(ctx, W / 2, lerp(1100, 1250, E.out(lb / 2)), lerp(1.6, 1.25, E.out(lb / 1.4)));
  ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [[0, '#0e1220'], [1, '#22283c']]); ctx.fillRect(-500, -500, W + 1000, H + 1000);
  skyline(ctx, { seed: 21, baseY: 1300, color: '#1a1e2c', hMin: 300, hMax: 800, winColor: '#3a3f50', lit: .3 });
  ctx.fillStyle = '#2a2a32'; ctx.fillRect(-500, 1500, W + 1000, 900);
  ellipse(ctx, 640, 1720, 380, 60); ctx.fillStyle = 'rgba(255,200,120,.25)'; ctx.fill();
  lamp(ctx, 380, 1720, 900, 1, t);
  person(ctx, LEO, { x: 640, y: 1720, s: 1.0, expr: lb > .6 ? 'smirk' : 'neutral', look: [0, -.8], blink: blink(t, 2), armL: .15, armR: .15 });
  ctx.restore();
  ctx.save(); ctx.globalAlpha = .6; rain(ctx, t, .7, 9); ctx.restore();
  for (let i = 0; i < 14; i++) { const r = rng(i + 40); sparkle(ctx, 380 + r() * 520, 500 + ((t * 600 + r() * 900) % 900), 10 + r() * 10, .5 + .5 * Math.sin(t * 6 + i), '#ffe6a8'); }
  vignette(ctx, .7);
  flash(ctx, (1 - inv(s18.start - .05, s18.start + .15, t)) * .6, '255,230,180');
};

// ---- 11. LAST LETTER ----
SC.last = (ctx, t, lt) => {
  const s19 = seg('s19'), s20 = seg('s20');
  if (t < s20.start - .1) {
    const lb = t - (s19.start - .2);
    ctx.save(); camera(ctx, W / 2, H / 2, lerp(1.0, 1.12, E.sine(lb / 3.2)));
    ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [[0, '#1b1f3a'], [1, '#3a2f5a']]); ctx.fillRect(-300, -300, W + 600, H + 600);
    lightRays(ctx, W / 2, 200, .1 + .05 * Math.sin(t * 2), t, '255,215,120');
    rr(ctx, 650, 1000, 300, 280, 12); fillStroke(ctx, '#c9a46a', 7); rr(ctx, 690, 1050, 220, 28, 14); ctx.fillStyle = OUT; ctx.fill(); text(ctx, 'LÉO', 800, 1180, { size: 50, color: OUT });
    const fall = E.out(inv(s19.start, s19.start + 2.2, t));
    const ex = lerp(540, 470, fall) + Math.sin(t * 3) * 60 * (1 - fall), ey = lerp(-200, 1000, fall);
    person(ctx, LEO, { x: 400, y: 1900, s: 1.6, expr: fall > .9 ? 'shock' : 'neutral', look: [.2, fall > .9 ? .6 : -1], blink: blink(t, 8), armR: fall > .85 ? 1.5 : .2, armL: fall > .85 ? 1.5 : .1 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; circle(ctx, ex, ey, 260); ctx.fillStyle = radGrad(ctx, ex, ey, 10, 260, [[0, 'rgba(255,215,100,.6)'], [1, 'rgba(255,215,100,0)']]); ctx.fill(); ctx.restore();
    envelope(ctx, ex, ey, 1.0, Math.sin(t * 3) * .25 * (1 - fall), 0, '#ffd56b', '#c0392b');
    for (let i = 0; i < 10; i++) { const r = rng(i); sparkle(ctx, ex + (r() - .5) * 400, ey + (r() - .5) * 300, 14 + r() * 14, .5 + .5 * Math.sin(t * 8 + i)); }
    ctx.restore(); vignette(ctx, .55);
    flash(ctx, (1 - inv(lt0(t, 'last'), lt0(t, 'last') + .15, t)) * .7);
    return;
  }
  const lb = t - s20.start;
  ctx.save(); camera(ctx, W / 2, H / 2, lerp(1.08, 1.0, E.out(lb / 1)));
  ctx.fillStyle = radGrad(ctx, W / 2, 800, 50, 1300, [[0, '#5a4a8a'], [1, '#1b1430']]); ctx.fillRect(-300, -300, W + 600, H + 600);
  lightRays(ctx, W / 2, 800, .12, t, '255,215,120');
  // letter
  const open = E.out(inv(0, .5, lb));
  ctx.save(); ctx.translate(W / 2, lerp(1200, 820, open)); ctx.rotate(-.03);
  rr(ctx, -400, -480, 800, 960, 16); fillStroke(ctx, '#fffaf0', 10);
  rr(ctx, -360, -440, 720, 880, 8); ctx.lineWidth = 4; ctx.strokeStyle = '#d4af37'; ctx.stroke();
  circle(ctx, 0, -360, 50); fillStroke(ctx, '#c0392b', 6); text(ctx, 'M', 0, -356, { size: 54, color: '#ffd56b' });
  const words = [['Félicitations.', -200, 72, '#22305a', 'Hand'], ['Vous étiez le', -60, 76, '#22305a', 'Hand'], ['GROUPE', 80, 120, '#c0392b', 'Lucky'], ['TÉMOIN', 210, 120, '#c0392b', 'Lucky']];
  const tw = [s20.start + .05, wt('s20', 'Vous'), wt('s20', 'GROUPE'), wt('s20', 'TÉMOIN')];
  words.forEach(([w, y, sz, col, f], i) => { const k = E.back(inv(tw[i], tw[i] + .3, t)); if (k > 0) { ctx.save(); ctx.translate(0, y); ctx.scale(k, k); text(ctx, w, 0, 0, { size: sz, color: col, font: f }); ctx.restore(); } });
  ctx.restore();
  ctx.restore();
  person(ctx, LEO, { x: 900, y: 2280, s: 1.3, expr: 'think', mouth: amp('H', t), look: [-.6, -.6], tilt: -.12, blink: blink(t, 4), armL: 0, armR: 0 });
  vignette(ctx, .5);
  flash(ctx, (1 - inv(s20.start - .1, s20.start + .05, t)) * .6);
};

// ---- 12. REVEAL ----
function miniCity(ctx, t, o = {}) {
  // city in a dome, centered at (0,0), radius ~ 1000 units
  ctx.save();
  ellipse(ctx, 0, 60, 1050, 170); fillStroke(ctx, '#3a3a4a', 10);
  ellipse(ctx, 0, 30, 1000, 150); ctx.fillStyle = '#5a6a5a'; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(-1000, -1300, 2000, 1345); ctx.clip();
  skyline(ctx, { seed: 21, baseY: 40, color: '#8f5b7a', tones: '#6a4a7a', hMin: 200, hMax: 700, x0: -950, x1: 950, winColor: '#ffd98a', lit: .5, outline: 6 });
  skyline(ctx, { seed: 57, baseY: 90, color: '#5a4a7a', hMin: 120, hMax: 420, x0: -980, x1: 980, winColor: '#ffe9b0', lit: .5, outline: 6 });
  ctx.restore();
  ellipse(ctx, 0, 110, 1000, 110); ctx.fillStyle = '#4a4a58'; ctx.fill();
  // tiny Léo
  if (o.leo) { person(ctx, LEO, { x: 0, y: 135, s: .2, expr: 'neutral', look: [0, -1], blink: blink(t, 2) }); }
  // dome glass
  ctx.beginPath(); ctx.ellipse(0, 40, 1030, 1150, 0, Math.PI, 0);
  ctx.fillStyle = 'rgba(180,220,255,.10)'; ctx.fill(); ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(210,235,255,.65)'; ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.ellipse(-420, -600, 120, 420, -.5, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fill(); ctx.restore();
  // label plate
  rr(ctx, -330, 170, 660, 120, 14); fillStroke(ctx, '#d4af37', 8); text(ctx, o.label || 'VILLE TEST N°47', 0, 234, { size: 66, color: OUT });
  ctx.restore();
}
function scientist(ctx, x, y, s, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // lab coat body
  ctx.beginPath(); ctx.moveTo(-420, 900); ctx.quadraticCurveTo(-400, 100, 0, 60); ctx.quadraticCurveTo(400, 100, 420, 900); ctx.closePath(); fillStroke(ctx, '#eef2f7', 10);
  ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(-80, 400); ctx.moveTo(0, 60); ctx.lineTo(80, 400); ctx.lineWidth = 8; ctx.strokeStyle = '#b8c2d0'; ctx.stroke();
  // head
  ellipse(ctx, 0, -140, 190, 210); fillStroke(ctx, o.skin || '#e9b896', 10);
  ctx.beginPath(); ctx.moveTo(-190, -160); ctx.quadraticCurveTo(-200, -380, 0, -360); ctx.quadraticCurveTo(200, -380, 190, -160); ctx.quadraticCurveTo(120, -280, 0, -270); ctx.quadraticCurveTo(-120, -280, -190, -160); fillStroke(ctx, o.hair || '#ddd', 10);
  // glasses with glare
  for (const sd of [-1, 1]) { circle(ctx, sd * 80, -150, 62); ctx.fillStyle = 'rgba(160,230,255,.35)'; ctx.fill(); ctx.lineWidth = 12; ctx.strokeStyle = OUT; ctx.stroke(); if (o.glare) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; circle(ctx, sd * 80, -150, 58); ctx.fillStyle = `rgba(255,255,255,${o.glare})`; ctx.fill(); ctx.restore(); } }
  ctx.beginPath(); ctx.moveTo(-18, -150); ctx.lineTo(18, -150); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-60, -20); ctx.quadraticCurveTo(0, o.smile ? 30 : 0, 60, -20); ctx.lineWidth = 10; ctx.stroke();
  ctx.restore();
}
SC.reveal = (ctx, t, lt) => {
  const s21 = seg('s21'), s21b = seg('s21b'), s22 = seg('s22');
  const tExp = wt('s21', 'EXPÉRIENCE');
  if (t < s21b.start - .1) {
    // continuous exponential pull-back
    const k = E.inOut(inv(s21.start - .2, tExp + .2, t));
    const z = Math.exp(lerp(Math.log(7), Math.log(.42), k));
    const [sx, sy] = shake(t, t > tExp ? 6 * (1 - inv(tExp, tExp + .6, t)) : 0);
    ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [[0, '#0a0d18'], [1, '#1a2238']]); ctx.fillRect(0, 0, W, H);
    const sk = inv(.5, 1, k);
    if (sk > 0) { scientist(ctx, lerp(-300, 170, E.out(sk)), lerp(1400, 640, E.out(sk)), 1.0, { glare: .4 + .4 * Math.sin(t * 3), hair: '#cfcfcf' }); scientist(ctx, lerp(1380, 910, E.out(sk)), lerp(1400, 680, E.out(sk)), .95, { skin: '#a8704f', hair: '#2b2b2b', glare: .3 }); }
    ctx.save(); camera(ctx, sx, lerp(40, -150, k) + sy, z);
    // lab background (visible when zoomed out)
    ctx.save(); ctx.globalAlpha = inv(.35, .8, k);
    for (let i = -1; i <= 1; i += 2) { ctx.save(); ctx.translate(-i * 350, -420); rr(ctx, i * 1250 - 260, -1650, 520, 360, 20); fillStroke(ctx, '#1b2238', 10); ctx.save(); rr(ctx, i * 1250 - 240, -1630, 480, 320, 12); ctx.clip(); ctx.fillStyle = '#0a2a1a'; ctx.fillRect(i * 1250 - 240, -1630, 480, 320); ctx.beginPath(); for (let j = 0; j <= 20; j++) { const x = i * 1250 - 220 + j * 22, y = -1340 - Math.pow(j / 20, 2) * 240 + Math.sin(j + t * 3) * 10; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.lineWidth = 10; ctx.strokeStyle = '#3bff8a'; ctx.stroke(); ctx.restore(); text(ctx, i < 0 ? 'INFLATION +100 %' : 'DETTE : 100 %', i * 1250, -1690, { size: 58, color: '#3bff8a', font: 'Lucky' }); ctx.restore(); }
    ctx.restore();
    // table
    ctx.fillStyle = '#2a3048'; ctx.fillRect(-4000, 260, 8000, 3000); ctx.fillStyle = '#3a4260'; ctx.fillRect(-4000, 240, 8000, 40);
    miniCity(ctx, t, { leo: true });
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = radGrad(ctx, W / 2, 700, 50, 900, [[0, `rgba(120,200,255,${.18 * k})`], [1, 'rgba(120,200,255,0)']]); ctx.fillRect(0, 0, W, H); ctx.restore();
    if (t > tExp) title(ctx, t, 'EXPÉRIENCE N°47', W / 2, 1360, 100, tExp, { color: '#3bff8a', shadow: '#3bff8a' });
    vignette(ctx, .6);
    flash(ctx, (1 - inv(tExp - .02, tExp + .2, t)) * (t > tExp ? .8 : 0));
    return;
  }
  if (t < s22.start - .1) {
    // scientist writes on clipboard
    const lb = t - s21b.start;
    ctx.save(); camera(ctx, W / 2, H / 2, lerp(1.1, 1.0, E.out(lb / 1.5)));
    ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [[0, '#0f1424'], [1, '#232c48']]); ctx.fillRect(-300, -300, W + 600, H + 600);
    scientist(ctx, 540, 700, 1.15, { glare: .25 + .5 * Math.max(0, Math.sin(t * 2.2)), smile: true, hair: '#cfcfcf' });
    // clipboard
    ctx.save(); ctx.translate(W / 2, 1180); ctx.scale(.9, .9); ctx.rotate(-.06);
    rr(ctx, -400, -330, 800, 660, 20); fillStroke(ctx, '#8a5a3c', 10); rr(ctx, -360, -290, 720, 590, 8); fillStroke(ctx, '#fff', 6); rr(ctx, -110, -360, 220, 70, 14); fillStroke(ctx, '#aaa', 6);
    const lines = ['Sujet n°1 : Léo', 'Reçu : 0 €', 'Dettes : 0 €', 'Tête froide : OUI ✓'];
    const prog = inv(s21b.start + .2, s21b.end, t); let pen = null;
    lines.forEach((ln, i) => { const kk = clamp(prog * lines.length - i); if (kk <= 0) return; const str = ln.slice(0, Math.ceil(ln.length * kk)); ctx.font = '72px Hand'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = i === 3 ? '#18a558' : '#22305a'; ctx.fillText(str, -320, -170 + i * 130); if (kk < 1) pen = [-320 + ctx.measureText(str).width, -170 + i * 130]; });
    if (pen) { ctx.save(); ctx.translate(pen[0] + 30, pen[1] - 10 + Math.sin(t * 30) * 6); ctx.rotate(.5); rr(ctx, -14, -220, 28, 240, 10); fillStroke(ctx, '#1b1430', 5); ellipse(ctx, 10, -190, 62, 50, .3); fillStroke(ctx, '#e9b896', 8); ctx.restore(); }
    ctx.restore();
    ctx.restore(); vignette(ctx, .55);
    flash(ctx, (1 - inv(s21b.start - .1, s21b.start + .05, t)) * .5);
    return;
  }
  // next city: empty dome, coin dropped
  const lb = t - s22.start; const tT = wt('s22', 'LA');
  ctx.save(); camera(ctx, lerp(-900, 0, E.inOut(inv(0, 1.2, lb))), -380, lerp(.62, .78, E.inOut(lb / 2.6)));
  ctx.fillStyle = linGrad(ctx, 0, -2000, 0, 2000, [[0, '#0a0d18'], [1, '#1a2238']]); ctx.fillRect(-4000, -3000, 8000, 6000);
  ctx.fillStyle = '#2a3048'; ctx.fillRect(-4000, 260, 8000, 3000);
  ctx.save(); ctx.translate(-2300, 0); ctx.globalAlpha = .6; miniCity(ctx, t, { label: 'VILLE N°47' }); ctx.restore();
  // empty dome
  ctx.save(); ellipse(ctx, 0, 60, 1050, 170); fillStroke(ctx, '#3a3a4a', 10); ellipse(ctx, 0, 30, 1000, 150); ctx.fillStyle = '#2a2a38'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 40, 1030, 1150, 0, Math.PI, 0); ctx.fillStyle = 'rgba(180,220,255,.08)'; ctx.fill(); ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(210,235,255,.55)'; ctx.stroke();
  const qk = E.back(inv(tT - .1, tT + .25, t));
  rr(ctx, -420, 170, 840, 120, 14); fillStroke(ctx, '#d4af37', 8); text(ctx, qk > .5 ? 'VILLE N°48 : LA TIENNE' : 'VILLE N°48 : ???', 0, 234, { size: 70, color: qk > .5 ? '#c0392b' : OUT });
  // glowing coin descending
  const ck = E.inOut(inv(.4, 2.2, lb)); const cy = lerp(-2200, -500, ck);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; circle(ctx, 0, cy, 520); ctx.fillStyle = radGrad(ctx, 0, cy, 30, 520, [[0, 'rgba(255,210,90,.55)'], [1, 'rgba(255,210,90,0)']]); ctx.fill(); ctx.restore();
  coin(ctx, 0, cy, 220, t * 2.5);
  // giant tweezers/hand
  ctx.save(); ctx.translate(0, cy - 230); rr(ctx, -40, -1600, 30, 1400, 10); fillStroke(ctx, '#aab', 8); rr(ctx, 10, -1600, 30, 1400, 10); fillStroke(ctx, '#aab', 8); ctx.restore();
  ctx.restore();
  ctx.restore();
  vignette(ctx, .65);
  flash(ctx, (1 - inv(s22.start - .1, s22.start + .05, t)) * .5);
};

// ---- 13. END ----
SC.end = (ctx, t, lt) => {
  const s23 = seg('s23'); const tTu = wt('s23', 'tu'), tDis = wt('s23', 'Dis-le');
  ctx.fillStyle = radGrad(ctx, W / 2, 800, 50, 1400, [[0, '#3a2a6a'], [1, '#0b0816']]); ctx.fillRect(0, 0, W, H);
  lightRays(ctx, W / 2, 760, .1, t, '255,210,90', 18);
  const ck = E.back(inv(s23.start - .2, s23.start + .3, t));
  ctx.save(); ctx.translate(W / 2, 760 + Math.sin(t * 2) * 15); ctx.scale(ck, ck); coin(ctx, 0, 0, 230, t * 2.2); ctx.restore();
  title(ctx, t, 'ET TOI…', W / 2, 320, 130, s23.start, { color: '#fff' });
  title(ctx, t, 'TU AURAIS', W / 2, 1150, 110, tTu, { color: '#ffd23f' });
  title(ctx, t, 'DÉPENSÉ ?', W / 2, 1280, 140, tTu + .15, { color: '#ffd23f' });
  const bk = E.back(inv(tDis - .2, tDis + .2, t));
  if (bk > 0) {
    const p = 1 + Math.sin(t * 7) * .04;
    for (const [x, lab, col] of [[290, 'DÉPENSER', '#e53935'], [790, 'GARDER', '#18a558']]) { ctx.save(); ctx.translate(x, 1500); ctx.scale(bk * p, bk * p); rr(ctx, -220, -70, 440, 140, 70); fillStroke(ctx, col, 10); text(ctx, lab, 0, 6, { size: 66, color: '#fff' }); ctx.restore(); }
    text(ctx, 'Réponds en commentaire', W / 2, 1660, { size: 46, color: '#cfc7ff', font: 'Lucky' });
  }
  vignette(ctx, .5);
  flash(ctx, (1 - inv(lt0(t, 'end'), lt0(t, 'end') + .2, t)) * .7);
  const fo = inv(TOTAL - .6, TOTAL, t); if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, W, H); }
};

// ---------- captions ----------
const CHUNKS = [];
for (const s of TL.segments) {
  if (s.scene === 'end') continue;
  let cur = [];
  const push = () => { if (cur.length) CHUNKS.push({ words: cur, t0: cur[0].t0, seg: s }); cur = []; };
  s.words.forEach((w, i) => { cur.push(w); const len = cur.map(x => x.w).join(' ').length; if (/[.,?!…:»]$/.test(w.w) || len > 14 || cur.length >= 3) push(); });
  push();
}
CHUNKS.forEach((c, i) => { const nx = CHUNKS[i + 1]; c.t1 = Math.min(nx ? nx.t0 : 1e9, c.seg.end + .35); });
const CAP_Y = { hook: 1400, phone: 1530, bakery: 1530, fine: 1560, last: 1640, reveal: 1620, letters: 1520 };
function captions(ctx, t, scene) {
  const c = CHUNKS.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const y = CAP_Y[scene] || 1480; const k = E.back(inv(c.t0, c.t0 + .12, t));
  ctx.save(); ctx.font = '92px Lucky'; ctx.textBaseline = 'middle';
  const words = c.words.map(w => w.w.toUpperCase()); const sp = 46;
  const widths = words.map(w => ctx.measureText(w).width); let total = widths.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  const scale = Math.min(1, 960 / total);
  ctx.translate(W / 2, y); ctx.scale(k * scale, k * scale); let x = -total / 2;
  words.forEach((w, i) => {
    const active = t >= c.words[i].t0 && t < (c.words[i + 1] ? c.words[i + 1].t0 : c.t1);
    const col = active ? (c.seg.spk === 'N' ? '#ffd23f' : '#5df2d6') : '#ffffff';
    ctx.save(); ctx.translate(x + widths[i] / 2, 0); if (active) ctx.scale(1.1, 1.1);
    ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 22; ctx.strokeStyle = '#000'; ctx.strokeText(w, 0, 6); ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.lineWidth = 16; ctx.strokeStyle = OUT; ctx.strokeText(w, 0, 0); ctx.fillStyle = col; ctx.fillText(w, 0, 0);
    ctx.restore(); x += widths[i] + sp;
  });
  ctx.restore();
}

// ---------- frame ----------
let GRAIN = null;
function drawFrame(ctx, t, createCanvas) {
  const r = RANGES.find(r => t >= r.start && t < r.end) || RANGES[RANGES.length - 1];
  ctx.save(); SC[r.n](ctx, t, t - r.start, r.end - r.start); ctx.restore();
  captions(ctx, t, r.n);
  // title band during hook
  if (t < 2.6) { const a = 1 - inv(2.3, 2.6, t); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, 70, 640, 940, 130, 30); ctx.fill(); text(ctx, 'DANS CETTE VILLE, TOUT LE MONDE', W / 2, 682, { size: 44, color: '#fff' }); text(ctx, 'REÇOIT 1 000 €… SAUF LUI.', W / 2, 734, { size: 44, color: '#ffd23f' }); ctx.restore(); }
  // grain
  if (!GRAIN) { GRAIN = createCanvas(256, 256); const g = GRAIN.getContext('2d'); const id = g.createImageData(256, 256); const rr2 = rng(99); for (let i = 0; i < id.data.length; i += 4) { const v = rr2() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 18; } g.putImageData(id, 0, 0); }
  const f = Math.floor(t * 30); ctx.save(); ctx.globalCompositeOperation = 'overlay'; const ox = (f * 73) % 256, oy = (f * 151) % 256; ctx.translate(-ox, -oy); for (let x = 0; x < W + 256; x += 256) for (let y = 0; y < H + 256; y += 256) ctx.drawImage(GRAIN, x, y); ctx.restore();
}

// ---------- SFX cues ----------
function sfxEvents() {
  const ev = []; const A = (t, n, g = 1) => ev.push({ t: +t.toFixed(3), n, g });
  for (let i = 0; i < 9; i++) A(.15 + i * .2, 'ping', .55);
  A(.05, 'whoosh', .7); A(.4, 'coins', .5);
  A(seg('s02').start, 'crowd', .55); A(wt('s02', 'LUI'), 'scratch', .9); A(wt('s02', 'LUI') + .05, 'boom', .6);
  A(lt0(0, 'phone'), 'whoosh', .6); for (let i = 0; i < 5; i++) A(seg('s02b').start + i * .35, 'ping', .3);
  A(seg('s03').start, 'sting', .7);
  A(lt0(0, 'spree'), 'whoosh', .6); A(seg('s04').start, 'crowd', .6); A(wt('s04', 'télés'), 'pop', .5); A(wt('s04', 'scooters') - .3, 'scooter', .7); A(wt('s04', 'champagne') + .02, 'cork', .9);
  A(seg('s04b').start, 'whoosh', .5); for (let k = 0; k < 3; k++) A(seg('s04b').start + .25 + k * .55, 'kaching', .7 - k * .15);
  A(lt0(0, 'bakery'), 'whoosh', .5); A(seg('s05').start, 'steps', .4); A(seg('s06').start - .1, 'bell', .5); A(wt('s06', '2'), 'stamp', .7); A(seg('s07').start, 'sting', .8); A(seg('s08').start, 'whoosh', .3);
  A(lt0(0, 'prices'), 'paper', .7); A(wt('s09', '900') - .4, 'slot', .6); A(wt('s09', '900') + .2, 'stamp', .6);
  A(wt('s09', 'Puis', 0) - .1, 'whoosh', .5); A(wt('s09', 'Puis', 0) + .3, 'slot', .5);
  A(wt('s09', 'Puis', 1) - .1, 'whoosh', .6); for (let i = 0; i < 6; i++) A(wt('s09', 'Puis', 1) + i * .12, 'tick', .5); A(wt('s09', 'Puis', 1), 'riser', .5);
  A(lt0(0, 'profit'), 'boom', .5); A(wt('s10', 'propriétaire') - .1, 'whoosh', .5); for (let i = 0; i < 4; i++) A(wt('s10', 'propriétaire') + .5 + i * .45, 'stamp', .7);
  A(wt('s10', 'vendeur') - .1, 'whoosh', .5); A(wt('s10', 'vendeur') + .3, 'marker', .6); A(wt('s10', 'vendeur') + 1.0, 'kaching', .6);
  A(lt0(0, 'night'), 'whoosh', .4);
  for (let tt = lt0(0, 'night') + .2; tt < seg('s11b').start; tt += 1) A(tt, 'clock', .35);
  for (let i = 0; i < 6; i++) A(lt0(0, 'night') + .5 + i * .8, 'firework', .25);
  A(wt('s11', 'compte'), 'calc', .4); A(seg('s11b').start, 'scribble', .5);
  A(lt0(0, 'fine'), 'whoosh', .4); A(wt('s12', 'minuscule') - .6, 'riser', .45);
  A(seg('s13').start - .05, 'boom', .8); A(seg('s13').start, 'heart', .9);
  A(lt0(0, 'letters'), 'paper', .7); for (let i = 0; i < 10; i++) A(seg('s14').start + i * .12, 'tick', .4); A(seg('s14').start + 1.2, 'stamp', .6);
  for (let i = 0; i < 12; i++) A(seg('s14').start + 1.4 + i * .17, 'swish', .35);
  A(seg('s15').start, 'sting', .7); A(seg('s16').start, 'whoosh', .4); A(seg('s16b').start, 'whoosh', .3);
  A(seg('s17').start, 'thunder', .9); A(seg('s17').start - .2, 'rain', .7);
  A(seg('s18').start, 'shimmer', .7);
  A(seg('s19').start, 'chime', .7); A(seg('s19').start + 2.2, 'paper', .6);
  A(seg('s20').start, 'paper', .5); A(wt('s20', 'GROUPE'), 'stamp', .5);
  A(seg('s21').start, 'riser', .8); A(wt('s21', 'EXPÉRIENCE'), 'boom', 1.0);
  A(seg('s21b').start, 'scribble', .5); A(seg('s22').start, 'whoosh', .4); A(seg('s22').start + 1.0, 'shimmer', .6); A(wt('s22', 'LA'), 'boom', .7);
  A(seg('s23').start - .2, 'whoosh', .6); A(wt('s23', 'Dis-le'), 'pop', .6);
  return ev;
}

module.exports = { drawFrame, sfxEvents, TOTAL, FPS, RANGES, SEG };
