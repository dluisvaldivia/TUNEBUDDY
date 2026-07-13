# TuneBuddy

A chromatic instrument tuner that runs entirely in the browser (React + Web
Audio API). No backend — designed for static hosting on GitHub Pages.

## Layout

This is a single Vite + React + TS project rooted at the repo root. Key
source:

- `src/tuner/` — pure TypeScript pitch-detection engine, no UI dependencies:
  `fft.ts`, `pitch.ts` (Hann window → zero-padded FFT → log-domain Harmonic
  Product Spectrum → tonality gate), `stabilizer.ts` (requires several
  agreeing frames before a pitch is reported, to reject noise jitter),
  `notes.ts` (frequency ↔ note/cents math), `tunings.ts` (preset tunings,
  e.g. ukulele standard gCEA), `audioInput.ts` (mic capture via
  `getUserMedia`/`AnalyserNode`), `useTuner.ts` (React hook — the only
  surface the UI touches).
- `src/metronome/` — Web Audio metronome engine (`metronome.ts`, lookahead
  scheduler with accented beat-1 beep) and its React hook (`useMetronome.ts`).
- `src/App.tsx` / `src/App.css` — the UI: tuning-gauge, note display, preset
  dropdown, clickable string circles, and the circular-reveal overlay that
  opens `src/MetronomeView.tsx` (pulsing beat circle, BPM/measure controls).

## Commands

```sh
npm install
npm run dev      # dev server
npm test         # vitest — synthetic-signal tests, no mic needed
npm run build    # production build (tsc -b && vite build)
npm run lint     # oxlint
```

## Conventions

- The pitch-detection engine (`src/tuner/`) must stay UI-agnostic — it is an
  independent reimplementation of GuitarTuner's approach (FFT + HPS), not a
  port, since this project is MIT-licensed and GuitarTuner is GPL-2.0. Do not
  copy code from GuitarTuner; algorithms are fine, code is not.
- Deployment is via [.github/workflows/deploy.yml](.github/workflows/deploy.yml),
  which builds and publishes to GitHub Pages on push to `main`.
- Never say Claude is a co-author. Do not add a `Co-Authored-By: Claude` (or
  any AI attribution) trailer to commit messages or PR descriptions.
