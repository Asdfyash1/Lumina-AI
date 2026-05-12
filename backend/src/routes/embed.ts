import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createEmbeddings } from '../services/nvidia-client';
import { EmbedRequestBody } from '../services/types';

export async function embedRoute(server: FastifyInstance): Promise<void> {
  server.post(
    '/api/embed',
    async (request: FastifyRequest<{ Body: EmbedRequestBody }>, reply: FastifyReply) => {
      const { chunks } = request.body;
      if (!chunks || chunks.length === 0) return reply.code(400).send({ error: 'No chunks provided' });

      try {
        const texts = chunks.map((c) => c.text);
        const embeddings = await createEmbeddings(texts);
        const result = chunks.map((chunk, i) => ({ id: chunk.id, embedding: embeddings[i] || [] }));
        return reply.send({ embeddings: result });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({ error: errMsg });
      }
    }
  );
}
