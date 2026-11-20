# makefun-gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/deelyy78/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/deelyy78/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Panels is a GTA 6-style cover art maker that runs entirely offline in a desktop browser. Load your own photos into a multi-panel poster layout (quad, trio, duo or full-bleed hero), frame each panel with zoom and pan — by slider or by dragging the cover itself — wash the photography in one of five colour grades (Vice Sunset, Neon Nights, Golden Hour, Midnight Chrome, Newsprint Grit), add drawn decor (a sun disc with palm silhouettes, or a lit skyline), set the bold condensed title and caption lettering, and export a share-ready PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080. Photos are read on your own machine and never uploaded; the app is plain static files under `app/` with no build step and no network request, and `main.ts` hands it in by copying `app/` and `screenshots/` to the output directory and writing the dossier with the kit's vendored library.

## Run it

```sh
node serve.ts
# then open http://localhost:8080 in desktop Chrome
# hand-in build: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=mk8wvjdp&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
