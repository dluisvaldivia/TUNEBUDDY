import { describe, expect, it } from 'vitest'
import { frequencyToNote, midiToFrequency } from './notes'

describe('frequencyToNote', () => {
  it('maps A4 = 440 Hz exactly', () => {
    const note = frequencyToNote(440)
    expect(note.name).toBe('A')
    expect(note.octave).toBe(4)
    expect(note.midi).toBe(69)
    expect(note.cents).toBeCloseTo(0, 5)
    expect(note.targetFrequency).toBeCloseTo(440, 5)
  })

  it('maps the guitar low E string', () => {
    const note = frequencyToNote(82.41)
    expect(note.name).toBe('E')
    expect(note.octave).toBe(2)
    expect(Math.abs(note.cents)).toBeLessThan(1)
  })

  it('reports sharp and flat deviations in cents', () => {
    const sharp = frequencyToNote(443)
    expect(sharp.name).toBe('A')
    expect(sharp.cents).toBeGreaterThan(0)

    const flat = frequencyToNote(437)
    expect(flat.name).toBe('A')
    expect(flat.cents).toBeLessThan(0)
  })

  it('never reports more than ±50 cents', () => {
    for (const freq of [55.1, 82.4, 261.63, 400, 999]) {
      const note = frequencyToNote(freq)
      expect(Math.abs(note.cents)).toBeLessThanOrEqual(50)
    }
  })

  it('honors a custom A4 calibration', () => {
    const note = frequencyToNote(432, 432)
    expect(note.name).toBe('A')
    expect(note.octave).toBe(4)
    expect(note.cents).toBeCloseTo(0, 5)
  })

  it('handles accidentals across the octave boundary', () => {
    expect(frequencyToNote(midiToFrequency(61)).name).toBe('C#')
    expect(frequencyToNote(midiToFrequency(60)).octave).toBe(4)
    expect(frequencyToNote(midiToFrequency(59)).octave).toBe(3)
  })
})

describe('midiToFrequency', () => {
  it('is the inverse of frequencyToNote for exact pitches', () => {
    for (let midi = 40; midi <= 84; midi++) {
      const freq = midiToFrequency(midi)
      expect(frequencyToNote(freq).midi).toBe(midi)
    }
  })
})
