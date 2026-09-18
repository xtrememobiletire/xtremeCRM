import http from 'http';
import { app } from './app.js';
import { config } from './config/env.js';
import { prisma } from './config/database.js';
import { initSocket } from './sockets/index.js';
import { logger } from './utils/logger.js';

const server = http.createServer(app);

// Initialize Socket.io with all handlers
initSocket(server);

// Start HTTP Server
server.listen(config.PORT, () => {
  logger.info(🚀 XtremeCRM backend running at http://localhost:);
  logger.info(🌍 Environment: );
});

// Graceful Shutdown
const shutdown = async (signal: string) => {
  logger.info(Received . Shutting down gracefully...);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.();
    logger.info('Database connections closed.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
