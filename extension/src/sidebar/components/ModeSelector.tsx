import React from 'react';
import { ExplanationMode } from '../../shared/types';
import { MODE_LABELS, MODE_DESCRIPTIONS } from '../../shared/constants';

interface ModeSelectorProps {
  currentMode: ExplanationMode;
  onSelect: (mode: ExplanationMode) => void;
}

const MODES: ExplanationMode[] = ['friend', 'teacher', 'beginner', 'eli5', 'deep-dive', 'senior-engineer'];

export default function ModeSelector({ currentMode, onSelect }: ModeSelectorProps) {
  return (
    <div className="grid gap-1.5">
      {MODES.map((mode) => (
        <button
          key={mode}
          onClick={() => onSelect(mode)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
            currentMode === mode ? 'ring-1' : 'hover:bg-[var(--bg-tertiary)]'
          }`}
          style={
            currentMode === mode
              ? {
                  background: 'var(--accent-light)',
                  outline: '1px solid var(--accent)',
                  color: 'var(--accent)',
                }
              : { color: 'var(--text-primary)' }
          }
        >
          <div className="font-medium">{MODE_LABELS[mode]}</div>
          <div
            className="text-xs mt-0.5"
            style={{ color: currentMode === mode ? 'var(--accent)' : 'var(--text-tertiary)' }}
          >
            {MODE_DESCRIPTIONS[mode]}
          </div>
        </button>
      ))}
    </div>
  );
}
