import { prisma } from '../config/database.js';

export const checkDatabaseHealth = async () => {
  const userCount = await prisma.user.count();
  return {
    status: 'ok',
    service: 'xtremecrm-backend',
    database: 'connected (Neon PostgreSQL via PgBouncer pooler)',
    userCount,
  };
};

export default {
  checkDatabaseHealth,
};
