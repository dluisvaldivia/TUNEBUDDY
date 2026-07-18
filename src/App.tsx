import { useState, type CSSProperties, type MouseEvent } from 'react'
import { useTuner } from './tuner/useTuner'
import { midiToFrequency } from './tuner/notes'
import { centsFrom, nearestString, TUNINGS, type TuningString } from './tuner/tunings'
import { MetronomeView } from './MetronomeView'
import './App.css'

const GAUGE_RANGE = 50 // cents shown on each side of center
const IN_TUNE_CENTS = 5

const ORDINALS: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th' }

type PulseDirection = 'left' | 'right'

// Arcs just outside the gauge arc (r=98), from top center to each ±60° edge,
// traced center-outward so the dash animation travels toward that side.
const PULSE_ARCS: Record<PulseDirection, string> = {
  right: 'M 100 2 A 98 98 0 0 1 184.9 51',
  left: 'M 100 2 A 98 98 0 0 0 15.1 51',
}

function Gauge({ cents, pulse }: { cents: number | null; pulse: PulseDirection | null }) {
  // Map −50…+50 cents onto a −60°…+60° needle sweep.
  const clamped = Math.max(-GAUGE_RANGE, Math.min(GAUGE_RANGE, cents ?? 0))
  const angle = (clamped / GAUGE_RANGE) * 60
  const inTune = cents !== null && Math.abs(cents) <= IN_TUNE_CENTS

  const ticks = []
  for (let c = -GAUGE_RANGE; c <= GAUGE_RANGE; c += 10) {
    const tickAngle = ((c / GAUGE_RANGE) * 60 * Math.PI) / 180
    const isMajor = c % 50 === 0 || c === 0
    const r1 = isMajor ? 78 : 84
    const x1 = 100 + r1 * Math.sin(tickAngle)
    const y1 = 100 - r1 * Math.cos(tickAngle)
    const x2 = 100 + 92 * Math.sin(tickAngle)
    const y2 = 100 - 92 * Math.cos(tickAngle)
    ticks.push(
      <line key={c} x1={x1} y1={y1} x2={x2} y2={y2} className={isMajor ? 'tick major' : 'tick'} />,
    )
  }

  return (
    <svg className="gauge" viewBox="0 0 200 110" role="img" aria-label="Tuning gauge">
      <path className="gauge-arc" d="M 20.3 53.5 A 92 92 0 0 1 179.7 53.5" fill="none" />
      {ticks}
      {pulse && (
        // key restarts the sweep from the center when the direction flips
        <path key={pulse} className="pulse-light" d={PULSE_ARCS[pulse]} pathLength={100} />
      )}
      <g
        className={`needle ${cents === null ? 'idle' : ''} ${inTune ? 'in-tune' : ''}`}
        style={{ transform: `rotate(${angle}deg)` }}
      >
        <line x1="100" y1="100" x2="100" y2="18" />
        <circle cx="100" cy="100" r="5" />
      </g>
    </svg>
  )
}

interface Reveal {
  x: number
  y: number
  radius: number
}

function App() {
  const { status, reading, error, start, stop } = useTuner()
  const [tuningId, setTuningId] = useState('chromatic')
  const [lockedStringNumber, setLockedStringNumber] = useState<number | null>(null)
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [metronomeOpen, setMetronomeOpen] = useState(false)
  const [metronomeClosing, setMetronomeClosing] = useState(false)

  const openMetronome = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    // Radius that covers the whole viewport from the button's center.
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )
    setReveal({ x, y, radius })
    // The tuner would otherwise try to read the metronome's beeps.
    if (status === 'listening') stop()
    setMetronomeClosing(false)
    setMetronomeOpen(true)
  }

  const closeMetronome = () => setMetronomeClosing(true)

  const tuning = TUNINGS.find((t) => t.id === tuningId) ?? TUNINGS[0]
  const isPreset = tuning.strings.length > 0

  // Locked string wins; otherwise follow whichever string the sound is nearest.
  const lockedString = tuning.strings.find((s) => s.stringNumber === lockedStringNumber) ?? null
  const autoString = isPreset && reading ? nearestString(reading.frequency, tuning) : null
  const activeString: TuningString | null = isPreset ? (lockedString ?? autoString) : null
  const targetFrequency = activeString ? midiToFrequency(activeString.midi) : null

  // In preset mode the gauge is centered on the target string's note, so the
  // needle directly says tighten (flat side) or loosen (sharp side).
  const cents =
    reading === null
      ? null
      : targetFrequency !== null
        ? centsFrom(reading.frequency, targetFrequency)
        : reading.cents

  const inTune = cents !== null && Math.abs(cents) <= IN_TUNE_CENTS

  // Preset mode only: flat means the pitch must rise (needle should move
  // right), sharp means it must fall. Chromatic mode has no target string.
  const pulseDirection: PulseDirection | null =
    isPreset && cents !== null && !inTune ? (cents < 0 ? 'right' : 'left') : null

  const selectTuning = (id: string) => {
    setTuningId(id)
    setLockedStringNumber(null)
  }

  const toggleString = (stringNumber: number) => {
    setLockedStringNumber((current) => (current === stringNumber ? null : stringNumber))
  }

  return (
    <div className="tuner">
      <header className="tuner-header">
        <h1>TuneBuddy</h1>
        <button type="button" className="metronome-button" onClick={openMetronome}>
          Metronome
        </button>
        <select
          className="tuning-select"
          value={tuningId}
          onChange={(e) => selectTuning(e.target.value)}
          aria-label="Tuning preset"
        >
          {TUNINGS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </header>

      <main className="tuner-display">
        <Gauge cents={cents} pulse={pulseDirection} />

        <div className={`note ${inTune ? 'in-tune' : ''}`}>
          {activeString ? (
            <>
              <span className="note-name">{activeString.note}</span>
              <span className="note-octave">{activeString.octave}</span>
            </>
          ) : reading ? (
            <>
              <span className="note-name">{reading.name}</span>
              <span className="note-octave">{reading.octave}</span>
            </>
          ) : (
            <span className="note-placeholder">{status === 'listening' ? '···' : '♪'}</span>
          )}
        </div>

        {isPreset && (
          <div className="strings" role="group" aria-label="Strings">
            {tuning.strings.map((s) => {
              const isLocked = lockedStringNumber === s.stringNumber
              const isActive = activeString?.stringNumber === s.stringNumber
              return (
                <button
                  key={s.stringNumber}
                  type="button"
                  className={`string ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''} ${
                    isActive && inTune ? 'in-tune' : ''
                  }`}
                  onClick={() => toggleString(s.stringNumber)}
                  aria-pressed={isLocked}
                >
                  <span className="string-circle">
                    {s.note}
                    <span className="string-octave">{s.octave}</span>
                  </span>
                  <span className="string-label">{ORDINALS[s.stringNumber]} string</span>
                </button>
              )
            })}
          </div>
        )}
      </main>

      <footer className="tuner-controls">
        {status === 'listening' ? (
          <button type="button" className="mic-button stop" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="button" className="mic-button" onClick={() => void start()}>
            Start tuning
          </button>
        )}
        {status === 'error' && (
          <p className="error" role="alert">
            Microphone unavailable: {error}
          </p>
        )}
      </footer>

      {metronomeOpen && reveal && (
        <div
          className={`metronome-overlay ${metronomeClosing ? 'closing' : 'open'}`}
          style={
            {
              '--reveal-x': `${reveal.x}px`,
              '--reveal-y': `${reveal.y}px`,
              '--reveal-r': `${reveal.radius}px`,
            } as CSSProperties
          }
          onAnimationEnd={(e) => {
            // Unmount only after the closing animation finishes (which also
            // disposes the metronome engine and silences it).
            if (metronomeClosing && e.target === e.currentTarget) {
              setMetronomeOpen(false)
              setMetronomeClosing(false)
            }
          }}
        >
          <MetronomeView onClose={closeMetronome} />
        </div>
      )}
    </div>
  )
}

export default App
