import { describe, expect, it } from 'vitest'
import { PitchStabilizer } from './stabilizer'

describe('PitchStabilizer', () => {
  it('stays silent until enough consecutive frames agree', () => {
    const s = new PitchStabilizer(5, 3, 100)
    expect(s.push(440)).toBeNull()
    expect(s.push(440.5)).toBeNull()
    expect(s.push(439.8)).not.toBeNull()
  })

  it('reports the median of the recent window', () => {
    const s = new PitchStabilizer(5, 3, 100)
    s.push(440)
    s.push(442)
    expect(s.push(441)).toBe(441)
  })

  it('never surfaces erratic noise-like detections', () => {
    const s = new PitchStabilizer(5, 3, 100)
    // Frequencies jumping by far more than 100 cents each frame.
    for (const f of [120, 900, 333, 78, 1400, 250, 600]) {
      expect(s.push(f)).toBeNull()
    }
  })

  it('recovers after a note change within a few frames', () => {
    const s = new PitchStabilizer(5, 3, 100)
    s.push(440)
    s.push(440)
    expect(s.push(440)).toBe(440)
    // Jump down a fifth: old agreement is discarded...
    expect(s.push(293.66)).toBeNull()
    expect(s.push(293.7)).toBeNull()
    // ...and the new note surfaces after three agreeing frames.
    expect(s.push(293.6)).toBeCloseTo(293.66, 1)
  })

  it('holds the last reading through brief silent frames', () => {
    const s = new PitchStabilizer(5, 3, 100, 4)
    s.push(440)
    s.push(440)
    expect(s.push(440)).toBe(440)
    // Decaying string dips below the detector's gates: keep the note alive…
    expect(s.push(null)).toBe(440)
    expect(s.push(null)).toBe(440)
    // …and resume live tracking seamlessly when it pokes back above.
    expect(s.push(441)).not.toBeNull()
  })

  it('goes silent once the hold runs out', () => {
    const s = new PitchStabilizer(5, 3, 100, 2)
    s.push(440)
    s.push(440)
    s.push(440)
    expect(s.push(null)).toBe(440)
    expect(s.push(null)).toBe(440)
    expect(s.push(null)).toBeNull() // hold exhausted
    expect(s.push(440)).toBeNull() // must re-accumulate agreement
  })

  it('does not hold when nothing stable was being reported', () => {
    const s = new PitchStabilizer(5, 3, 100, 4)
    s.push(440) // only one frame — not stable yet
    expect(s.push(null)).toBeNull()
  })

  it('clears immediately with holdFrames = 0', () => {
    const s = new PitchStabilizer(5, 3, 100, 0)
    s.push(440)
    s.push(440)
    s.push(440)
    expect(s.push(null)).toBeNull()
    expect(s.push(440)).toBeNull() // must re-accumulate agreement
  })
})
