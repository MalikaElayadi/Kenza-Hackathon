import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { Client as PgClient } from 'pg';
import { createClient } from 'redis';

const fastify = Fastify({ logger: true });
const pgClient = new PgClient({
  connectionString: process.env.DATABASE_URL,
});
const redisClient = createClient({
  url: process.env.REDIS_URL,
});

// Register plugins
await fastify.register(fastifyCors, {
  origin: '*',
});

await fastify.register(fastifyWebsocket);

// Health check
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    postgres: (await pgClient.query('SELECT 1')).rowCount ? 'ok' : 'error',
    redis: 'ok',
  };
});

// WebSocket endpoint (placeholder)
fastify.get('/ws', { websocket: true }, async (socket) => {
  console.log('WebSocket client connected');
  socket.on('message', (message: unknown) => {
    console.log('Message received:', message);
    socket.send(JSON.stringify({ echo: message }));
  });
  socket.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Start server
const start = async () => {
  try {
    await pgClient.connect();
    console.log('✅ Connected to PostgreSQL');

    await redisClient.connect();
    console.log('✅ Connected to Redis');

    const port = parseInt(process.env.API_PORT || '3001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`✅ API listening on port ${port}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await fastify.close();
  await pgClient.end();
  await redisClient.disconnect();
  process.exit(0);
});
