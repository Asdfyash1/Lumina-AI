export type ExplanationMode =
  | 'friend'
  | 'teacher'
  | 'beginner'
  | 'eli5'
  | 'deep-dive'
  | 'senior-engineer';

export interface PageChunk {
  id: string;
  text: string;
  heading?: string;
  index: number;
  embedding?: number[];
}

export interface PageContext {
  url: string;
  title: string;
  chunks: PageChunk[];
  headings: string[];
  fullText: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  selectedText?: string;
  mode?: ExplanationMode;
}

export interface ExplainRequest {
  selectedText?: string;
  followUp?: string;
  pageContext: {
    url: string;
    title: string;
    chunks: PageChunk[];
    headings: string[];
  };
  conversationHistory: ConversationMessage[];
  mode: ExplanationMode;
}

export interface VoiceState {
  isPlaying: boolean;
  isPaused: boolean;
  speed: number;
  voiceIndex: number;
  currentSentenceIndex: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  mode: ExplanationMode;
  autoSpeak: boolean;
  voiceSpeed: number;
  voiceIndex: number;
  backendUrl: string;
  nvidiaApiKey: string;
}

export type MessageType =
  | { type: 'GET_PAGE_CONTENT' }
  | { type: 'PAGE_CONTENT'; payload: PageContext }
  | { type: 'TEXT_SELECTED'; payload: { text: string; rect: DOMRect } }
  | { type: 'EXPLAIN_SELECTION'; payload: { text: string } }
  | { type: 'OPEN_SIDEBAR' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'HIGHLIGHT_SENTENCE'; payload: { index: number } }
  | { type: 'CLEAR_HIGHLIGHTS' };
