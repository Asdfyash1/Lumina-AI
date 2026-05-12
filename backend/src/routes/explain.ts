import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { streamChatCompletion } from '../services/nvidia-client';
import { indexPageChunks, buildContextFromChunks } from '../services/rag-pipeline';
import { buildSystemPrompt, buildContextPrompt } from '../services/prompts';
import { ExplainRequestBody } from '../services/types';

export async function explainRoute(server: FastifyInstance): Promise<void> {
  server.post(
    '/api/explain',
    async (request: FastifyRequest<{ Body: ExplainRequestBody }>, reply: FastifyReply) => {
      const { selectedText, followUp, pageContext, conversationHistory, mode } = request.body;
      if (!selectedText && !followUp) return reply.code(400).send({ error: 'No text to explain' });

      const query = followUp || selectedText || '';
      let relevantChunks: string[] = [];
      if (pageContext && pageContext.chunks.length > 0) {
        try {
          await indexPageChunks(pageContext.url, pageContext.chunks);
          relevantChunks = await buildContextFromChunks(pageContext.url, query, pageContext.chunks, 5);
        } catch (error) {
          console.error('RAG indexing error:', error);
        }
      }

      const isTeachingMode = selectedText?.startsWith('[Teaching Mode');
      const sectionMatch = selectedText?.match(/Section (\d+)\/(\d+)/);

      const systemPrompt = buildSystemPrompt(mode);
      const contextPrompt = buildContextPrompt({
        selectedText: query,
        pageTitle: pageContext?.title || 'Unknown page',
        pageUrl: pageContext?.url || '',
        headings: pageContext?.headings || [],
        relevantChunks,
        isTeachingMode: !!isTeachingMode,
        sectionNumber: sectionMatch ? parseInt(sectionMatch[1]) : undefined,
        totalSections: sectionMatch ? parseInt(sectionMatch[2]) : undefined,
      });

      const messages: { role: string; content: string }[] = [
        { role: 'system', content: systemPrompt },
      ];
      for (const msg of conversationHistory.slice(-6)) {
        messages.push({ role: msg.role, content: msg.content });
      }
      messages.push({ role: 'user', content: contextPrompt });

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      try {
        for await (const token of streamChatCompletion(messages)) {
          const data = JSON.stringify({ choices: [{ delta: { content: token } }] });
          reply.raw.write(`data: ${data}\n\n`);
        }
        reply.raw.write('data: [DONE]\n\n');
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        reply.raw.write(`data: ${JSON.stringify({ choices: [{ delta: { content: `\n\nError: ${errMsg}` } }] })}\n\n`);
        reply.raw.write('data: [DONE]\n\n');
      }
      reply.raw.end();
    }
  );
}
