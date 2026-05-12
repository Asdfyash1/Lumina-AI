import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { explainRoute } from './routes/explain';
import { embedRoute } from './routes/embed';
import { ocrRoute } from './routes/ocr';

const server = Fastify({ logger: true });

server.register(cors, { origin: '*' });
server.register(explainRoute);
server.register(embedRoute);
server.register(ocrRoute);

server.get('/health', async () => ({
  status: 'ok',
  timestamp: Date.now(),
  message: 'Human Explain AI backend is running',
}));

const PORT = parseInt(process.env.PORT || '3456');
const HOST = process.env.HOST || '0.0.0.0';

server.listen({ port: PORT, host: HOST }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
});
