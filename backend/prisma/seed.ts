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
      canApprovePayouts: true,
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
      canApprovePayouts: true,
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
        canApprovePayouts: (u as any).canApprovePayouts,
      },
      create: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        countryCode: u.countryCode,
        phone: u.phone,
        isAgentActive: u.isAgentActive,
        canApprovePayouts: (u as any).canApprovePayouts || false,
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

  // 4. Seed Initial Sample Assigned Job
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

  // 5. Seed UK Customers, Vehicles, and Completed Jobs for Accounting Reconciliation
  const ukCustomersData = [
    { name: 'Metro Couriers UK Ltd', phone: '+442079460111', email: 'dispatch@metrocouriers.co.uk', plate: 'LD21-XMR', make: 'Ford', model: 'Transit Custom', year: 2021, tire: '215/65R16C' },
    { name: 'Sarah Jenkins', phone: '+442079460222', email: 'sarah.j@example.co.uk', plate: 'WN22-BTV', make: 'Vauxhall', model: 'Corsa-e', year: 2022, tire: '195/55R16' },
    { name: 'Apex Transport UK', phone: '+442079460333', email: 'fleet@apextransport.co.uk', plate: 'KP20-ZTA', make: 'Mercedes-Benz', model: 'Sprinter 314', year: 2020, tire: '235/65R16' },
    { name: 'Mark Thompson', phone: '+442079460444', email: 'mark.t@example.co.uk', plate: 'RJ19-YKC', make: 'BMW', model: '320d', year: 2019, tire: '225/45R18' },
    { name: 'Swift Delivery Logistics', phone: '+442079460555', email: 'ops@swiftdelivery.co.uk', plate: 'OV23-PLF', make: 'Renault', model: 'Master', year: 2023, tire: '225/65R16C' },
  ];

  const now = new Date();
  const ukJobsData = [
    {
      jobCode: 'JOB-UK-1001',
      idx: 0,
      daysAgo: 0,
      hoursAgo: 2,
      subtotalCents: 20417,
      taxCents: 4083,
      totalCents: 24500, // £245.00
      materialCostCents: 4500, // £45.00
      repairerFeeCents: 3500,  // £35.00
      otherExpenseCents: 500,  // £5.00
      service: 'Emergency Commercial Tire Plug',
      notes: 'Rear left dual punctured on M25 junction 14',
    },
    {
      jobCode: 'JOB-UK-1002',
      idx: 1,
      daysAgo: 1,
      hoursAgo: 4,
      subtotalCents: 15417,
      taxCents: 3083,
      totalCents: 18500, // £185.00
      materialCostCents: 2500, // £25.00
      repairerFeeCents: 2000,  // £20.00
      otherExpenseCents: 0,
      service: 'Spare Tire Change & Valve Replacement',
      notes: 'Roadside spare fitted on driveway',
    },
    {
      jobCode: 'JOB-UK-1003',
      idx: 2,
      daysAgo: 2,
      hoursAgo: 1,
      subtotalCents: 35000,
      taxCents: 7000,
      totalCents: 42000, // £420.00
      materialCostCents: 12000, // £120.00 wholesale tire
      repairerFeeCents: 5500,  // £55.00 technician fee
      otherExpenseCents: 1000, // £10.00 disposal fee
      service: 'New Commercial Tire Replacement',
      notes: 'Michelin Agilis 235/65R16 replacement at depot',
    },
    {
      jobCode: 'JOB-UK-1004',
      idx: 3,
      daysAgo: 4,
      hoursAgo: 6,
      subtotalCents: 12500,
      taxCents: 2500,
      totalCents: 15000, // £150.00
      materialCostCents: 1500, // £15.00
      repairerFeeCents: 3000, // £30.00
      otherExpenseCents: 500,  // £5.00
      service: 'Tire Swap (ON RIM) + Battery Booster',
      notes: 'Customer stranded in car park, jump started and plugged',
    },
    {
      jobCode: 'JOB-UK-1005',
      idx: 4,
      daysAgo: 6,
      hoursAgo: 3,
      subtotalCents: 31667,
      taxCents: 6333,
      totalCents: 38000, // £380.00
      materialCostCents: 7000, // £70.00
      repairerFeeCents: 4500,  // £45.00
      otherExpenseCents: 500,  // £5.00
      service: 'Dual Tire Replacement & Balance',
      notes: 'Fleet van front steer tires replaced',
    },
  ];

  for (const c of ukCustomersData) {
    const cust = await prisma.customer.upsert({
      where: { countryCode_phone: { countryCode: 'UK', phone: c.phone } },
      update: {},
      create: {
        fullName: c.name,
        phone: c.phone,
        email: c.email,
        countryCode: 'UK',
        customerType: 'RETAIL',
      },
    });

    await prisma.vehicle.upsert({
      where: { countryCode_licensePlate: { countryCode: 'UK', licensePlate: c.plate } },
      update: {},
      create: {
        customerId: cust.id,
        countryCode: 'UK',
        year: c.year,
        make: c.make,
        model: c.model,
        licensePlate: c.plate,
        tireSize: c.tire,
      },
    });
  }

  for (const j of ukJobsData) {
    const c = ukCustomersData[j.idx];
    const cust = await prisma.customer.findUnique({
      where: { countryCode_phone: { countryCode: 'UK', phone: c.phone } },
    });
    const veh = await prisma.vehicle.findUnique({
      where: { countryCode_licensePlate: { countryCode: 'UK', licensePlate: c.plate } },
    });

    if (!cust || !veh) continue;

    const jobDate = new Date(now);
    jobDate.setDate(jobDate.getDate() - j.daysAgo);
    jobDate.setHours(jobDate.getHours() - j.hoursAgo);

    await prisma.job.upsert({
      where: { jobCode: j.jobCode },
      update: {
        status: 'COMPLETED',
        completedAt: jobDate,
        totalCents: j.totalCents,
        materialCostCents: j.materialCostCents,
        repairerFeeCents: j.repairerFeeCents,
        otherExpenseCents: j.otherExpenseCents,
        itPlatformFeeCents: 100, // £1.00 GBP
      },
      create: {
        jobCode: j.jobCode,
        customerId: cust.id,
        vehicleId: veh.id,
        createdById: createdUsers['CALL_AGENT']?.id,
        driverId: createdUsers['DRIVER']?.id,
        countryCode: 'UK',
        currency: 'GBP',
        status: 'COMPLETED',
        urgency: 'STANDARD',
        source: 'DIRECT_CALL',
        recipientName: cust.fullName,
        recipientPhone: cust.phone,
        serviceAddress: 'London Regional Corridor, UK',
        problemNotes: j.notes,
        subtotalCents: j.subtotalCents,
        taxRateBps: 2000, // 20% VAT UK
        taxAmountCents: j.taxCents,
        totalCents: j.totalCents,
        paymentMethod: 'POS',
        paymentStatus: 'VERIFIED_PAID',
        materialCostCents: j.materialCostCents,
        repairerFeeCents: j.repairerFeeCents,
        otherExpenseCents: j.otherExpenseCents,
        expenseNotes: 'Wholesale materials and labor verified by accountant',
        expenseStatedById: createdUsers['ACCOUNTANT']?.id,
        expenseStatedAt: jobDate,
        itPlatformFeeCents: 100, // £1.00 GBP (100 pence)
        createdAt: jobDate,
        completedAt: jobDate,
        serviceItems: {
          create: [
            {
              serviceName: j.service,
              category: 'TIRE_SERVICE',
              unitPriceCents: j.subtotalCents,
              quantity: 1,
            },
          ],
        },
      },
    });
  }
  console.log(`✅ Seeded 5 UK Completed Jobs with Accounting Ledger data`);

  // 6. Seed Canada Completed Jobs
  const caCompletedJobs = [
    {
      jobCode: 'JOB-CA-1001',
      totalCents: 24500, // $245.00 CAD
      materialCostCents: 6500,
      repairerFeeCents: 4500,
      otherExpenseCents: 1000,
    },
    {
      jobCode: 'JOB-CA-1002',
      totalCents: 18500, // $185.00 CAD
      materialCostCents: 3500,
      repairerFeeCents: 3000,
      otherExpenseCents: 500,
    },
  ];

  for (const cj of caCompletedJobs) {
    const jobDate = new Date(now);
    jobDate.setDate(jobDate.getDate() - 1);

    await prisma.job.upsert({
      where: { jobCode: cj.jobCode },
      update: {
        status: 'COMPLETED',
        completedAt: jobDate,
        totalCents: cj.totalCents,
        materialCostCents: cj.materialCostCents,
        repairerFeeCents: cj.repairerFeeCents,
        otherExpenseCents: cj.otherExpenseCents,
        itPlatformFeeCents: 150, // $1.50 CAD
      },
      create: {
        jobCode: cj.jobCode,
        customerId: customer.id,
        vehicleId: customerVehicle.id,
        createdById: createdUsers['CALL_AGENT']?.id,
        driverId: createdUsers['DRIVER']?.id,
        countryCode: 'CA',
        currency: 'CAD',
        status: 'COMPLETED',
        urgency: 'STANDARD',
        source: 'DIRECT_CALL',
        recipientName: customer.fullName,
        recipientPhone: customer.phone,
        serviceAddress: '857 Winterton Way, Mississauga, ON',
        problemNotes: 'Tire repair completed on site',
        subtotalCents: Math.round(cj.totalCents / 1.13),
        taxRateBps: 1300,
        taxAmountCents: cj.totalCents - Math.round(cj.totalCents / 1.13),
        totalCents: cj.totalCents,
        paymentMethod: 'POS',
        paymentStatus: 'VERIFIED_PAID',
        materialCostCents: cj.materialCostCents,
        repairerFeeCents: cj.repairerFeeCents,
        otherExpenseCents: cj.otherExpenseCents,
        itPlatformFeeCents: 150,
        createdAt: jobDate,
        completedAt: jobDate,
      },
    });
  }
  console.log(`✅ Seeded Canada Completed Jobs for Accounting Ledger`);

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
