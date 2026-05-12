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

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ExplainRequestBody {
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

export interface EmbedRequestBody {
  chunks: { id: string; text: string }[];
}

export interface OcrRequestBody {
  imageBase64: string;
  mimeType?: string;
}
