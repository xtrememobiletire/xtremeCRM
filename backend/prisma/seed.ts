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

async function main() {
  console.log('🌱 Seeding XtremeCRM database...');

  const passwordHash = await bcrypt.hash('AdminPassword123!', 10);

  // 1. Seed Internal Staff Users across all 6 roles
  const users = [
    {
      email: 'admin@xtremecrm.com',
      fullName: 'Super Admin',
      role: 'ADMIN' as const,
      countryCode: 'CA' as const,
      phone: '+14165550199',
      isAgentActive: true,
    },
    {
      email: 'agent@xtremecrm.com',
      fullName: 'Sarah Agent',
      role: 'CALL_AGENT' as const,
      countryCode: 'CA' as const,
      phone: '+14165550101',
      isAgentActive: true,
    },
    {
      email: 'dispatcher@xtremecrm.com',
      fullName: 'Dave Dispatcher',
      role: 'DISPATCHER' as const,
      countryCode: 'CA' as const,
      phone: '+14165550102',
      isAgentActive: false,
    },
    {
      email: 'driver@xtremecrm.com',
      fullName: 'Dan Driver',
      role: 'DRIVER' as const,
      countryCode: 'CA' as const,
      phone: '+14165550103',
      isAgentActive: false,
    },
    {
      email: 'accountant@xtremecrm.com',
      fullName: 'Alice Accountant',
      role: 'ACCOUNTANT' as const,
      countryCode: 'CA' as const,
      phone: '+14165550104',
      isAgentActive: false,
    },
    {
      email: 'va@xtremecrm.com',
      fullName: 'Victor Assistant',
      role: 'VIRTUAL_ASSISTANT' as const,
      countryCode: 'US' as const,
      phone: '+17035550105',
      isAgentActive: false,
    },
  ];

  const createdUsers: Record<string, any> = {};

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        role: u.role,
        countryCode: u.countryCode,
        phone: u.phone,
        isAgentActive: u.isAgentActive,
      },
      create: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        countryCode: u.countryCode,
        phone: u.phone,
        isAgentActive: u.isAgentActive,
      },
    });
    createdUsers[u.role] = user;
    console.log(`✅ Seeded ${u.role}: ${user.email} (${user.id})`);
  }

  // 2. Seed B2B Fleet Account (KT Group)
  const fleet = await prisma.fleet.upsert({
    where: { fleetCode: 'XMT-5132' },
    update: {},
    create: {
      fleetCode: 'XMT-5132',
      name: 'KT Group',
      contactPerson: 'Piratheep',
      phone: '+17035550144',
      email: 'piratheep@xtrememobiletire.com',
      address: '10100 Richmond Hwy, Lorton, VA 22079',
      website: 'https://ktgroup.com',
      countryCode: 'US',
      status: 'APPROVED',
      contractSignedAt: new Date(),
      virtualAssistantId: createdUsers['VIRTUAL_ASSISTANT']?.id,
    },
  });
  console.log(`✅ Seeded Fleet: ${fleet.name} [${fleet.fleetCode}]`);

  // Seed Fleet Vehicles
  await prisma.vehicle.upsert({
    where: {
      countryCode_licensePlate: {
        countryCode: 'US',
        licensePlate: 'KT-15',
      },
    },
    update: {},
    create: {
      fleetId: fleet.id,
      countryCode: 'US',
      year: 2022,
      make: 'Freightliner',
      model: 'Cascadia',
      licensePlate: 'KT-15',
      tireSize: '11R22.5',
    },
  });

  await prisma.vehicle.upsert({
    where: {
      countryCode_licensePlate: {
        countryCode: 'US',
        licensePlate: 'KT-18',
      },
    },
    update: {},
    create: {
      fleetId: fleet.id,
      countryCode: 'US',
      year: 2023,
      make: 'Kenworth',
      model: 'T680',
      licensePlate: 'KT-18',
      tireSize: '11R22.5',
    },
  });
  console.log(`✅ Seeded Fleet Vehicles: KT-15, KT-18`);

  // Seed Fleet Driver for 24/7 Roadside Verification
  await prisma.fleetDriver.upsert({
    where: {
      fleetId_phone: {
        fleetId: fleet.id,
        phone: '+17035550199',
      },
    },
    update: {},
    create: {
      fleetId: fleet.id,
      fullName: 'John Driver',
      phone: '+17035550199',
      licensePlate: 'KT-15',
      isActive: true,
    },
  });
  console.log(`✅ Seeded Fleet Driver: John Driver (+17035550199)`);

  // 3. Seed B2C Customer Profile
  const customer = await prisma.customer.upsert({
    where: {
      countryCode_phone: {
        countryCode: 'CA',
        phone: '+14165550100',
      },
    },
    update: {},
    create: {
      fullName: 'Alex Smith',
      phone: '+14165550100',
      email: 'alex.smith@example.com',
      countryCode: 'CA',
      customerType: 'RETAIL',
    },
  });
  console.log(`✅ Seeded Customer: ${customer.fullName} (${customer.phone})`);

  // Seed Customer Vehicle
  const customerVehicle = await prisma.vehicle.upsert({
    where: {
      countryCode_licensePlate: {
        countryCode: 'CA',
        licensePlate: 'ON-CXR4',
      },
    },
    update: {},
    create: {
      customerId: customer.id,
      countryCode: 'CA',
      year: 2021,
      make: 'Toyota',
      model: 'RAV4',
      licensePlate: 'ON-CXR4',
      tireSize: '225/65R17',
    },
  });
  console.log(`✅ Seeded Customer Vehicle: 2021 Toyota RAV4 [ON-CXR4]`);

  // 4. Seed Initial Sample Job with 16-Service Catalog Item
  const sampleJob = await prisma.job.upsert({
    where: { jobCode: 'JOB-CA-00101' },
    update: {},
    create: {
      jobCode: 'JOB-CA-00101',
      customerId: customer.id,
      vehicleId: customerVehicle.id,
      createdById: createdUsers['CALL_AGENT']?.id,
      driverId: createdUsers['DRIVER']?.id,
      countryCode: 'CA',
      currency: 'CAD',
      status: 'ASSIGNED',
      urgency: 'URGENT',
      source: 'DIRECT_CALL',
      recipientName: customer.fullName,
      recipientPhone: customer.phone,
      serviceAddress: '857 Winterton Way, Mississauga, ON L5V 1Z5',
      problemNotes: 'Front right flat tire on highway shoulder, locking lug nut in glovebox',
      subtotalCents: 16000,
      taxRateBps: 1300, // 13.00% HST Ontario
      taxAmountCents: 2080,
      totalCents: 18080, // $180.80 CAD
      paymentMethod: 'POS',
      paymentStatus: 'UNPAID',
      serviceItems: {
        create: [
          {
            serviceName: 'Tire Repair (plug)',
            category: 'TIRE_SERVICE',
            unitPriceCents: 16000,
            quantity: 1,
          },
        ],
      },
    },
  });
  console.log(`✅ Seeded Sample Job: ${sampleJob.jobCode} ($180.80 CAD)`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
