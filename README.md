# 01 — Neon Serpent

Glowing blue 3D serpent: 59 segmented body sections (sphere + emissive scale ring + dorsal spike), a modelled head
(skull, snout, hinged jaw, fangs, horns, glowing eyes, flicking forked tongue), a glowing tail tip and a GPU particle shader.

## Run
Open `index.html` in a modern browser (Chrome/Edge/Firefox/Safari). No server or internet needed:
Three.js r149 is bundled in `assets/`. Press **F** or double-click for fullscreen.

## How it moves
- Head is a damped spring chasing the pointer (small offset, slight overshoot = inertia).
- Body is a follow-the-leader chain with a travelling sine wave; wave grows when idle, tightens at speed.
- Idle (pointer still >0.7 s): head traces a slow figure-eight so the body coils; tongue flicks, jaw breathes.
- Speed opens the jaw, brightens the energy pulse running down the rings, and raises particle emission.

## 15-second demo
- `index.html?demo` plays the scripted path: 0–3 s intro + idle, 3–7 s figure-eight, 7–11 s fast sweeps, 11–15 s spiral dash then idle.
- `index.html?demo&record` additionally records the canvas for 15 s and downloads `neon_serpent_preview.webm`
  (needs Chrome/Edge/Firefox). Put that file in `preview/`.

## Status
Syntax-checked only. Not yet run in a browser by the author: visual tuning and the recorded video are still pending.
