import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding XtremeCRM database...');

  const passwordHash = await bcrypt.hash('AdminPassword123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@xtremecrm.com' },
    update: {},
    create: {
      email: 'admin@xtremecrm.com',
      passwordHash,
      fullName: 'Super Admin',
      role: 'ADMIN',
      countryCode: 'CA',
      phone: '+14165550199',
      isAgentActive: true,
    },
  });

  console.log(✅ Seeded Super Admin:  (id: ));
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.();
    await pool.end();
  });
