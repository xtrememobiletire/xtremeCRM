import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { config } from './env.js';

const connectionString = config.DATABASE_URL;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    adapter,
    log: config.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (config.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export default prisma;
