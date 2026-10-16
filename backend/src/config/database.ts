import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

const connectionString = config.DATABASE_URL;

export const pool = new pg.Pool({
  connectionString,
  max: 25,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  keepAlive: true,
});

pool.on('error', (err) => {
  logger.error('[Database] Unexpected error on idle client', err);
});

const adapter = new PrismaPg(pool);

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    adapter,
    log: config.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  // Default interactive transaction options: 15s maxWait, 30s timeout (prevents 5000ms expiration on busy DB)
  const defaultTxOptions = {
    maxWait: 15000,
    timeout: 30000,
  };

  const originalTransaction = client.$transaction.bind(client);
  (client as any).$transaction = (arg: any, options?: any) => {
    if (typeof arg === 'function') {
      return originalTransaction(arg, {
        ...defaultTxOptions,
        ...options,
      });
    }
    return originalTransaction(arg, options);
  };

  return client;
}

export const prisma = globalThis.__prisma || createPrismaClient();

if (config.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export default prisma;
