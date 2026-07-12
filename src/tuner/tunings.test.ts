import { describe, expect, it } from 'vitest'
import { centsFrom, nearestString, TUNINGS } from './tunings'
import { midiToFrequency } from './notes'

const ukulele = TUNINGS.find((t) => t.id === 'ukulele-standard')!
const chromatic = TUNINGS.find((t) => t.id === 'chromatic')!

describe('ukulele standard tuning preset', () => {
  it('is gCEA displayed 4th → 1st', () => {
    expect(ukulele.strings.map((s) => `${s.note}${s.octave}`)).toEqual([
      'G4', 'C4', 'E4', 'A4',
    ])
    expect(ukulele.strings.map((s) => s.stringNumber)).toEqual([4, 3, 2, 1])
  })

  it('has the right target frequencies', () => {
    const freqs = ukulele.strings.map((s) => midiToFrequency(s.midi))
    expect(freqs[0]).toBeCloseTo(392.0, 1) // G4
    expect(freqs[1]).toBeCloseTo(261.63, 1) // C4
    expect(freqs[2]).toBeCloseTo(329.63, 1) // E4
    expect(freqs[3]).toBeCloseTo(440.0, 1) // A4
  })
})

describe('centsFrom', () => {
  it('is zero at the target and signed around it', () => {
    expect(centsFrom(440, 440)).toBeCloseTo(0, 5)
    expect(centsFrom(441, 440)).toBeGreaterThan(0) // sharp
    expect(centsFrom(439, 440)).toBeLessThan(0) // flat
  })

  it('measures an octave as 1200 cents', () => {
    expect(centsFrom(880, 440)).toBeCloseTo(1200, 5)
    expect(centsFrom(220, 440)).toBeCloseTo(-1200, 5)
  })
})

describe('nearestString', () => {
  it('picks each ukulele string from a frequency near it', () => {
    for (const string of ukulele.strings) {
      const near = midiToFrequency(string.midi) * 1.01 // ~17 cents sharp
      expect(nearestString(near, ukulele)?.stringNumber).toBe(string.stringNumber)
    }
  })

  it('picks the nearest string for an in-between pitch', () => {
    // 300 Hz sits between C4 (261.6) and E4 (329.6), closer to E4 in cents.
    expect(nearestString(300, ukulele)?.note).toBe('E')
    // 280 Hz is closer to C4.
    expect(nearestString(280, ukulele)?.note).toBe('C')
  })

  it('picks the outer strings for out-of-range pitches', () => {
    expect(nearestString(80, ukulele)?.note).toBe('C') // lowest target
    expect(nearestString(1000, ukulele)?.note).toBe('A') // highest target
  })

  it('returns null for the chromatic pseudo-tuning', () => {
    expect(nearestString(440, chromatic)).toBeNull()
  })

  it('respects the A4 calibration', () => {
    // With A4 = 415 Hz everything shifts down ~a semitone; 440 Hz is then
    // slightly nearer to the A string's shifted target than anything else.
    expect(nearestString(415, ukulele, 415)?.note).toBe('A')
  })
})
