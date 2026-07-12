import { magnitudeSpectrum } from './fft'

export interface PitchOptions {
  /** Readings below this frequency are treated as noise (Hz). */
  minFrequency?: number
  /** Readings above this frequency are ignored (Hz). */
  maxFrequency?: number
  /** Number of harmonics folded into the Harmonic Product Spectrum. */
  harmonics?: number
  /** Zero-padding factor (power of two) to increase FFT bin resolution. */
  zeroPadFactor?: number
  /** RMS level below which the signal counts as silence. */
  volumeThreshold?: number
  /**
   * Minimum spectral peak-to-mean ratio for the signal to count as tonal.
   * Instrument tones concentrate energy in a few bins (ratio in the
   * hundreds); broadband room noise is flat (ratio < ~10) and is rejected.
   */
  minTonality?: number
}

const DEFAULTS: Required<PitchOptions> = {
  minFrequency: 50,
  maxFrequency: 1500,
  harmonics: 5,
  zeroPadFactor: 2,
  volumeThreshold: 0.01,
  minTonality: 20,
}

export function rms(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}

function nextPowerOfTwo(n: number): number {
  return 2 ** Math.ceil(Math.log2(n))
}

/**
 * Detect the fundamental frequency of a mono signal, or null when the
 * signal is silence/noise. Hann window + zero-padded FFT, then a Harmonic
 * Product Spectrum picks the fundamental over its overtones; the peak is
 * refined with parabolic interpolation between neighboring bins.
 */
export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
  options: PitchOptions = {},
): number | null {
  const opts = { ...DEFAULTS, ...options }
  if (samples.length < 2 || rms(samples) < opts.volumeThreshold) {
    return null
  }

  const padded = new Float32Array(nextPowerOfTwo(samples.length) * opts.zeroPadFactor)
  for (let i = 0; i < samples.length; i++) {
    const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (samples.length - 1)))
    padded[i] = samples[i] * hann
  }

  const spectrum = magnitudeSpectrum(padded)
  const binWidth = sampleRate / padded.length

  // Normalize so the HPS product of small magnitudes can't underflow.
  let maxMag = 0
  let sumMag = 0
  for (let k = 1; k < spectrum.length; k++) {
    if (spectrum[k] > maxMag) maxMag = spectrum[k]
    sumMag += spectrum[k]
  }
  if (maxMag === 0) return null

  // Tonality gate: reject signals whose energy is spread across the whole
  // spectrum (breath, hiss, room rumble) instead of piled into harmonics.
  const meanMag = sumMag / (spectrum.length - 1)
  if (maxMag / meanMag < opts.minTonality) return null

  const minBin = Math.max(1, Math.floor(opts.minFrequency / binWidth))
  const maxBin = Math.min(spectrum.length - 1, Math.ceil(opts.maxFrequency / binWidth))
  if (minBin >= maxBin) return null

  // Log-domain HPS with a noise floor: summing log(floor + S) instead of
  // multiplying raw magnitudes keeps a pure tone (whose harmonic bins are
  // numerically zero) from scoring no better than the noise around it,
  // while still rewarding bins whose harmonic series is actually present.
  const FLOOR = 1e-4
  // Only bins with real spectral energy can be the fundamental; this gate
  // stops the HPS from ever electing a subharmonic that isn't in the signal.
  const MAGNITUDE_GATE = 0.02

  let peak = -1
  let peakScore = -Infinity
  for (let k = minBin; k <= maxBin; k++) {
    if (spectrum[k] / maxMag < MAGNITUDE_GATE) continue
    let score = 0
    for (let h = 1; h <= opts.harmonics; h++) {
      const idx = k * h
      score += Math.log(FLOOR + (idx < spectrum.length ? spectrum[idx] / maxMag : 0))
    }
    if (score > peakScore) {
      peakScore = score
      peak = k
    }
  }
  if (peak < 0) return null

  // Parabolic interpolation over the raw spectrum around the peak.
  const refined = interpolatePeak(spectrum, peak)
  const frequency = refined * binWidth
  if (frequency < opts.minFrequency || frequency > opts.maxFrequency) {
    return null
  }
  return frequency
}

function interpolatePeak(spectrum: Float32Array, bin: number): number {
  // The HPS peak bin can sit a bin or two off the true spectral peak;
  // walk to the local maximum before fitting the parabola.
  let k = bin
  while (k + 1 < spectrum.length && spectrum[k + 1] > spectrum[k]) k++
  while (k - 1 > 0 && spectrum[k - 1] > spectrum[k]) k--

  if (k <= 0 || k >= spectrum.length - 1) return k
  const a = spectrum[k - 1]
  const b = spectrum[k]
  const c = spectrum[k + 1]
  const denom = a - 2 * b + c
  if (denom === 0) return k
  return k + (0.5 * (a - c)) / denom
}
