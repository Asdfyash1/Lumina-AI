interface VectorEntry {
  id: string;
  text: string;
  heading?: string;
  embedding: number[];
}

interface PageStore {
  entries: VectorEntry[];
  url: string;
  createdAt: number;
}

const stores = new Map<string, PageStore>();
const MAX_CACHE_SIZE = 50;
const CACHE_TTL = 30 * 60 * 1000;

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function upsertPage(url: string, entries: VectorEntry[]): void {
  if (stores.size >= MAX_CACHE_SIZE) {
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [key, store] of stores) {
      if (store.createdAt < oldestTime) { oldestTime = store.createdAt; oldestKey = key; }
    }
    if (oldestKey) stores.delete(oldestKey);
  }
  stores.set(url, { entries, url, createdAt: Date.now() });
}

export function queryPage(
  url: string, queryEmbedding: number[], topK = 5
): { id: string; text: string; heading?: string; score: number }[] {
  const store = stores.get(url);
  if (!store) return [];
  const scored = store.entries.map((entry) => ({
    id: entry.id, text: entry.text, heading: entry.heading,
    score: cosineSimilarity(queryEmbedding, entry.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function hasPage(url: string): boolean {
  const store = stores.get(url);
  if (!store) return false;
  if (Date.now() - store.createdAt > CACHE_TTL) { stores.delete(url); return false; }
  return true;
}

export function getPageChunks(url: string): VectorEntry[] {
  return stores.get(url)?.entries || [];
}
