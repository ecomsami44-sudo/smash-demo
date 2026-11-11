# « Dans cette ville, tout le monde reçoit 1 000 €… sauf lui. »

Mini-film d'animation 2D fictif — format YouTube Shorts (1080×1920, 30 i/s, 90,5 s, H.264 + AAC 48 kHz, -14 LUFS).

- `dans-cette-ville-1000-euros-sauf-lui.mp4` : vidéo finale prête à publier
- `apercu-planche.png` : planche de 20 images extraites du film
- `src/` : sources pour regénérer le film

## Chaîne de production
1. `tts.py` — voix off française neuronale (Piper via sherpa-onnx : narrateur « tom », Léo « upmc/pierre », boulangère « siwis »), calcule `timeline.json` (horaires + enveloppe de lèvres).
2. `render/render.js` — animation vectorielle image par image (@napi-rs/canvas) : personnages, décors, caméra, sous-titres mot à mot synchronisés. `node render.js events` puis `node render.js part <i> 4`.
3. `mix.py` — musique composée par synthèse (sections calées sur les scènes), ~70 bruitages, ducking sous la voix, réverbération.
4. ffmpeg — concaténation, mixage, normalisation `loudnorm=I=-14`.
