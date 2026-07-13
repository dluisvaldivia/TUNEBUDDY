/**
 * Web Audio metronome engine. UI-agnostic, like the tuner engine.
 *
 * Timing uses the standard lookahead-scheduler pattern: a coarse JS interval
 * wakes up every 25 ms and schedules any beeps that fall inside the next
 * 120 ms on the AudioContext clock, which is sample-accurate and immune to
 * main-thread jank (a bare setInterval would drift audibly).
 */
export class MetronomeEngine {
  /** Beats per minute. May be changed while running. */
  bpm: number
  /** Beats per measure; beat 0 gets the accented beep. */
  beatsPerMeasure: number
  /** When true, beats stay silent but the visual onBeat pulse keeps firing. */
  muted = false
  /** Fired on each beat (0-based index in the measure), synced to the sound. */
  onBeat: ((beat: number) => void) | null = null

  private audioContext: AudioContext | null = null
  private timerId: number | null = null
  private nextBeatTime = 0
  private beatIndex = 0

  private static readonly LOOKAHEAD_MS = 25
  private static readonly SCHEDULE_AHEAD_S = 0.12
  private static readonly ACCENT_HZ = 1568 // G6
  private static readonly BEAT_HZ = 1047 // C6

  constructor(bpm = 100, beatsPerMeasure = 4) {
    this.bpm = bpm
    this.beatsPerMeasure = beatsPerMeasure
  }

  get running(): boolean {
    return this.timerId !== null
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  start(): void {
    if (this.running) return
    this.audioContext ??= new AudioContext()
    void this.audioContext.resume()
    this.beatIndex = 0
    this.nextBeatTime = this.audioContext.currentTime + 0.08
    this.timerId = window.setInterval(() => this.schedule(), MetronomeEngine.LOOKAHEAD_MS)
    this.schedule()
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }

  /** Stop and release the audio device. */
  dispose(): void {
    this.stop()
    void this.audioContext?.close()
    this.audioContext = null
  }

  private schedule(): void {
    const ctx = this.audioContext
    if (!ctx) return
    while (this.nextBeatTime < ctx.currentTime + MetronomeEngine.SCHEDULE_AHEAD_S) {
      const beat = this.beatIndex % this.beatsPerMeasure
      if (!this.muted) this.beep(this.nextBeatTime, beat === 0)

      // Fire the visual callback as close to the audible beat as JS allows.
      const delayMs = Math.max(0, (this.nextBeatTime - ctx.currentTime) * 1000)
      window.setTimeout(() => {
        if (this.running) this.onBeat?.(beat)
      }, delayMs)

      this.nextBeatTime += 60 / this.bpm
      this.beatIndex = (beat + 1) % this.beatsPerMeasure
    }
  }

  private beep(time: number, accent: boolean): void {
    const ctx = this.audioContext!
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = accent ? MetronomeEngine.ACCENT_HZ : MetronomeEngine.BEAT_HZ
    // Sharp attack, fast exponential decay: a clean metronome blip.
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, time + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(time)
    osc.stop(time + 0.08)
  }
}
