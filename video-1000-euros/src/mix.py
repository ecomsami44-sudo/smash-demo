import json, os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

D = os.path.dirname(os.path.abspath(__file__))
SR = 44100
EV = json.load(open(os.path.join(D, 'out/events.json')))
TL = json.load(open(os.path.join(D, 'timeline.json')))
TOTAL = EV['total']
N = int(TOTAL * SR) + SR
RG = {r['n']: (r['start'], r['end']) for r in EV['ranges']}
SEG = {s['id']: s for s in TL['segments']}
rs = np.random.RandomState(7)

music = np.zeros((N, 2)); sfx = np.zeros((N, 2)); amb = np.zeros((N, 2)); vo = np.zeros((N, 2))

def mf(m): return 440.0 * 2 ** ((m - 69) / 12)
def env_adsr(n, a=.01, d=.1, s=.7, r=.2, sr=SR):
    a, d, r = int(a * sr), int(d * sr), int(r * sr); sus = max(0, n - a - d - r)
    e = np.concatenate([np.linspace(0, 1, max(a, 1)), np.linspace(1, s, max(d, 1)), np.full(sus, s), np.linspace(s, 0, max(r, 1))])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))
def lp(x, f, order=2): return sosfilt(butter(order, min(f, SR / 2 - 100) / (SR / 2), 'low', output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f / (SR / 2), 'high', output='sos'), x)
def bp(x, f1, f2, order=2): return sosfilt(butter(order, [f1 / (SR / 2), min(f2, SR / 2 - 100) / (SR / 2)], 'band', output='sos'), x)
def place(buf, t, x, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= len(buf): return
    if i < 0: x = x[-i:]; i = 0
    x = x[:len(buf) - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(x), 0] += x * g * l * 1.414; buf[i:i + len(x), 1] += x * g * r * 1.414
def saw(f, n, det=0): t = np.arange(n) / SR; return 2 * ((t * f * (1 + det)) % 1) - 1
def sq(f, n): t = np.arange(n) / SR; return np.sign(np.sin(2 * np.pi * f * t))
def sine(f, n, ph=0): t = np.arange(n) / SR; return np.sin(2 * np.pi * f * t + ph)
def noise(n): return rs.uniform(-1, 1, n)

# ---------------- instruments ----------------
def pluck(f, dur=.6, bright=.5):
    n = int(dur * SR); p = max(2, int(SR / f)); buf = rs.uniform(-1, 1, p) * 1.0
    buf = lp(buf, 1500 + 6000 * bright, 1) if p > 8 else buf
    out = np.zeros(n); b = buf.copy(); i = 0
    while i < n:
        k = min(p, n - i); out[i:i + k] = b[:k]
        b = .5 * (b + np.roll(b, -1)) * .996; i += k
    return out * np.linspace(1, .6, n)
def piano(f, dur=1.6, vel=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for h, a in [(1, 1), (2, .45), (3, .22), (4, .12), (5, .06)]:
        x += a * np.sin(2 * np.pi * f * h * (1 + .0004 * h * h) * t) * np.exp(-t * (1.6 + h * .9))
    x *= np.minimum(1, t / .004)
    return x * vel * .5
def bell(f, dur=2.0):
    n = int(dur * SR); t = np.arange(n) / SR
    m = np.sin(2 * np.pi * f * 3.5 * t) * 2.2 * np.exp(-t * 3)
    return np.sin(2 * np.pi * f * t + m) * np.exp(-t * 2.2) * np.minimum(1, t / .003) * .5
def pad(fs, dur, a=.6, r=.8, cut=1800):
    n = int(dur * SR); x = np.zeros(n)
    for f in fs:
        for d in (-.004, 0, .005): x += saw(f, n, d)
    x = lp(x, cut, 2) / (len(fs) * 3)
    return x * env_adsr(n, a, .2, .85, r)
def bass(f, dur, cut=600):
    n = int(dur * SR); x = saw(f, n) * .6 + sq(f / 2, n) * .4
    e = env_adsr(n, .005, .08, .6, .05)
    return lp(x, cut, 2) * e * .7
def brass(f, dur):
    n = int(dur * SR); x = saw(f, n) + saw(f, n, .006); t = np.arange(n) / SR
    y = np.zeros(n); seg = 2048
    for i in range(0, n, seg):
        c = 500 + 3500 * np.exp(-t[i] * 4); y[i:i + seg] = lp(x[i:i + seg], c, 1)
    return y * env_adsr(n, .03, .15, .6, .12) * .35
def kick(g=1):
    n = int(.45 * SR); t = np.arange(n) / SR; f = 45 + 110 * np.exp(-t * 28)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7); x[:200] += noise(200) * .3
    return x * g
def snare(g=1):
    n = int(.25 * SR); t = np.arange(n) / SR
    return (bp(noise(n), 1200, 8000) * np.exp(-t * 18) * .9 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * .5) * g
def clap(g=1):
    n = int(.3 * SR); t = np.arange(n) / SR; e = np.exp(-t * 20)
    for d in (.01, .02): e[int(d * SR):] += np.exp(-(t[:n - int(d * SR)]) * 40) * .6
    return bp(noise(n), 900, 5000) * e * .6 * g
def hat(g=1, open_=False):
    n = int((.25 if open_ else .06) * SR); t = np.arange(n) / SR
    return hp(noise(n), 7000) * np.exp(-t * (12 if open_ else 60)) * .35 * g
def tom(f=90, g=1):
    n = int(.6 * SR); t = np.arange(n) / SR; ff = f * (1 + .6 * np.exp(-t * 15))
    return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t * 5) * g

CH = {'Am': [57, 60, 64], 'F': [53, 57, 60], 'C': [48, 52, 55, 60], 'G': [55, 59, 62], 'Dm': [50, 53, 57], 'E': [52, 56, 59], 'Em': [52, 55, 59], 'Bb': [46, 50, 53]}
ROOT = {'Am': 45, 'F': 41, 'C': 36, 'G': 43, 'Dm': 38, 'E': 40, 'Em': 40, 'Bb': 46}
BPM = 100; B = 60 / BPM

def groove(t0, t1, prog, kick_on=True, clap_on=True, hats=True, stab=True, bassline=True, gain=1.0, arp=False):
    t = t0; bar = 0
    while t < t1 - .05:
        ch = prog[bar % len(prog)]
        for beat in range(4):
            tb = t + beat * B
            if tb >= t1: break
            if kick_on: place(music, tb, kick(.9 * gain))
            if clap_on and beat % 2 == 1: place(music, tb, clap(.7 * gain), pan=.1)
            if hats:
                place(music, tb + B / 2, hat(.8 * gain), pan=.3); place(music, tb, hat(.4 * gain), pan=.3)
            if bassline:
                f = mf(ROOT[ch]); place(music, tb, bass(f, B * .45), .55 * gain); place(music, tb + B / 2, bass(f * 2 if beat % 2 else f, B * .4), .4 * gain)
            if stab and beat in (0, 2):
                for m in CH[ch]: place(music, tb + (B / 2 if beat == 2 else 0), pluck(mf(m + 12), .5, .7), .18 * gain, pan=-.3)
            if arp:
                for k in range(4):
                    m = CH[ch][k % len(CH[ch])] + 24
                    place(music, tb + k * B / 4, pluck(mf(m), .3, .9), .09 * gain, pan=.35 * (1 if k % 2 else -1))
        t += 4 * B; bar += 1

def chords_pad(t0, t1, prog, bar_len=4 * B, gain=.25, cut=1500, octave=0):
    t = t0; i = 0
    while t < t1 - .05:
        d = min(bar_len, t1 - t) + .6
        place(music, t, pad([mf(m + octave) for m in CH[prog[i % len(prog)]]], d, .4, .6, cut), gain, pan=0)
        t += bar_len; i += 1

# ---------------- MUSIC by section ----------------
tLui = next(e['t'] for e in EV['ev'] if e['n'] == 'scratch')
# HOOK: energetic opener
place(music, 0, kick(1.2)); place(music, 0, pad([mf(m) for m in CH['C']], 1.5, .01, .8, 4000), .4)
groove(0.0, tLui, ['C', 'G', 'Am', 'F'], gain=.9, arp=True)
for i in range(6): place(music, .1 + i * .3, bell(mf(84 + [0, 4, 7, 12, 7, 4][i]), 1.0), .12, pan=(-.5 + i * .2))
# record scratch -> silence -> lonely phone
p0, p1 = RG['phone']
chords_pad(p0, p1 + .3, ['Am', 'F'], 2 * B * 2, .18, 1000)
for i, m in enumerate([69, 72, 76, 72, 69, 64, 67, 69]): place(music, p0 + .2 + i * B * .9, pluck(mf(m), .8, .4), .22, pan=-.2)
# SPREE: party groove
s0, s1 = RG['spree']
groove(s0, s1, ['C', 'G', 'Am', 'F'], gain=1.0, arp=True)
chords_pad(s0, s1, ['C', 'G', 'Am', 'F'], 4 * B, .12, 2500, 12)
# BAKERY: quirky pizzicato
b0, b1 = RG['bakery']
mel = [72, 74, 76, 72, 77, 76, 74, 71, 72, 76, 79, 77, 76, 74, 72, 71]
t = b0; i = 0
while t < b1 - .1:
    place(music, t, pluck(mf(mel[i % len(mel)]), .35, .6), .2, pan=.2)
    if i % 2 == 0: place(music, t, pluck(mf([48, 43, 45, 41][(i // 4) % 4]), .5, .3), .3, pan=-.2)
    if i % 4 == 2: place(music, t, hat(.6), pan=.4)
    t += B / 2; i += 1
# PRICES + PROFIT: tension pulse, rising
r0, r1 = RG['prices']; q0, q1 = RG['profit']
t = r0; i = 0
while t < q1:
    k = (t - r0) / (q1 - r0)
    f = mf([45, 45, 41, 43][(i // 8) % 4]); place(music, t, bass(f, B * .4, 400 + 1200 * k), .5)
    if i % 2 == 0: place(music, t, kick(.6 + .3 * k))
    if i % 4 == 2: place(music, t, snare(.35 + .3 * k), pan=.1)
    place(music, t, hat(.5), pan=.35)
    t += B / 2; i += 1
chords_pad(r0, q1, ['Am', 'F', 'Dm', 'E'], 4 * B, .2, 1200)
# villain brass on profit
for j, (m, d) in enumerate([(45, .9), (48, .45), (51, .45), (50, 1.2), (45, .9), (44, .45), (45, 1.4)]):
    pass
tb = q0 + .1
for m, d in [(57, .6), (60, .3), (63, .3), (62, .9), (57, .6), (56, .3), (57, 1.2), (57, .6), (60, .3), (63, .3), (65, .9), (64, 1.5)]:
    place(music, tb, brass(mf(m - 12), d * 1.1), .55, pan=-.1); place(music, tb, brass(mf(m), d * 1.1), .25, pan=.1); tb += d
# NIGHT: soft piano arpeggio
n0, n1 = RG['night']
t = n0 + .1; i = 0
prog = ['Am', 'F', 'C', 'G']
while t < n1:
    ch = prog[(i // 8) % 4]; notes = CH[ch] + [CH[ch][1] + 12]
    place(music, t, piano(mf(notes[[0, 1, 2, 3, 2, 1, 2, 3][i % 8]] + 12), 1.8, .7), .35, pan=.15)
    if i % 8 == 0: place(music, t, piano(mf(ROOT[ch] + 12), 2.5, .9), .35, pan=-.15)
    t += B / 2; i += 1
chords_pad(n0, n1, prog, 4 * B, .1, 900)
# FINE: suspense drone + heartbeat feel
f0, f1 = RG['fine']
n = int((f1 - f0 + .5) * SR); tt = np.arange(n) / SR
drone = (saw(mf(33), n) + saw(mf(33), n, .003) + .5 * saw(mf(40), n)) / 2.5
drone = lp(drone, 300, 2) * np.minimum(1, tt / 1.5) * (.6 + .4 * tt / tt[-1])
place(music, f0, drone, .5)
hi = sine(mf(88), n) * .2 * np.minimum(1, tt / 3) * (0.5 + .5 * np.sin(2 * np.pi * 6 * tt)); place(music, f0, hi, .15, pan=.3)
# LETTERS: dramatic drums
l0, l1 = RG['letters']
t = l0; i = 0
while t < l1:
    if i % 4 == 0: place(music, t, tom(70, .9)); place(music, t, kick(.8))
    if i % 4 == 3: place(music, t, tom(110, .5), pan=.2)
    if i % 2 == 1: place(music, t, hat(.5), pan=.35)
    if i % 8 == 0:
        ch = ['Am', 'Dm', 'E', 'Am'][(i // 8) % 4]
        for m in CH[ch]: place(music, t, brass(mf(m), B * 1.8), .25)
        place(music, t, bass(mf(ROOT[ch]), B * 3.5, 500), .5)
    t += B / 2; i += 1
chords_pad(l0, l1, ['Am', 'Dm', 'E', 'Am'], 4 * B, .18, 1400)
# DEBT: sad piano, then warm swell on "sauf lui"
d0, d1 = RG['debt']; tS18 = SEG['s18']['start']
for j, (m, dt) in enumerate([(69, 0), (67, .9), (65, 1.8), (64, 2.7), (60, 3.6)]):
    place(music, d0 + .2 + dt, piano(mf(m), 2.5, .7), .4, pan=.1); place(music, d0 + .2 + dt, piano(mf(m - 24), 2.5, .6), .3, pan=-.1)
chords_pad(d0, tS18, ['Dm', 'Am'], 2.4, .15, 800)
place(music, tS18 - .1, pad([mf(m) for m in [48, 55, 60, 64, 67]], 2.0 + (d1 - tS18), 1.0, 1.0, 3000), .4)
for i, m in enumerate([72, 76, 79, 84]): place(music, tS18 + .3 + i * .25, bell(mf(m), 2.5), .14, pan=-.4 + i * .25)
# LAST: magical celesta
a0, a1 = RG['last']
t = a0; i = 0
seq = [76, 79, 84, 88, 84, 79, 77, 81, 84, 89, 84, 81]
while t < a1:
    place(music, t, bell(mf(seq[i % len(seq)]), 1.4), .16, pan=(.4 if i % 2 else -.4)); t += B / 2; i += 1
chords_pad(a0, a1 + .5, ['C', 'F', 'Am', 'G'], 4 * B * .75, .2, 2200, 12)
# REVEAL: riser -> boom -> epic
v0, v1 = RG['reveal']; tExp = next(e['t'] for e in EV['ev'] if e['n'] == 'boom' and e['t'] > 72)
n = int((tExp - v0) * SR); tt = np.arange(n) / SR
riser = lp(noise(n), 1, 1) * 0
f = 80 + 900 * (tt / tt[-1]) ** 2
riser = (np.sin(2 * np.pi * np.cumsum(f) / SR) * .4 + hp(noise(n), 2000) * .3) * (tt / tt[-1]) ** 2
place(music, v0, riser, .5)
place(music, v0, pad([mf(m) for m in [45, 52, 57]], tExp - v0 + .2, 2.0, .2, 900), .3)
# epic after
place(music, tExp, pad([mf(m) for m in [33, 45, 52, 57, 60]], v1 - tExp + 1.5, .05, 1.2, 1600), .5)
t = tExp; i = 0
while t < v1:
    if i % 4 == 0: place(music, t, tom(60, 1.0)); place(music, t, kick(.9))
    if i % 4 == 2: place(music, t, tom(80, .6), pan=-.2)
    t += B; i += 1
for i, m in enumerate([69, 72, 76, 74, 72, 71, 69, 76, 77, 76, 74, 72]):
    place(music, tExp + 1.2 + i * B * 1.2, bell(mf(m + 12), 2.4), .15, pan=.3 * np.sin(i))
# END: final hit + sustained chord
e0 = RG['end'][0]
place(music, e0, kick(1.2)); place(music, e0, tom(55, 1.0))
place(music, e0, pad([mf(m) for m in [45, 57, 60, 64, 69]], TOTAL - e0 + .5, .05, 2.5, 2400), .45)
for i, m in enumerate([81, 84, 88, 93]): place(music, e0 + .2 + i * .18, bell(mf(m), 3.0), .13, pan=-.4 + i * .27)

# kill music briefly at "LUI" (record scratch moment)
g = np.ones(N); a, b = int(tLui * SR), int((tLui + .45) * SR); g[a:b] = 0; g[b:b + int(.3 * SR)] = np.linspace(0, 1, int(.3 * SR))
music *= g[:, None]

# ---------------- SFX ----------------
def S(name):
    if name == 'ping':
        n = int(.35 * SR); t = np.arange(n) / SR
        return (np.sin(2 * np.pi * 1318 * t) * (t < .08) + np.sin(2 * np.pi * 1760 * t) * (t >= .08)) * np.exp(-t * 10) * .6
    if name == 'whoosh':
        n = int(.55 * SR); t = np.arange(n) / SR; x = noise(n); y = np.zeros(n)
        for i in range(0, n, 1024): c = 300 + 3500 * np.sin(np.pi * t[i] / t[-1]); y[i:i + 1024] = bp(x[i:i + 1024], c * .6, c * 1.4, 1)
        return y * np.sin(np.pi * t / t[-1]) ** 2 * 1.2
    if name == 'coins':
        out = np.zeros(int(1.6 * SR))
        for k in range(16):
            i = int(rs.uniform(0, 1.4) * SR); m = int(.12 * SR); t = np.arange(m) / SR; f = rs.uniform(3000, 6000)
            out[i:i + m] += (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 1.5 * t)) * np.exp(-t * 40) * .25
        return out
    if name == 'kaching':
        n = int(1.0 * SR); t = np.arange(n) / SR; x = noise(n) * np.exp(-t * 60) * .5
        x[int(.08 * SR):] += sum(np.sin(2 * np.pi * f * t[:n - int(.08 * SR)]) * a for f, a in [(2093, .4), (2637, .3), (3136, .25), (4186, .15)]) * np.exp(-t[:n - int(.08 * SR)] * 4)
        return x * .7
    if name == 'scratch':
        n = int(.45 * SR); t = np.arange(n) / SR; f = 600 + 500 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 2)
        return (bp(noise(n), 400, 3000) * .6 + saw(1, n) * 0 + np.sin(2 * np.pi * np.cumsum(f) / SR) * .3) * np.exp(-t * 3) * .9
    if name == 'boom':
        n = int(2.5 * SR); t = np.arange(n) / SR; f = 30 + 70 * np.exp(-t * 6)
        return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6) + lp(noise(n), 400) * np.exp(-t * 3) * .8) * .9
    if name == 'sting':
        n = int(1.0 * SR); t = np.arange(n) / SR; x = np.zeros(n)
        for f in (mf(62), mf(68), mf(74)): x += saw(f, n) + saw(f, n, .01)
        return lp(x, 2500) * np.exp(-t * 3) * .12 + S('boom')[:n] * .3
    if name == 'pop':
        n = int(.2 * SR); t = np.arange(n) / SR; f = 900 * np.exp(-t * 20) + 200
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 25) * .7
    if name == 'cork':
        n = int(1.2 * SR); t = np.arange(n) / SR; x = S('pop')[:n].copy() if False else np.zeros(n)
        p = S('pop'); x[:len(p)] += p * 1.3; x += hp(noise(n), 3000) * np.exp(-t * 3) * .35 * (t > .05)
        return x
    if name == 'scooter':
        n = int(1.8 * SR); t = np.arange(n) / SR; f = 95 * (1.25 - .5 / (1 + np.exp(-(t - .9) * 6)))
        x = lp(saw(1, n) * 0 + np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 1500) * np.exp(-((t - .9) ** 2) / .25) * .45
        return x
    if name == 'steps':
        out = np.zeros(int(2.6 * SR))
        for k in range(8): i = int(k * .32 * SR); m = int(.08 * SR); tt = np.arange(m) / SR; out[i:i + m] += lp(noise(m), 800) * np.exp(-tt * 50) * .6
        return out
    if name == 'bell':
        return bell(mf(88), 1.5) * .7 + bell(mf(91), 1.5)[: int(1.5 * SR)] * .4
    if name == 'stamp':
        n = int(.4 * SR); t = np.arange(n) / SR
        return (np.sin(2 * np.pi * 70 * t) * np.exp(-t * 18) + lp(noise(n), 2000) * np.exp(-t * 40) * .6) * .9
    if name == 'paper':
        n = int(.5 * SR); t = np.arange(n) / SR; x = bp(noise(n), 2000, 9000) * (np.abs(np.sin(2 * np.pi * 14 * t)) ** 3)
        return x * np.sin(np.pi * t / t[-1]) * .7
    if name == 'slot':
        out = np.zeros(int(.9 * SR))
        for k in range(10): i = int(k * .07 * SR); m = int(.03 * SR); tt = np.arange(m) / SR; out[i:i + m] += hp(noise(m), 2500) * np.exp(-tt * 120) * .5
        return out
    if name == 'tick':
        n = int(.05 * SR); t = np.arange(n) / SR; return hp(noise(n), 3000) * np.exp(-t * 150) * .7
    if name == 'riser':
        n = int(2.0 * SR); t = np.arange(n) / SR; f = 200 + 1600 * (t / t[-1]) ** 2
        return (np.sin(2 * np.pi * np.cumsum(f) / SR) * .3 + hp(noise(n), 3000) * .3) * (t / t[-1]) ** 2
    if name == 'marker':
        n = int(.9 * SR); t = np.arange(n) / SR; return bp(noise(n), 1500, 6000) * (np.abs(np.sin(2 * np.pi * 5 * t)) ** 2) * .4
    if name == 'clock':
        n = int(.06 * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * 2500 * t) * np.exp(-t * 120)) * .6
    if name == 'firework':
        n = int(1.2 * SR); t = np.arange(n) / SR; x = lp(noise(n), 900) * np.exp(-t * 6) * .8
        for k in range(20): i = int(rs.uniform(.1, 1.0) * SR); m = int(.02 * SR); x[i:i + m] += noise(m) * .3
        return x
    if name == 'calc':
        out = np.zeros(int(1.2 * SR))
        for k in range(6): i = int(k * .17 * SR); m = int(.05 * SR); tt = np.arange(m) / SR; out[i:i + m] += np.sin(2 * np.pi * 1900 * tt) * np.exp(-tt * 80) * .4
        return out
    if name == 'scribble':
        n = int(4.0 * SR); t = np.arange(n) / SR; return bp(noise(n), 2500, 8000) * (np.abs(np.sin(2 * np.pi * 3.3 * t)) ** 2) * .3 * (np.sin(2 * np.pi * .7 * t) > -.6)
    if name == 'heart':
        out = np.zeros(int(2.4 * SR))
        for k in range(3):
            for off, a in ((0, 1), (.22, .7)):
                i = int((k * .8 + off) * SR); m = int(.2 * SR); tt = np.arange(m) / SR; out[i:i + m] += np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 18) * a
        return out
    if name == 'swish':
        n = int(.25 * SR); t = np.arange(n) / SR; return bp(noise(n), 1500, 6000) * np.sin(np.pi * t / t[-1]) ** 2 * .5
    if name == 'thunder':
        n = int(4.0 * SR); t = np.arange(n) / SR; x = lp(noise(n), 250, 2) * 3
        x *= (np.exp(-t * 1.0) + .5 * np.exp(-((t - .6) ** 2) / .05)); x[:int(.12 * SR)] += hp(noise(int(.12 * SR)), 1500) * .5
        return x * .7
    if name == 'shimmer':
        n = int(3.0 * SR); t = np.arange(n) / SR; x = np.zeros(n)
        for k in range(12): x += np.sin(2 * np.pi * mf(84 + [0, 4, 7, 12][k % 4]) * t + k) * np.exp(-((t - k * .12 - .3) ** 2) / .3) * .1
        return x * np.minimum(1, t / .3)
    if name == 'chime':
        x = np.zeros(int(3.0 * SR))
        for i, m in enumerate([84, 88, 91, 96, 91, 96, 100]): b = bell(mf(m), 1.6); j = int(i * .16 * SR); x[j:j + len(b)] += b[:len(x) - j] * .5
        return x
    if name == 'crowd':
        n = int(3.5 * SR); t = np.arange(n) / SR; x = bp(noise(n), 300, 2500) * (1 + .5 * np.sin(2 * np.pi * 3 * t + np.sin(2 * np.pi * .7 * t)))
        for k in range(10): i = int(rs.uniform(0, 3) * SR); m = int(.3 * SR); tt = np.arange(m) / SR; x[i:i + m] += np.sin(2 * np.pi * rs.uniform(300, 600) * tt * (1 + tt)) * np.sin(np.pi * tt / tt[-1]) * .25
        return x * np.minimum(1, t / .2) * np.minimum(1, (t[-1] - t) / .8) * .5
    if name == 'rain':
        n = int((RG['debt'][1] - RG['debt'][0] + 1.5) * SR); t = np.arange(n) / SR
        return (hp(noise(n), 2000) * .35 + lp(noise(n), 500) * .25) * np.minimum(1, t / 1) * np.minimum(1, (t[-1] - t) / 1.5)
    raise KeyError(name)

cache = {}
for e in EV['ev']:
    nm = e['n']
    x = S(nm) if nm in ('coins', 'firework', 'crowd') or nm not in cache else cache[nm]
    cache[nm] = x
    pan = rs.uniform(-.35, .35)
    place(sfx if nm not in ('rain', 'crowd') else amb, e['t'], x, e['g'], pan)

# ---------------- VO ----------------
vol = np.zeros(N)
for s in TL['segments']:
    x, sr = sf.read(os.path.join(D, 'audio/vo', s['id'] + '.wav'))
    # light EQ: presence + warmth, slight compression
    x = x + .25 * bp(x, 2500, 6000) + .15 * lp(x, 200)
    x = np.tanh(x * 1.6) / np.tanh(1.6)
    pan = {'N': 0, 'H': -.12, 'B': .15, 'W': .18, 'M': -.18}[s['spk']]
    place(vo, s['start'], x, .95, pan)
    i = int(s['start'] * SR); vol[i:i + len(x)] = 1
# smooth ducking envelope
k = int(.25 * SR); kern = np.ones(k) / k; duck = np.convolve(vol, kern, 'same')
music *= (1 - .55 * duck)[:, None]; sfx *= (1 - .25 * duck)[:, None]

# reverb (room) for music + sfx
ir_n = int(2.2 * SR); tt = np.arange(ir_n) / SR
irL = noise(ir_n) * np.exp(-tt * 3.2); irR = noise(ir_n) * np.exp(-tt * 3.2); irL = lp(irL, 5000); irR = lp(irR, 5000)
irL /= np.sqrt(np.sum(irL ** 2)); irR /= np.sqrt(np.sum(irR ** 2))
def reverb(x, wet):
    return x + wet * np.stack([fftconvolve(x[:, 0], irL)[:len(x)], fftconvolve(x[:, 1], irR)[:len(x)]], 1)
music = reverb(music, .35); sfx = reverb(sfx, .2); vo = reverb(vo, .06)

def norm(x, peak): m = np.max(np.abs(x)); return x / m * peak if m > 0 else x
mix = norm(music, .42) + norm(sfx, .5) + norm(amb, .18) + norm(vo, .9)
mix = mix[:int(TOTAL * SR)]
fo = int(.8 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1) * .95
sf.write(os.path.join(D, 'out/mix.wav'), mix.astype(np.float32), SR)
sf.write(os.path.join(D, 'out/music_only.wav'), norm(music, .9)[:int(TOTAL * SR)].astype(np.float32), SR)
print('mix ok', mix.shape[0] / SR)
