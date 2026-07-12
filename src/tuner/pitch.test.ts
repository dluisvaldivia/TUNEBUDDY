import { describe, expect, it } from 'vitest'
import { detectPitch } from './pitch'

const SAMPLE_RATE = 48000
const WINDOW = 16384

function sine(frequency: number, amplitude = 0.5, length = WINDOW): Float32Array {
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    out[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE)
  }
  return out
}

function mix(...signals: Float32Array[]): Float32Array {
  const out = new Float32Array(signals[0].length)
  for (const signal of signals) {
    for (let i = 0; i < out.length; i++) out[i] += signal[i]
  }
  return out
}

/** Deviation between two frequencies in cents. */
function centsBetween(a: number, b: number): number {
  return Math.abs(1200 * Math.log2(a / b))
}

const GUITAR_STRINGS = [
  ['E2', 82.41],
  ['A2', 110.0],
  ['D3', 146.83],
  ['G3', 196.0],
  ['B3', 246.94],
  ['E4', 329.63],
] as const

describe('detectPitch', () => {
  it.each(GUITAR_STRINGS)('detects a pure %s string tone', (_name, frequency) => {
    const detected = detectPitch(sine(frequency), SAMPLE_RATE)
    expect(detected).not.toBeNull()
    expect(centsBetween(detected!, frequency)).toBeLessThan(2)
  })

  it('picks the fundamental of a harmonic-rich tone, not an overtone', () => {
    // Plucked-string-like spectrum: overtones louder than the fundamental.
    const f0 = 110
    const tone = mix(
      sine(f0, 0.2),
      sine(f0 * 2, 0.5),
      sine(f0 * 3, 0.35),
      sine(f0 * 4, 0.2),
    )
    const detected = detectPitch(tone, SAMPLE_RATE)
    expect(detected).not.toBeNull()
    expect(centsBetween(detected!, f0)).toBeLessThan(5)
  })

  it('returns null for silence', () => {
    expect(detectPitch(new Float32Array(WINDOW), SAMPLE_RATE)).toBeNull()
  })

  it('returns null for very quiet input below the volume threshold', () => {
    expect(detectPitch(sine(220, 0.001), SAMPLE_RATE)).toBeNull()
  })

  it('returns null for broadband noise', () => {
    const noise = new Float32Array(WINDOW)
    let seed = 42
    for (let i = 0; i < noise.length; i++) {
      // Deterministic LCG noise so the test can't flake.
      seed = (seed * 1664525 + 1013904223) >>> 0
      noise[i] = (seed / 0xffffffff - 0.5) * 0.4
    }
    // Loud but flat-spectrum: the tonality gate must reject it outright.
    expect(detectPitch(noise, SAMPLE_RATE)).toBeNull()
  })

  it('respects a custom frequency range', () => {
    const detected = detectPitch(sine(41.2), SAMPLE_RATE, { minFrequency: 30 })
    expect(detected).not.toBeNull()
    expect(centsBetween(detected!, 41.2)).toBeLessThan(3)
  })
})
