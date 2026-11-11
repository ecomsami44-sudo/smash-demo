import json, os, sherpa_onnx, numpy as np, soundfile as sf

D = os.path.dirname(os.path.abspath(__file__))
V = os.path.join(D, "voices")
OUT = os.path.join(D, "audio", "vo")
os.makedirs(OUT, exist_ok=True)

def mk(name):
    p = os.path.join(V, f"vits-piper-fr_FR-{name}")
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f"{p}/fr_FR-{name}.onnx", tokens=f"{p}/tokens.txt",
             data_dir=f"{p}/espeak-ng-data", noise_scale=0.6, noise_scale_w=0.75), num_threads=4))
    return sherpa_onnx.OfflineTts(cfg)

eng = {"tom": mk("tom-medium"), "upmc": mk("upmc-medium"), "siwis": mk("siwis-medium")}
# speaker -> (engine, sid, speed)
SPK = {"N": ("tom", 0, 1.0), "H": ("upmc", 1, 1.02), "B": ("siwis", 0, 1.0),
       "W": ("siwis", 0, 1.12), "M": ("upmc", 0, 1.12)}

# (id, speaker, scene, tts_text, caption, pause_after)
SEG = [
 ("s01","N","hook","Ce matin-là, tout le monde a reçu mille euros.","Ce matin-là, tout le monde a reçu 1 000 €.",0.25),
 ("s02","N","hook","Tout le monde… sauf lui.","Tout le monde… sauf LUI.",0.35),
 ("s02b","N","phone","Son téléphone, lui, reste muet.","Son téléphone, lui, reste muet.",0.3),
 ("s03","H","phone","Zéro ? Sérieusement ?","Zéro ? Sérieusement ?",0.3),
 ("s04","N","spree","Dans la rue, c'est la folie. Les gens achètent tout. Des télés. Des scooters. Du champagne.","Dans la rue, c'est la folie. Les gens achètent tout. Des télés. Des scooters. Du champagne.",0.3),
 ("s04b","N","spree","Les commerçants n'en croient pas leurs yeux.","Les commerçants n'en croient pas leurs yeux.",0.35),
 ("s05","N","bakery","Léo, lui, va simplement acheter son pain.","Léo, lui, va simplement acheter son pain.",0.15),
 ("s06","B","bakery","La baguette ? Deux euros.","La baguette ? 2 €.",0.15),
 ("s07","H","bakery","Deux euros ? Hier, c'était un euro !","2 € ?! Hier, c'était 1 € !",0.12),
 ("s08","B","bakery","Tout le monde a de l'argent, maintenant.","Tout le monde a de l'argent, maintenant.",0.3),
 ("s09","N","prices","Le lendemain, le loyer passe de six cents à neuf cents euros. Puis l'essence augmente. Puis tout le reste.","Le lendemain, le loyer passe de 600 € à 900 €. Puis l'essence augmente. Puis tout le reste.",0.25),
 ("s10","N","profit","Et certains en profitent. Le propriétaire rachète les immeubles. Le vendeur triple ses prix.","Et certains en profitent. Le propriétaire rachète les immeubles. Le vendeur triple ses prix.",0.3),
 ("s11","N","night","Léo, lui, n'a rien. Alors il fait la seule chose possible. Il observe. Il compte. Il lit.","Léo, lui, n'a rien. Alors il fait la seule chose possible. Il observe. Il compte. Il lit.",0.2),
 ("s11b","N","night","Chaque soir, il note tout dans son carnet. Les prix. Les dates. Les montants.","Chaque soir, il note tout dans son carnet. Les prix. Les dates. Les montants.",0.3),
 ("s12","N","fine","Et dans le message de la mairie, il trouve une ligne minuscule. Que personne n'a lue.","Et dans le message de la mairie, il trouve une ligne minuscule. Que personne n'a lue.",0.2),
 ("s13","H","fine","Avance… remboursable ?","« Avance… remboursable » ?",0.45),
 ("s14","N","letters","Trente jours plus tard, une lettre arrive. Dans chaque boîte aux lettres.","30 jours plus tard, une lettre arrive. Dans chaque boîte aux lettres.",0.15),
 ("s15","W","letters","Mille deux cents euros à rembourser ?!","1 200 € à rembourser ?!",0.1),
 ("s16","M","letters","Mais j'ai tout dépensé !","Mais j'ai tout dépensé !",0.3),
 ("s16b","W","letters","Comment on va payer ?","Comment on va payer ?!",0.4),
 ("s17","N","debt","Les prix ont doublé. Les poches sont vides. Toute la ville est endettée.","Les prix ont doublé. Les poches sont vides. Toute la ville est endettée.",0.2),
 ("s18","N","debt","Toute la ville… sauf lui.","Toute la ville… sauf LUI.",0.5),
 ("s19","N","last","Puis une dernière lettre arrive. Juste pour Léo.","Puis une dernière lettre arrive. Juste pour Léo.",0.2),
 ("s20","H","last","Félicitations… Vous étiez le groupe témoin ?","« Félicitations. Vous étiez le GROUPE TÉMOIN. »",0.5),
 ("s21","N","reveal","Car cette ville n'a jamais été une vraie ville. C'était une expérience.","Car cette ville n'a jamais été une vraie ville. C'était une EXPÉRIENCE.",0.35),
 ("s21b","N","reveal","Mille euros offerts, pour savoir une seule chose. Qui garderait la tête froide.","1 000 € offerts, pour savoir une seule chose : qui garderait la tête froide.",0.4),
 ("s22","N","reveal","Et la prochaine ville choisie… c'est peut-être la tienne.","Et la prochaine ville choisie… c'est peut-être LA TIENNE.",0.4),
 ("s23","N","end","Et toi… tu aurais dépensé ? Dis-le en commentaire.","Et toi… tu aurais dépensé ? Dis-le en commentaire.",0.0),
]

SR = 44100
START = 0.15
t = START
tl = []
for sid, spk, scene, txt, cap, pause in SEG:
    e, s, sp = SPK[spk]
    a = eng[e].generate(txt, sid=s, speed=sp)
    x = np.array(a.samples, dtype=np.float32)
    # trim silence
    thr = 0.01 * np.max(np.abs(x))
    nz = np.where(np.abs(x) > thr)[0]
    x = x[max(0, nz[0] - 200): nz[-1] + 800]
    # resample to 44.1k (linear)
    n = int(len(x) * SR / a.sample_rate)
    x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    sf.write(os.path.join(OUT, sid + ".wav"), x, SR)
    dur = len(x) / SR
    # amplitude envelope at 30 fps for lip sync
    hop = SR // 30
    env = [float(np.sqrt(np.mean(x[i:i + hop] ** 2))) for i in range(0, len(x), hop)]
    m = max(env) or 1
    env = [round(min(1, v / m * 1.4), 3) for v in env]
    tl.append(dict(id=sid, spk=spk, scene=scene, cap=cap, start=round(t, 3), dur=round(dur, 3), env=env))
    t += dur + pause * 0.8
    print(sid, spk, round(dur, 2), round(t, 2))

json.dump(dict(segments=tl, voEnd=round(t, 3)), open(os.path.join(D, "timeline.json"), "w"), ensure_ascii=False)
print("total VO", t)
