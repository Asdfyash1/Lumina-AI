import React, { useState } from 'react';
import { ExplanationMode } from '../../shared/types';
import ModeSelector from './ModeSelector';

interface HeaderProps {
  mode: ExplanationMode;
  onModeChange: (mode: ExplanationMode) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onRefresh: () => void;
  onClear: () => void;
}

export default function Header({ mode, onModeChange, theme, onThemeToggle, onRefresh, onClear }: HeaderProps) {
  const [showModes, setShowModes] = useState(false);

  return (
    <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #0c8ce9, #006fc7)' }}>
            AI
          </div>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Lumina AI</h1>
            <button className="text-xs" style={{ color: 'var(--accent)' }}
              onClick={() => setShowModes(!showModes)}>
              {mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ')} Mode
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onThemeToggle} className="p-1.5 rounded-lg hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }} title="Toggle theme">
            {theme === 'dark' ? '\u2600\ufe0f' : '\ud83c\udf19'}
          </button>
          <button onClick={onRefresh} className="p-1.5 rounded-lg hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }} title="Refresh page context">
            \u21bb
          </button>
          <button onClick={onClear} className="p-1.5 rounded-lg hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }} title="Clear chat">
            \ud83d\uddd1
          </button>
        </div>
      </div>
      {showModes && (
        <div className="mt-2">
          <ModeSelector currentMode={mode} onSelect={(m) => { onModeChange(m); setShowModes(false); }} />
        </div>
      )}
    </div>
  );
}
