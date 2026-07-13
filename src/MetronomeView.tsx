import { useMetronome, MIN_BPM, MAX_BPM } from './metronome/useMetronome'

const MEASURE_CHOICES = [2, 3, 4]

function MutedVolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6.5 9H3v6h3.5L11 19z" />
      <line x1="16" y1="9.5" x2="21" y2="14.5" />
      <line x1="21" y1="9.5" x2="16" y2="14.5" />
    </svg>
  )
}

export function MetronomeView({ onClose }: { onClose: () => void }) {
  const {
    running,
    bpm,
    setBpm,
    beatsPerMeasure,
    setBeatsPerMeasure,
    beat,
    tick,
    toggle,
    stop,
    muted,
    toggleMuted,
  } = useMetronome()

  const backToTuner = () => {
    // Silence immediately — the closing animation shouldn't keep beeping.
    stop()
    onClose()
  }

  const pulseClass =
    running && beat !== null ? (beat === 0 ? 'pulse-circle beat accent' : 'pulse-circle beat') : 'pulse-circle'

  return (
    <div className="metronome">
      {/* Mirrors the tuner header so the Tuner button sits exactly where the
          Metronome button was when the reveal started. */}
      <header className="metronome-header">
        <h1>Metronome</h1>
        <button type="button" className="back-button" onClick={backToTuner}>
          Tuner
        </button>
      </header>

      <main className="metronome-display">
        {/* Keyed on tick so the pulse animation restarts on every beat. */}
        <div className={pulseClass} key={tick}>
          <span className="bpm-value">{bpm}</span>
          <span className="bpm-unit">BPM</span>
        </div>

        <div className="beat-dots" aria-hidden="true">
          {Array.from({ length: beatsPerMeasure }, (_, i) => (
            <span
              key={i}
              className={`beat-dot ${i === 0 ? 'accent' : ''} ${running && beat === i ? 'current' : ''}`}
            />
          ))}
        </div>

        <div className="bpm-controls">
          <button type="button" onClick={() => setBpm(bpm - 1)} disabled={bpm <= MIN_BPM} aria-label="Slower">
            −
          </button>
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            aria-label="Beats per minute"
          />
          <button type="button" onClick={() => setBpm(bpm + 1)} disabled={bpm >= MAX_BPM} aria-label="Faster">
            +
          </button>
        </div>

        <div className="measure-select" role="group" aria-label="Beats per measure">
          {MEASURE_CHOICES.map((n) => (
            <button
              type="button"
              key={n}
              className={n === beatsPerMeasure ? 'selected' : ''}
              onClick={() => setBeatsPerMeasure(n)}
            >
              {n}/4
            </button>
          ))}
        </div>
      </main>

      <footer className="metronome-controls">
        <button
          type="button"
          className={`mute-button ${muted ? 'muted' : ''}`}
          onClick={toggleMuted}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute metronome' : 'Mute metronome'}
        >
          <MutedVolumeIcon />
        </button>
        <button type="button" className={`mic-button ${running ? 'stop' : ''}`} onClick={toggle}>
          {running ? 'Stop' : 'Start'}
        </button>
      </footer>
    </div>
  )
}
