import { midiToFrequency, DEFAULT_A4, type NoteName } from './notes'

export interface TuningString {
  /** Conventional string number: 1st string is the closest to the floor. */
  stringNumber: number
  note: NoteName
  octave: number
  midi: number
}

export interface Tuning {
  id: string
  label: string
  /** In display order (lowest-numbered position on the left). Empty = chromatic. */
  strings: TuningString[]
}

export const TUNINGS: Tuning[] = [
  {
    id: 'chromatic',
    label: 'Just the tuner',
    strings: [],
  },
  {
    id: 'ukulele-standard',
    label: 'Ukulele — Standard (gCEA)',
    strings: [
      { stringNumber: 4, note: 'G', octave: 4, midi: 67 },
      { stringNumber: 3, note: 'C', octave: 4, midi: 60 },
      { stringNumber: 2, note: 'E', octave: 4, midi: 64 },
      { stringNumber: 1, note: 'A', octave: 4, midi: 69 },
    ],
  },
]

/** Signed deviation of `frequency` from `target`, in cents (flat < 0 < sharp). */
export function centsFrom(frequency: number, target: number): number {
  return 1200 * Math.log2(frequency / target)
}

/** The tuning string whose pitch is nearest (in cents) to `frequency`. */
export function nearestString(
  frequency: number,
  tuning: Tuning,
  a4: number = DEFAULT_A4,
): TuningString | null {
  let best: TuningString | null = null
  let bestDistance = Infinity
  for (const string of tuning.strings) {
    const distance = Math.abs(centsFrom(frequency, midiToFrequency(string.midi, a4)))
    if (distance < bestDistance) {
      bestDistance = distance
      best = string
    }
  }
  return best
}
