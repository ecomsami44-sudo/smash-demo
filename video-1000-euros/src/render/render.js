// usage: node render.js preview t1 t2 ...   |  node render.js part idx n  | node render.js events
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const NM = path.join(__dirname, 'node_modules/@fontsource');
GlobalFonts.registerFromPath(`${NM}/luckiest-guy/files/luckiest-guy-latin-400-normal.woff2`, 'Lucky');
GlobalFonts.registerFromPath(`${NM}/luckiest-guy/files/luckiest-guy-latin-ext-400-normal.woff2`, 'Lucky');
GlobalFonts.registerFromPath(`${NM}/caveat/files/caveat-latin-700-normal.woff2`, 'Hand');
for (const w of ['Black', 'ExtraBold', 'Bold', 'SemiBold', 'Regular']) GlobalFonts.registerFromPath(`/usr/share/fonts/opentype/inter/Inter-${w}.otf`, 'Inter');
const S = require('./scenes');
const W = 1080, H = 1920;
const mode = process.argv[2];
const OUTD = path.join(__dirname, '..', 'out'); fs.mkdirSync(OUTD, { recursive: true });

if (mode === 'events') { fs.writeFileSync(path.join(OUTD, 'events.json'), JSON.stringify({ ev: S.sfxEvents(), total: S.TOTAL, ranges: S.RANGES })); console.log('events ok'); }
else if (mode === 'preview') {
  const ts = process.argv.slice(3).map(Number);
  const scale = .25; const cols = Math.min(6, ts.length); const rows = Math.ceil(ts.length / cols);
  const sheet = createCanvas(W * scale * cols, H * scale * rows); const sc = sheet.getContext('2d');
  const cv = createCanvas(W, H); const ctx = cv.getContext('2d');
  ts.forEach((t, i) => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); S.drawFrame(ctx, t, createCanvas); sc.drawImage(cv, (i % cols) * W * scale, Math.floor(i / cols) * H * scale, W * scale, H * scale); sc.fillStyle = '#fff'; sc.font = '24px Inter'; sc.fillText(t.toFixed(2), (i % cols) * W * scale + 8, Math.floor(i / cols) * H * scale + 28); });
  fs.writeFileSync(path.join(OUTD, process.env.NAME || 'preview.png'), sheet.toBuffer('image/png'));
  console.log('preview ok');
} else if (mode === 'part') {
  const idx = +process.argv[3], n = +process.argv[4];
  const frames = Math.round(S.TOTAL * S.FPS); const per = Math.ceil(frames / n);
  const f0 = idx * per, f1 = Math.min(frames, f0 + per);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(S.FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', path.join(OUTD, `part${idx}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const cv = createCanvas(W, H); const ctx = cv.getContext('2d');
  (async () => {
    const t0 = Date.now();
    for (let f = f0; f < f1; f++) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      S.drawFrame(ctx, f / S.FPS, createCanvas);
      const buf = ctx.getImageData(0, 0, W, H).data;
      if (!ff.stdin.write(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength))) await new Promise(r => ff.stdin.once('drain', r));
      if ((f - f0) % 150 === 0) console.log(`part${idx} frame ${f - f0}/${f1 - f0} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); ff.on('close', c => console.log(`part${idx} done`, c));
  })();
}
