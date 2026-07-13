import { DEFAULT_PITCH_OPTIONS, detectPitch, rms, type PitchOptions } from './pitch'
import { frequencyToNote, DEFAULT_A4, type Note } from './notes'
import { PitchStabilizer } from './stabilizer'

export interface TunerReading extends Note {
  /** Detected fundamental frequency (Hz), median-smoothed. */
  frequency: number
  /** RMS input level, 0…1. */
  volume: number
}

export interface TunerEngineOptions extends PitchOptions {
  /** A4 reference pitch in Hz (default 440). */
  a4?: number
  /** Analysis window in samples (power of two). Bigger = more precise, slower to react. */
  fftSize?: number
  /** Number of recent frequencies medianed together to steady the reading. */
  smoothing?: number
  /** Minimum time between onReading callbacks, in ms. */
  updateIntervalMs?: number
}

/**
 * Captures microphone audio and reports pitch readings.
 * UI-agnostic: subscribe via `onReading` / `onSilence` callbacks.
 */
export class TunerEngine {
  onReading: ((reading: TunerReading) => void) | null = null
  onSilence: (() => void) | null = null

  a4: number

  private options: TunerEngineOptions
  private audioContext: AudioContext | null = null
  private stream: MediaStream | null = null
  private analyser: AnalyserNode | null = null
  private buffer: Float32Array<ArrayBuffer> | null = null
  private rafId = 0
  private lastUpdate = 0
  private stabilizer: PitchStabilizer

  constructor(options: TunerEngineOptions = {}) {
    this.options = options
    this.a4 = options.a4 ?? DEFAULT_A4
    this.stabilizer = new PitchStabilizer(options.smoothing ?? 5)
  }

  get running(): boolean {
    return this.audioContext !== null
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  async start(): Promise<void> {
    if (this.running) return

    // Disable browser voice processing: it eats sustained instrument tones.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
    this.audioContext = new AudioContext()
    const source = this.audioContext.createMediaStreamSource(this.stream)
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = this.options.fftSize ?? 16384
    source.connect(this.analyser)
    this.buffer = new Float32Array(this.analyser.fftSize)
    this.stabilizer.reset()
    this.rafId = requestAnimationFrame(this.tick)
  }

  stop(): void {
    cancelAnimationFrame(this.rafId)
    this.stream?.getTracks().forEach((track) => track.stop())
    this.audioContext?.close()
    this.audioContext = null
    this.stream = null
    this.analyser = null
    this.buffer = null
    this.stabilizer.reset()
  }

  private tick = (now: number) => {
    this.rafId = requestAnimationFrame(this.tick)
    if (!this.analyser || !this.buffer || !this.audioContext) return

    const interval = this.options.updateIntervalMs ?? 50
    if (now - this.lastUpdate < interval) return
    this.lastUpdate = now

    this.analyser.getFloatTimeDomainData(this.buffer)
    // Hysteresis: while a note is being tracked, halve the silence gate so
    // the quiet tail of a decaying string keeps producing live readings.
    const baseThreshold = this.options.volumeThreshold ?? DEFAULT_PITCH_OPTIONS.volumeThreshold
    const raw = detectPitch(this.buffer, this.audioContext.sampleRate, {
      ...this.options,
      volumeThreshold: this.stabilizer.tracking ? baseThreshold / 2 : baseThreshold,
    })
    const frequency = this.stabilizer.push(raw)

    if (frequency === null) {
      this.onSilence?.()
      return
    }

    this.onReading?.({
      frequency,
      volume: rms(this.buffer),
      ...frequencyToNote(frequency, this.a4),
    })
  }
}
