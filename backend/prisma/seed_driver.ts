import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedDriver() {
  console.log('🚀 Seeding Driver Operations Account (DOA) for Babu Singh...');

  // Hash temporary credentials
  const passwordHash = await bcrypt.hash('Xtreme@Jang', 10);

  // 1. Upsert Babu Singh User record
  const driver = await prisma.user.upsert({
    where: { email: 'Paytojang@gmail.com' },
    update: {
      fullName: 'Babu Singh',
      passwordHash,
      role: 'DRIVER',
      countryCode: 'CA',
      phone: '+14377873377',
      isAgentActive: true,
      address: '1401 Springwater Crescent, Oshawa, ON L1K 2N4',
      assignedVehicle: 'Nissan NV 3500',
      workingDays: '7 Days a Week',
      workingHours: '9:00 AM – 8:00 PM',
      approvedByName: 'Harry King',
    },
    create: {
      email: 'Paytojang@gmail.com',
      passwordHash,
      fullName: 'Babu Singh',
      role: 'DRIVER',
      countryCode: 'CA',
      phone: '+14377873377',
      isAgentActive: true,
      address: '1401 Springwater Crescent, Oshawa, ON L1K 2N4',
      assignedVehicle: 'Nissan NV 3500',
      workingDays: '7 Days a Week',
      workingHours: '9:00 AM – 8:00 PM',
      approvedByName: 'Harry King',
    },
  });

  console.log(`✅ Driver user successfully provisioned:`);
  console.log(`   ID: ${driver.id}`);
  console.log(`   Name: ${driver.fullName}`);
  console.log(`   Email: ${driver.email}`);
  console.log(`   Phone: ${driver.phone}`);
  console.log(`   Role: ${driver.role}`);
  console.log(`   Vehicle: ${driver.assignedVehicle}`);
  console.log(`   Schedule: ${driver.workingDays} (${driver.workingHours})`);
  console.log(`   Approved By: ${driver.approvedByName}`);

  // 2. Assign 1 sample Oshawa roadside tire job for first shift check
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', countryCode: 'CA' },
  });

  if (admin) {
    // Find or create customer
    const customer = await prisma.customer.upsert({
      where: {
        countryCode_phone: {
          countryCode: 'CA',
          phone: '+19055550188',
        },
      },
      update: {},
      create: {
        fullName: 'Dave Roadside (Oshawa CX)',
        phone: '+19055550188',
        email: 'dave.oshawa@example.com',
        countryCode: 'CA',
        customerType: 'RETAIL',
      },
    });

    // Find or create vehicle
    const vehicle = await prisma.vehicle.upsert({
      where: {
        countryCode_licensePlate: {
          countryCode: 'CA',
          licensePlate: 'OSH-401',
        },
      },
      update: {},
      create: {
        customerId: customer.id,
        countryCode: 'CA',
        licensePlate: 'OSH-401',
        make: 'Ford',
        model: 'F-150',
        year: 2022,
        tireSize: '275/65R18',
        unitNumber: 'U-1',
      },
    });

    const jobCode = 'JOB-CA-9001';
    const testJob = await prisma.job.upsert({
      where: { jobCode },
      update: {
        driverId: driver.id,
        status: 'ASSIGNED',
      },
      create: {
        jobCode,
        customerId: customer.id,
        vehicleId: vehicle.id,
        driverId: driver.id,
        createdById: admin.id,
        countryCode: 'CA',
        source: 'DIRECT_CALL',
        status: 'ASSIGNED',
        urgency: 'URGENT',
        serviceAddress: '1401 Springwater Crescent, Oshawa, ON L1K 2N4',
        recipientName: 'Dave Roadside',
        recipientPhone: '+19055550188',
        problemNotes: '[Oshawa Shift Prep] Flat passenger rear tire on shoulder. Mobile replacement requested. Nissan NV 3500 equipped.',
        totalCents: 18000,
        subtotalCents: 18000,
        currency: 'CAD',
        serviceItems: {
          create: [
            {
              serviceName: 'Emergency Mobile Tire Service',
              category: 'TIRE_SERVICE',
              unitPriceCents: 18000,
              quantity: 1,
              notes: 'Tire 275/65R18',
            },
          ],
        },
      },
    });

    console.log(`✅ Sample assigned roadside job prepared: #${testJob.jobCode} (Status: ${testJob.status})`);
  }

  // 3. Verify password hash matches temporary credential
  const isMatch = await bcrypt.compare('Xtreme@Jang', driver.passwordHash);
  console.log(`🔒 Credential verification check (Xtreme@Jang): ${isMatch ? 'PASSED' : 'FAILED'}`);
}

seedDriver()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
