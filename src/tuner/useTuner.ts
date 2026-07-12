import { useEffect, useRef, useState } from 'react'
import { TunerEngine, type TunerEngineOptions, type TunerReading } from './audioInput'
import { DEFAULT_A4 } from './notes'

export type TunerStatus = 'idle' | 'listening' | 'error'

export interface TunerState {
  status: TunerStatus
  /** Latest pitch reading; null while idle or during silence. */
  reading: TunerReading | null
  error: string | null
  a4: number
  setA4: (a4: number) => void
  start: () => Promise<void>
  stop: () => void
}

/** React binding for TunerEngine — the only tuner API the UI needs. */
export function useTuner(options: TunerEngineOptions = {}): TunerState {
  const engineRef = useRef<TunerEngine | null>(null)
  const [status, setStatus] = useState<TunerStatus>('idle')
  const [reading, setReading] = useState<TunerReading | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [a4, setA4State] = useState(options.a4 ?? DEFAULT_A4)

  if (engineRef.current === null) {
    engineRef.current = new TunerEngine(options)
  }

  useEffect(() => {
    const engine = engineRef.current!
    engine.onReading = setReading
    engine.onSilence = () => setReading(null)
    return () => {
      engine.onReading = null
      engine.onSilence = null
      engine.stop()
    }
  }, [])

  const start = async () => {
    try {
      await engineRef.current!.start()
      setError(null)
      setStatus('listening')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  const stop = () => {
    engineRef.current!.stop()
    setReading(null)
    setStatus('idle')
  }

  const setA4 = (value: number) => {
    engineRef.current!.a4 = value
    setA4State(value)
  }

  return { status, reading, error, a4, setA4, start, stop }
}
