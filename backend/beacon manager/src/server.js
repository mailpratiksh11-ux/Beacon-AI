import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { redis } from './config/redis.js';
import { initSocket, closeSocket } from './realtime/socket.js';
import { emailQueue } from './queue/email.queue.js';
import { startEmailWorker } from './queue/email.worker.js';

async function start() {
  await connectDB();
  await redis.connect();

  // Wrap Express in an HTTP server so Socket.IO can share the same port.
  const server = http.createServer(app);
  await initSocket(server);

  // Background bulk-send queue + worker (no-op if Redis is unavailable).
  await emailQueue.init();
  startEmailWorker();

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Beacon AI API running on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received — shutting down gracefully…`);
    await closeSocket();
    await redis.quit();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled Rejection:', reason);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
