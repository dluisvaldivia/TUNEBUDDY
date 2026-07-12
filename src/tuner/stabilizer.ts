/**
 * Turns a stream of raw per-frame pitch estimates into steady readings.
 *
 * A frequency is only reported after `minReadings` consecutive frames agree
 * (within `maxJumpCents` of the running median), and the reported value is
 * the median of the recent window. Sporadic detections — the hallmark of
 * background noise — never accumulate enough agreement to surface, so the
 * needle stays idle until a real, sustained tone arrives.
 */
export class PitchStabilizer {
  private readings: number[] = []
  private readonly windowSize: number
  private readonly minReadings: number
  private readonly maxJumpCents: number

  constructor(windowSize = 5, minReadings = 3, maxJumpCents = 100) {
    this.windowSize = windowSize
    this.minReadings = minReadings
    this.maxJumpCents = maxJumpCents
  }

  push(frequency: number | null): number | null {
    if (frequency === null) {
      this.readings = []
      return null
    }

    if (this.readings.length > 0) {
      const jump = Math.abs(1200 * Math.log2(frequency / this.median()))
      if (jump > this.maxJumpCents) {
        // New note (or noise): start agreeing from scratch.
        this.readings = [frequency]
        return null
      }
    }

    this.readings.push(frequency)
    if (this.readings.length > this.windowSize) {
      this.readings.shift()
    }
    return this.readings.length >= this.minReadings ? this.median() : null
  }

  reset(): void {
    this.readings = []
  }

  private median(): number {
    const sorted = [...this.readings].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
  }
}
