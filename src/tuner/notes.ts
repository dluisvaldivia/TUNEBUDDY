export const NOTE_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const

export type NoteName = (typeof NOTE_NAMES)[number]

export interface Note {
  /** Pitch class, e.g. "A" or "F#". */
  name: NoteName
  /** Scientific pitch octave, e.g. 4 for A4. */
  octave: number
  /** MIDI note number (A4 = 69). */
  midi: number
  /** Deviation from the note's exact pitch, in cents (−50…+50). */
  cents: number
  /** The exact in-tune frequency of this note at the given A4 (Hz). */
  targetFrequency: number
}

export const DEFAULT_A4 = 440

/** Exact frequency of a MIDI note number for a given A4 reference. */
export function midiToFrequency(midi: number, a4: number = DEFAULT_A4): number {
  return a4 * 2 ** ((midi - 69) / 12)
}

/** Map a frequency to the nearest note and its cent deviation. */
export function frequencyToNote(frequency: number, a4: number = DEFAULT_A4): Note {
  if (frequency <= 0) {
    throw new Error('frequencyToNote: frequency must be positive')
  }
  const exactMidi = 12 * Math.log2(frequency / a4) + 69
  const midi = Math.round(exactMidi)
  return {
    name: NOTE_NAMES[((midi % 12) + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
    midi,
    cents: (exactMidi - midi) * 100,
    targetFrequency: midiToFrequency(midi, a4),
  }
}
