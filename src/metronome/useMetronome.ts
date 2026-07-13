import { useEffect, useRef, useState } from 'react'
import { MetronomeEngine } from './metronome'

export const MIN_BPM = 30
export const MAX_BPM = 240

export interface MetronomeState {
  running: boolean
  bpm: number
  setBpm: (bpm: number) => void
  beatsPerMeasure: number
  setBeatsPerMeasure: (beats: number) => void
  /** Current beat in the measure (0 = accent), or null when stopped. */
  beat: number | null
  /** Increments on every beat — key a pulse element on it to restart its animation. */
  tick: number
  toggle: () => void
  stop: () => void
  muted: boolean
  toggleMuted: () => void
}

/** React binding for MetronomeEngine — the only metronome API the UI needs. */
export function useMetronome(initialBpm = 100, initialBeats = 4): MetronomeState {
  const engineRef = useRef<MetronomeEngine | null>(null)
  const [running, setRunning] = useState(false)
  const [bpm, setBpmState] = useState(initialBpm)
  const [beatsPerMeasure, setBeatsState] = useState(initialBeats)
  const [pulse, setPulse] = useState<{ beat: number; tick: number } | null>(null)
  const [muted, setMuted] = useState(false)

  if (engineRef.current === null) {
    engineRef.current = new MetronomeEngine(initialBpm, initialBeats)
  }

  useEffect(() => {
    const engine = engineRef.current!
    engine.onBeat = (beat) => setPulse((p) => ({ beat, tick: (p?.tick ?? 0) + 1 }))
    return () => {
      engine.onBeat = null
      engine.dispose()
    }
  }, [])

  const setBpm = (value: number) => {
    const clamped = Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, value)))
    engineRef.current!.bpm = clamped
    setBpmState(clamped)
  }

  const setBeatsPerMeasure = (beats: number) => {
    engineRef.current!.beatsPerMeasure = beats
    setBeatsState(beats)
  }

  const toggleMuted = () => {
    const engine = engineRef.current!
    engine.muted = !engine.muted
    setMuted(engine.muted)
  }

  const stop = () => {
    engineRef.current!.stop()
    setPulse(null)
    setRunning(false)
  }

  const toggle = () => {
    const engine = engineRef.current!
    if (engine.running) {
      stop()
    } else {
      engine.start()
      setRunning(true)
    }
  }

  return {
    running,
    bpm,
    setBpm,
    beatsPerMeasure,
    setBeatsPerMeasure,
    beat: pulse?.beat ?? null,
    tick: pulse?.tick ?? 0,
    toggle,
    stop,
    muted,
    toggleMuted,
  }
}
