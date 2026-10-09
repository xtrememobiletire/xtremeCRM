import { prisma } from '../src/config/database.js';

async function migrate() {
  console.log('Running Mapbox schema additions...');
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
  `);
  console.log('Customers table updated.');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE fleets 
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
  `);
  console.log('Fleets table updated.');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE jobs 
      ADD COLUMN IF NOT EXISTS service_latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS service_longitude DOUBLE PRECISION;
  `);
  console.log('Jobs table updated.');

  console.log('Mapbox DB migration complete.');
  await prisma.$disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
