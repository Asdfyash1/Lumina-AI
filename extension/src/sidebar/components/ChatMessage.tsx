import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ConversationMessage } from '../../shared/types';

interface ChatMessageProps {
  message: ConversationMessage;
  onReadAloud?: (text: string) => void;
}

export default function ChatMessage({ message, onReadAloud }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? 'rounded-br-md' : 'rounded-bl-md'
        }`}
        style={{
          background: isUser ? 'var(--accent)' : 'var(--bg-secondary)',
          color: isUser ? 'white' : 'var(--text-primary)',
          border: isUser ? 'none' : '1px solid var(--border)',
        }}
      >
        {message.selectedText && isUser && (
          <div className="text-xs opacity-80 italic mb-1 line-clamp-2">
            &ldquo;{message.selectedText}&rdquo;
          </div>
        )}
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
        {!isUser && onReadAloud && (
          <button
            onClick={() => onReadAloud(message.content)}
            className="mt-2 text-xs px-2 py-1 rounded-md hover:opacity-80 transition-opacity"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            Read Aloud
          </button>
        )}
      </div>
    </div>
  );
}
