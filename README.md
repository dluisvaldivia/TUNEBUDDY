# TuneBuddy

Visit the app: [TuneBuddy](https://dluisvaldivia.github.io/TUNEBUDDY)

A chromatic instrument tuner that runs entirely in your browser. Point your
microphone at a guitar (or any instrument), and TuneBuddy shows the nearest
note.

The pitch-detection approach is inspired by
[TomSchimansky/GuitarTuner](https://github.com/TomSchimansky/GuitarTuner)
(FFT + Harmonic Product Spectrum) but is an independent TypeScript
implementation built on the Web Audio API — no backend, no install.

## How it works

1. `getUserMedia` captures raw microphone audio (voice processing disabled so
   sustained instrument tones aren't filtered out).
2. An `AnalyserNode` provides a rolling window of time-domain samples.
3. The engine applies a Hann window, zero-pads, and runs an FFT
   ([src/tuner/fft.ts](src/tuner/fft.ts)).
4. A log-domain Harmonic Product Spectrum finds the fundamental frequency,
   suppressing overtones ([src/tuner/pitch.ts](src/tuner/pitch.ts)).
5. The frequency is mapped to the nearest note and a cent deviation via
   `12·log2(f/A4) + 69` ([src/tuner/notes.ts](src/tuner/notes.ts)).
6. Tuning presets ([src/tuner/tunings.ts](src/tuner/tunings.ts)) pin the gauge
   to a chosen string's note instead of the nearest chromatic note. Ukulele
   standard (gCEA) ships as the first preset: the app auto-highlights the
   nearest string, and clicking a string circle locks it so the needle shows
   whether to tighten (flat) or loosen (sharp).

The engine ([src/tuner/](src/tuner/)) is pure TypeScript with zero UI
dependencies — the React app talks to it only through the
[useTuner](src/tuner/useTuner.ts) hook, so the UI can be restyled or replaced
freely.

## Development

```sh
npm install
npm run dev      # dev server at http://localhost:5173
npm test         # engine tests (synthetic signals, no mic needed)
npm run build    # production build in dist/
npm run preview  # serve the production build locally
```

Microphone access requires a secure context: `localhost` and HTTPS both work.
