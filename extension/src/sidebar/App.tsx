import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ConversationMessage, ExplanationMode, PageContext, AppSettings } from '../shared/types';
import { DEFAULT_BACKEND_URL } from '../shared/constants';
import { generateId } from '../shared/messages';
import Header from './components/Header';
import ChatMessage from './components/ChatMessage';
import FollowUpChips from './components/FollowUpChips';
import InputBar from './components/InputBar';
import VoiceControls from './components/VoiceControls';
import { useVoice } from './hooks/useVoice';
import { useTheme } from './hooks/useTheme';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  mode: 'teacher',
  autoSpeak: false,
  voiceSpeed: 1.0,
  voiceIndex: 0,
  backendUrl: DEFAULT_BACKEND_URL,
  nvidiaApiKey: '',
};

export default function App() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voice = useVoice();
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    chrome.storage.local.get('settings', (data) => {
      if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
    });
    refreshPageContext();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    const listener = (message: { type: string; payload?: { text: string } }) => {
      if (message.type === 'EXPLAIN_SELECTION' && message.payload) {
        handleExplain(message.payload.text);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [settings, pageContext, messages]);

  const refreshPageContext = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_CONTENT' }, (response) => {
        if (response) setPageContext(response as PageContext);
      });
    });
  }, []);

  const handleExplain = useCallback(async (text: string) => {
    if (isLoading) return;

    const userMsg: ConversationMessage = {
      id: generateId(),
      role: 'user',
      content: text.startsWith('[') ? 'Explain this section' : `Explain: "${text}"`,
      timestamp: Date.now(),
      selectedText: text.startsWith('[') ? undefined : text,
      mode: settings.mode,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingContent('');

    try {
      const response = await fetch(`${settings.backendUrl}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText: text,
          pageContext: pageContext ? {
            url: pageContext.url,
            title: pageContext.title,
            chunks: pageContext.chunks,
            headings: pageContext.headings,
          } : { url: '', title: '', chunks: [], headings: [] },
          conversationHistory: messages.slice(-10),
          mode: settings.mode,
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) {
              fullContent += token;
              setStreamingContent(fullContent);
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }

      const assistantMsg: ConversationMessage = {
        id: generateId(),
        role: 'assistant',
        content: fullContent,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingContent('');

      if (settings.autoSpeak && fullContent) {
        voice.speak(fullContent);
      }
    } catch (error) {
      const errContent = error instanceof Error
        ? `Sorry, I couldn't connect to the backend. Make sure it's running at ${settings.backendUrl}\n\nError: ${error.message}`
        : 'Something went wrong. Please try again.';

      setMessages((prev) => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: errContent,
        timestamp: Date.now(),
      }]);
      setStreamingContent('');
    }

    setIsLoading(false);
  }, [isLoading, settings, pageContext, messages, voice]);

  const handleFollowUp = useCallback((text: string) => {
    handleExplain(text);
  }, [handleExplain]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setStreamingContent('');
    voice.stop();
  }, [voice]);

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Header
        mode={settings.mode}
        onModeChange={(mode) => {
          setSettings((prev) => ({ ...prev, mode }));
          chrome.storage.local.set({ settings: { ...settings, mode } });
        }}
        theme={theme}
        onThemeToggle={toggleTheme}
        onRefresh={refreshPageContext}
        onClear={clearChat}
      />

      <VoiceControls
        isPlaying={voice.isPlaying}
        isPaused={voice.isPaused}
        voices={voice.voices}
        currentVoice={voice.currentVoice}
        speed={voice.speed}
        onPause={voice.pause}
        onResume={voice.resume}
        onStop={voice.stop}
        onSpeedChange={voice.setSpeed}
        onVoiceChange={voice.setVoice}
      />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !streamingContent && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-4xl mb-3">✦</div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Lumina AI
            </h2>
            <p className="text-sm max-w-[260px]" style={{ color: 'var(--text-secondary)' }}>
              Hi! I&apos;m <strong>Astra</strong>, your AI companion. Select text on any webpage and I&apos;ll explain it naturally.
            </p>
            <p className="text-xs mt-3" style={{ color: 'var(--text-tertiary)' }}>
              Or use the &ldquo;Explain From Here&rdquo; button on any page
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onReadAloud={msg.role === 'assistant' ? voice.speak : undefined}
          />
        ))}

        {streamingContent && (
          <ChatMessage
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              timestamp: Date.now(),
            }}
          />
        )}

        {isLoading && !streamingContent && (
          <div className="flex justify-start mb-3">
            <div
              className="rounded-2xl px-4 py-3"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="typing-dots" style={{ color: 'var(--text-secondary)' }}>
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length > 0 && <FollowUpChips onSelect={handleFollowUp} />}

      <InputBar onSend={handleExplain} disabled={isLoading} />
    </div>
  );
}
