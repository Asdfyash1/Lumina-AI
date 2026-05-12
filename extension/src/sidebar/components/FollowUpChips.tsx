import React from 'react';
import { FOLLOW_UP_SUGGESTIONS } from '../../shared/constants';

interface FollowUpChipsProps {
  onSelect: (text: string) => void;
}

export default function FollowUpChips({ onSelect }: FollowUpChipsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto px-4 py-2 scrollbar-hide">
      {FOLLOW_UP_SUGGESTIONS.map((text) => (
        <button
          key={text}
          onClick={() => onSelect(text)}
          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-all hover:scale-[1.03]"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
