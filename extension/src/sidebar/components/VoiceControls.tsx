import React from 'react';

interface VoiceControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  voices: SpeechSynthesisVoice[];
  currentVoice: SpeechSynthesisVoice | null;
  speed: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onVoiceChange: (voice: SpeechSynthesisVoice) => void;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

export default function VoiceControls({
  isPlaying, isPaused, voices, currentVoice, speed,
  onPause, onResume, onStop, onSpeedChange, onVoiceChange,
}: VoiceControlsProps) {
  if (!isPlaying && !isPaused) return null;

  return (
    <div
      className="px-4 py-2 flex items-center gap-2 text-xs border-t"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
    >
      {isPaused ? (
        <button onClick={onResume} className="px-2 py-1 rounded" style={{ background: 'var(--accent)', color: 'white' }}>
          Resume
        </button>
      ) : (
        <button onClick={onPause} className="px-2 py-1 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
          Pause
        </button>
      )}
      <button onClick={onStop} className="px-2 py-1 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
        Stop
      </button>
      <div className="flex gap-1 ml-auto">
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className="px-1.5 py-0.5 rounded"
            style={{
              background: speed === s ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: speed === s ? 'white' : 'var(--text-secondary)',
            }}
          >
            {s}x
          </button>
        ))}
      </div>
      {voices.length > 0 && (
        <select
          className="text-xs rounded px-1 py-0.5 max-w-[100px]"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          value={currentVoice?.name || ''}
          onChange={(e) => {
            const voice = voices.find((v) => v.name === e.target.value);
            if (voice) onVoiceChange(voice);
          }}
        >
          {voices.map((v) => (
            <option key={v.name} value={v.name}>{v.name.slice(0, 25)}</option>
          ))}
        </select>
      )}
    </div>
  );
}
