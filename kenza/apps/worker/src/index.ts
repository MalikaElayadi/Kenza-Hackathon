import { Client as PgClient } from 'pg';
import { createClient } from 'redis';
import { Worker } from 'bullmq';

const pgClient = new PgClient({
  connectionString: process.env.DATABASE_URL,
});

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

// Initialize worker
const initializeWorker = async () => {
  try {
    await pgClient.connect();
    console.log('✅ Worker connected to PostgreSQL');

    await redisClient.connect();
    console.log('✅ Worker connected to Redis');

    // Create BullMQ worker for relances
    const relanceWorker = new Worker(
      'relances',
      async (job) => {
        console.log(`Processing relance job: ${job.id}`);
        const { conversationId, language } = job.data as { conversationId: string; language: string };
        const conversation = await pgClient.query('SELECT cart FROM conversations WHERE id = $1', [conversationId]);
        if (!conversation.rows[0]?.cart?.length) return { skipped: true, reason: 'empty_cart' };
        const alreadySent = await pgClient.query('SELECT 1 FROM relances WHERE conversation_id = $1 LIMIT 1', [conversationId]);
        if (alreadySent.rowCount) return { skipped: true, reason: 'already_sent' };
        const variante = Number(job.id?.toString().replace(/\D/g, '').slice(-1) || 0) % 2 === 0 ? 'A' : 'B';
        const messages: Record<string, string> = {
          fr: 'Votre panier est toujours disponible. Souhaitez-vous finaliser votre commande ?',
          ar: 'سلتكم مازالت محفوظة. هل تريدون إتمام الطلب؟',
          darija: 'Panier dyalk mazal محفوظ. Bghiti nkemlou commande ?',
        };
        await pgClient.query('INSERT INTO relances (conversation_id, variante, planifiee_a, envoyee_a, resultat) VALUES ($1, $2, NOW(), NOW(), $3)', [conversationId, variante, 'SENT']);
        await pgClient.query(`INSERT INTO messages (conversation_id, role, texte, langue, intention, latency_ms) VALUES ($1, 'agent', $2, $3, 'panier_abandonne', 0)`, [conversationId, messages[language] ?? messages.fr, language]);
        return { success: true, jobId: job.id, variante };
      },
      {
        connection: redisClient as any,
      }
    );

    relanceWorker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed`);
    });

    relanceWorker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} failed:`, err);
    });

    console.log('✅ Worker initialized');
  } catch (error) {
    console.error('❌ Worker initialization error:', error);
    process.exit(1);
  }
};

// Start worker
initializeWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down worker...');
  await pgClient.end();
  await redisClient.disconnect();
  process.exit(0);
});
