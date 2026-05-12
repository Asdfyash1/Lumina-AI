import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ocrImage } from '../services/nvidia-client';
import { OcrRequestBody } from '../services/types';

export async function ocrRoute(server: FastifyInstance): Promise<void> {
  server.post(
    '/api/ocr',
    async (request: FastifyRequest<{ Body: OcrRequestBody }>, reply: FastifyReply) => {
      const { imageBase64, mimeType } = request.body;
      if (!imageBase64) return reply.code(400).send({ error: 'No image provided' });

      try {
        const extractedText = await ocrImage(imageBase64, mimeType || 'image/png');
        return reply.send({ extractedText });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({ error: errMsg });
      }
    }
  );
}
