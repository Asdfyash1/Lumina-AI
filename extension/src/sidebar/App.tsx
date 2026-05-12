import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ConversationMessage, ExplanationMode, PageContext, AppSettings } from '../shared/types';
import { generateId } from '../shared/messages';
import { streamExplanation } from '../shared/nvidia-api';
import { buildSystemPrompt, buildContextPrompt } from '../shared/prompts';
import { indexPageChunks, buildContextFromChunks } from '../shared/rag-pipeline';
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
  backendUrl: '',
  nvidiaApiKey: '',
};

export default function App() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voice = useVoice();
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    chrome.storage.local.get(['settings', 'nvidiaApiKey'], (data) => {
      if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
      setHasApiKey(!!data.nvidiaApiKey);
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
      // RAG: index page chunks and retrieve relevant context
      let relevantChunks: string[] = [];
      if (pageContext && pageContext.chunks.length > 0) {
        try {
          await indexPageChunks(pageContext.url, pageContext.chunks);
          relevantChunks = await buildContextFromChunks(pageContext.url, text, pageContext.chunks, 5);
        } catch {
          // RAG optional — continue without it
        }
      }

      const isTeachingMode = text.startsWith('[Teaching Mode');
      const sectionMatch = text.match(/Section (\d+)\/(\d+)/);

      const systemPrompt = buildSystemPrompt(settings.mode);
      const contextPrompt = buildContextPrompt({
        selectedText: text,
        pageTitle: pageContext?.title || 'Unknown page',
        pageUrl: pageContext?.url || '',
        headings: pageContext?.headings || [],
        relevantChunks,
        isTeachingMode,
        sectionNumber: sectionMatch ? parseInt(sectionMatch[1]) : undefined,
        totalSections: sectionMatch ? parseInt(sectionMatch[2]) : undefined,
      });

      const apiMessages: { role: string; content: string }[] = [
        { role: 'system', content: systemPrompt },
      ];
      for (const msg of messages.slice(-6)) {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
      apiMessages.push({ role: 'user', content: contextPrompt });

      let fullContent = '';

      await streamExplanation(
        apiMessages,
        (token) => {
          fullContent += token;
          setStreamingContent(fullContent);
        },
        () => {
          const assistantMsg: ConversationMessage = {
            id: generateId(),
            role: 'assistant',
            content: fullContent,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setStreamingContent('');
          setIsLoading(false);

          if (settings.autoSpeak && fullContent) {
            voice.speak(fullContent);
          }
        },
        (errMsg) => {
          setMessages((prev) => [...prev, {
            id: generateId(),
            role: 'assistant',
            content: errMsg.includes('API key not set')
              ? `**Setup needed!** Right-click the Lumina AI icon in your toolbar and select **"Options"** to add your free NVIDIA API key.\n\nGet one free at [build.nvidia.com](https://build.nvidia.com/)`
              : `Sorry, something went wrong.\n\n${errMsg}`,
            timestamp: Date.now(),
          }]);
          setStreamingContent('');
          setIsLoading(false);
        }
      );
    } catch (error) {
      const errContent = error instanceof Error
        ? `Error: ${error.message}`
        : 'Something went wrong. Please try again.';

      setMessages((prev) => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: errContent,
        timestamp: Date.now(),
      }]);
      setStreamingContent('');
      setIsLoading(false);
    }
  }, [isLoading, settings, pageContext, messages, voice]);

  const handleFollowUp = useCallback((text: string) => {
    handleExplain(text);
  }, [handleExplain]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setStreamingContent('');
    voice.stop();
  }, [voice]);

  const openSettings = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

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
            <div className="text-4xl mb-3">{'\u2726'}</div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Lumina AI
            </h2>
            <p className="text-sm max-w-[260px]" style={{ color: 'var(--text-secondary)' }}>
              Hi! I&apos;m <strong>Astra</strong>, your AI companion. Select text on any webpage and I&apos;ll explain it naturally.
            </p>
            {!hasApiKey && (
              <button
                onClick={openSettings}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                Set up NVIDIA API Key (free)
              </button>
            )}
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
