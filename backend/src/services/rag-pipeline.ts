import { createEmbeddings } from './nvidia-client';
import { upsertPage, queryPage, hasPage } from './vector-store';
import { PageChunk } from './types';

export async function indexPageChunks(url: string, chunks: PageChunk[]): Promise<void> {
  if (hasPage(url)) return;
  const texts = chunks.map((c) => c.text);
  if (texts.length === 0) return;

  try {
    const embeddings = await createEmbeddings(texts);
    const entries = chunks.map((chunk, i) => ({
      id: chunk.id, text: chunk.text, heading: chunk.heading,
      embedding: embeddings[i] || [],
    }));
    upsertPage(url, entries);
  } catch (error) {
    console.error('Failed to index page chunks:', error);
  }
}

export async function retrieveRelevantChunks(
  url: string, query: string, topK = 5
): Promise<{ text: string; heading?: string; score: number }[]> {
  try {
    const [queryEmbedding] = await createEmbeddings([query]);
    if (!queryEmbedding) return [];
    const results = queryPage(url, queryEmbedding, topK);
    return results.length > 0 ? results : [];
  } catch {
    return [];
  }
}

export async function buildContextFromChunks(
  url: string, query: string, allChunks: PageChunk[], topK = 5
): Promise<string[]> {
  const vectorResults = await retrieveRelevantChunks(url, query, topK);
  if (vectorResults.length > 0) {
    return vectorResults.map((r) => {
      const prefix = r.heading ? `[${r.heading}] ` : '';
      return prefix + r.text;
    });
  }

  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const scored = allChunks.map((chunk) => {
    const lower = chunk.text.toLowerCase();
    let score = 0;
    for (const word of queryWords) { if (lower.includes(word)) score++; }
    return { chunk, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).filter((s) => s.score > 0).map((s) => {
    const prefix = s.chunk.heading ? `[${s.chunk.heading}] ` : '';
    return prefix + s.chunk.text;
  });
}
