import React, { useState, useRef, useEffect } from 'react';

interface InputBarProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function InputBar({ onSend, disabled }: InputBarProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [text]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
      <div className="flex items-end gap-2 rounded-xl px-3 py-2"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ask a follow-up question..."
          rows={1}
          className="flex-1 resize-none text-sm bg-transparent outline-none"
          style={{ color: 'var(--text-primary)', maxHeight: '120px' }}
          disabled={disabled}
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || disabled}
          className="p-1.5 rounded-lg transition-all"
          style={{
            background: text.trim() && !disabled ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: text.trim() && !disabled ? 'white' : 'var(--text-tertiary)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      <div className="text-center mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        Shift+Enter for new line &middot; Lumina AI &middot; Powered by NVIDIA NIM
      </div>
    </div>
  );
}
