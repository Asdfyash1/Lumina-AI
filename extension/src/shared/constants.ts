export const DEFAULT_BACKEND_URL = 'http://localhost:3456';

export const MODE_LABELS: Record<string, string> = {
  friend: 'Friend',
  teacher: 'Teacher',
  beginner: 'Beginner',
  eli5: 'ELI5',
  'deep-dive': 'Deep Dive',
  'senior-engineer': 'Senior Engineer',
};

export const MODE_DESCRIPTIONS: Record<string, string> = {
  friend: 'Casual, conversational, uses everyday language',
  teacher: 'Structured, clear, builds understanding step by step',
  beginner: 'Simple vocabulary, lots of analogies, no jargon',
  eli5: 'Explain like I\'m 5 — the simplest possible explanation',
  'deep-dive': 'Thorough, technical, covers edge cases and nuances',
  'senior-engineer': 'Precise, assumes expertise, focuses on implementation details',
};

export const FOLLOW_UP_SUGGESTIONS = [
  'Explain simpler',
  'Why does this matter?',
  'Give an analogy',
  'Real-world example?',
  'Step by step please',
  'What does this term mean?',
  'Teach like a professor',
];

export const MAX_CHUNK_SIZE = 1500;
export const CHUNK_OVERLAP = 200;
export const TOP_K_CHUNKS = 5;
