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
  console.log('🔄 Cleaning non-user data (Keeping users only)...');

  // Delete in strict foreign key order
  await prisma.jobServiceItem.deleteMany({});
  await prisma.fleetCommissionLedger.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.fleetDriver.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.fleet.deleteMany({});
  await prisma.customer.deleteMany({});

  console.log('🧹 Cleaned all transactional data. Users preserved.');

  const passwordHash = await bcrypt.hash('AdminPassword123!', 10);
  const ktPasswordHash = await bcrypt.hash('Xtreme@ktgroup', 10);
  const babuPasswordHash = await bcrypt.hash('Xtreme@Jang', 10);

  // 1. Ensure Standard Staff Users exist and have accurate coordinates / permissions
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
      email: 'gm@xtremecrm.com',
      fullName: 'General Manager',
      role: 'GENERAL_MANAGER' as const,
      countryCode: 'CA' as const,
      phone: '+14165550198',
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
      isAgentActive: true,
      address: '400 University Ave, Toronto, ON M5G 1S5',
      assignedVehicle: 'Ford Transit 250 - Mobile Tire Van #101',
      latitude: 43.6544,
      longitude: -79.3882,
    },
    {
      email: 'alan@bitch.com',
      fullName: 'Alan Bitcher',
      role: 'DRIVER' as const,
      countryCode: 'CA' as const,
      phone: '+14165550188',
      isAgentActive: true,
      address: '100 City Centre Dr, Mississauga, ON L5B 2C9',
      assignedVehicle: 'RAM ProMaster 2500 - Mobile Tire Van #102',
      latitude: 43.5931,
      longitude: -79.6425,
    },
    {
      email: 'Paytojang@gmail.com',
      fullName: 'Babu Singh',
      role: 'DRIVER' as const,
      countryCode: 'CA' as const,
      phone: '+14377873377',
      isAgentActive: true,
      address: '1401 Springwater Crescent, Oshawa, ON L1K 2N4',
      assignedVehicle: 'Nissan NV 3500 - Mobile Tire Van #103',
      latitude: 43.9427,
      longitude: -78.8576,
    },
    {
      email: 'driver.us@xtremecrm.com',
      fullName: 'Marcus Vance (US Driver)',
      role: 'DRIVER' as const,
      countryCode: 'US' as const,
      phone: '+17035550190',
      isAgentActive: true,
      address: '10500 Judicial Dr, Fairfax, VA 22030',
      assignedVehicle: 'Chevy Express 3500 - Mobile Van #201',
      latitude: 38.8462,
      longitude: -77.3064,
    },
    {
      email: 'driver.uk@xtremecrm.com',
      fullName: 'Oliver Smith (UK Driver)',
      role: 'DRIVER' as const,
      countryCode: 'UK' as const,
      phone: '+442079460195',
      isAgentActive: true,
      address: '100 Victoria St, London SW1E 5JL, UK',
      assignedVehicle: 'Mercedes Sprinter - Mobile Van #301',
      latitude: 51.4975,
      longitude: -0.1384,
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
      email: 'fleet.manager@xtremecrm.com',
      fullName: 'KT Group Fleet Manager',
      role: 'FLEET_MANAGER' as const,
      countryCode: 'CA' as const,
      phone: '+18666869660',
      isAgentActive: false,
    },
    {
      email: 'Administration@ktgroupcanada.ca',
      fullName: 'S Pratheep',
      role: 'FLEET_MANAGER' as const,
      countryCode: 'CA' as const,
      phone: '+14378828406',
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

  const userMap: Record<string, any> = {};

  for (const u of users) {
    const pw =
      u.email === 'Administration@ktgroupcanada.ca'
        ? ktPasswordHash
        : u.email === 'Paytojang@gmail.com'
        ? babuPasswordHash
        : passwordHash;

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        role: u.role,
        countryCode: u.countryCode,
        phone: u.phone,
        isAgentActive: u.isAgentActive,
        canApprovePayouts: (u as any).canApprovePayouts ?? false,
        address: (u as any).address ?? null,
        assignedVehicle: (u as any).assignedVehicle ?? null,
        latitude: (u as any).latitude ?? null,
        longitude: (u as any).longitude ?? null,
      },
      create: {
        email: u.email,
        passwordHash: pw,
        fullName: u.fullName,
        role: u.role,
        countryCode: u.countryCode,
        phone: u.phone,
        isAgentActive: u.isAgentActive,
        canApprovePayouts: (u as any).canApprovePayouts ?? false,
        address: (u as any).address ?? null,
        assignedVehicle: (u as any).assignedVehicle ?? null,
        latitude: (u as any).latitude ?? null,
        longitude: (u as any).longitude ?? null,
      },
    });
    userMap[u.email] = user;
    if (!userMap[u.role] || u.email === 'fleet.manager@xtremecrm.com') {
      userMap[u.role] = user;
    }
  }

  const danDriver = userMap['driver@xtremecrm.com'];
  const alanDriver = userMap['alan@bitch.com'];
  const agentUser = userMap['agent@xtremecrm.com'];
  const accountantUser = userMap['accountant@xtremecrm.com'];
  const vaUser = userMap['va@xtremecrm.com'];

  console.log('✅ Staff users ready.');

  // 2. Seed Contracted Commercial Fleet Accounts
  const ktFleet = await prisma.fleet.create({
    data: {
      fleetCode: 'XFC-526',
      name: 'KT Group Of Companies LTD',
      contactPerson: 'S Pratheep',
      phone: '+18666869660',
      email: 'Administration@ktgroupcanada.ca',
      poaEmail: 'Administration@ktgroupcanada.ca',
      address: 'Unit 16, 2283 Argentina Rd, Mississauga, ON L5N 5Z2 Canada',
      countryCode: 'CA',
      status: 'APPROVED',
      discountPercent: 10.0,
      contractSignedAt: new Date(),
      managerUserId: userMap['Administration@ktgroupcanada.ca'].id,
    },
  });

  const apexFleet = await prisma.fleet.create({
    data: {
      fleetCode: 'XFC-880',
      name: 'Apex Freight Logistics Inc',
      contactPerson: 'Marcus Vance',
      phone: '+14165550880',
      email: 'dispatch@apexfreight.ca',
      address: '70 Steeles Ave E, Brampton, ON L6W 1A1 Canada',
      countryCode: 'CA',
      status: 'APPROVED',
      discountPercent: 15.0,
      contractSignedAt: new Date(),
    },
  });

  // Seed Fleet Commercial Vehicles
  const ktVeh1 = await prisma.vehicle.create({
    data: {
      fleetId: ktFleet.id,
      countryCode: 'CA',
      year: 2022,
      make: 'Freightliner',
      model: 'Cascadia',
      unitNumber: 'KT-15',
      unitType: 'COMMERCIAL_TRUCK',
      licensePlate: 'KT-15',
      tireSize: '11R22.5',
    },
  });

  const ktVeh2 = await prisma.vehicle.create({
    data: {
      fleetId: ktFleet.id,
      countryCode: 'CA',
      year: 2023,
      make: 'Kenworth',
      model: 'T680',
      unitNumber: 'KT-18',
      unitType: 'COMMERCIAL_TRUCK',
      licensePlate: 'KT-18',
      tireSize: '11R22.5',
    },
  });

  const apexVeh1 = await prisma.vehicle.create({
    data: {
      fleetId: apexFleet.id,
      countryCode: 'CA',
      year: 2021,
      make: 'Volvo',
      model: 'VNL 760',
      unitNumber: 'AP-42',
      unitType: 'COMMERCIAL_TRUCK',
      licensePlate: 'AP-42',
      tireSize: '11R22.5',
    },
  });

  // Seed Fleet Driver
  await prisma.fleetDriver.create({
    data: {
      fleetId: ktFleet.id,
      fullName: 'John Driver',
      phone: '+14165550999',
      licensePlate: 'KT-15',
      isActive: true,
    },
  });

  // Seed US Commercial Fleet
  const usFleet = await prisma.fleet.create({
    data: {
      fleetCode: 'XFC-US-101',
      name: 'Capitol Logistics Express LLC',
      contactPerson: 'Robert Hayes',
      phone: '+17035550882',
      email: 'dispatch@capitollogistics.com',
      address: '8401 Arlington Blvd, Fairfax, VA 22031 USA',
      countryCode: 'US',
      status: 'APPROVED',
      discountPercent: 12.0,
      contractSignedAt: new Date(),
    },
  });

  const usVeh1 = await prisma.vehicle.create({
    data: {
      fleetId: usFleet.id,
      countryCode: 'US',
      year: 2023,
      make: 'Mack',
      model: 'Anthem',
      unitNumber: 'US-88',
      unitType: 'COMMERCIAL_TRUCK',
      licensePlate: 'VA-8812',
      tireSize: '11R22.5',
    },
  });

  await prisma.fleetDriver.create({
    data: {
      fleetId: usFleet.id,
      fullName: 'Travis Scott',
      phone: '+17035550388',
      licensePlate: 'VA-8812',
      isActive: true,
    },
  });

  // Seed UK Commercial Fleet
  const ukFleet = await prisma.fleet.create({
    data: {
      fleetCode: 'XFC-UK-201',
      name: 'Thames Express Freight Ltd',
      contactPerson: 'David Brown',
      phone: '+442079460883',
      email: 'dispatch@thamesfreight.co.uk',
      address: '25 Bank St, Canary Wharf, London E14 5JP UK',
      countryCode: 'UK',
      status: 'APPROVED',
      discountPercent: 10.0,
      contractSignedAt: new Date(),
    },
  });

  const ukVeh1 = await prisma.vehicle.create({
    data: {
      fleetId: ukFleet.id,
      countryCode: 'UK',
      year: 2022,
      make: 'Scania',
      model: 'R500',
      unitNumber: 'UK-07',
      unitType: 'COMMERCIAL_TRUCK',
      licensePlate: 'LN-7741',
      tireSize: '295/80R22.5',
    },
  });

  await prisma.fleetDriver.create({
    data: {
      fleetId: ukFleet.id,
      fullName: 'Callum Clarke',
      phone: '+442079460299',
      licensePlate: 'LN-7741',
      isActive: true,
    },
  });

  console.log('✅ Seeded Commercial Fleets: KT Group (CA), Apex (CA), Capitol Logistics (US), Thames Express (UK).');

  // 3. Seed Retail Customers & Vehicles
  const customers = [
    {
      name: 'Sarah Miller',
      phone: '+14165550201',
      email: 'sarah.miller@gmail.com',
      vehicle: { make: 'Honda', model: 'CR-V', year: 2022, plate: 'ON-CRV2', tire: '235/60R18' },
    },
    {
      name: 'David Wilson',
      phone: '+14165550202',
      email: 'dwilson@yahoo.com',
      vehicle: { make: 'Toyota', model: 'RAV4', year: 2021, plate: 'ON-RAV4', tire: '225/65R17' },
    },
    {
      name: 'Michael Chang',
      phone: '+19055550203',
      email: 'mchang@rogers.com',
      vehicle: { make: 'Ford', model: 'F-150', year: 2023, plate: 'ON-F150', tire: '275/65R18' },
    },
    {
      name: 'Emily Johnson',
      phone: '+14165550204',
      email: 'emily.j@outlook.com',
      vehicle: { make: 'Subaru', model: 'Outback', year: 2020, plate: 'ON-SUBI', tire: '225/60R18' },
    },
    {
      name: 'James Henderson',
      phone: '+14165550205',
      email: 'jhenderson@bell.net',
      vehicle: { make: 'BMW', model: 'X5', year: 2019, plate: 'ON-BMW5', tire: '275/45R20' },
    },
  ];

  const seededCustomers: any[] = [];
  const seededVehicles: any[] = [];

  for (const c of customers) {
    const cust = await prisma.customer.create({
      data: {
        fullName: c.name,
        phone: c.phone,
        email: c.email,
        countryCode: 'CA',
        customerType: 'RETAIL',
      },
    });
    seededCustomers.push(cust);

    const veh = await prisma.vehicle.create({
      data: {
        customerId: cust.id,
        countryCode: 'CA',
        make: c.vehicle.make,
        model: c.vehicle.model,
        year: c.vehicle.year,
        licensePlate: c.vehicle.plate,
        tireSize: c.vehicle.tire,
      },
    });
    seededVehicles.push(veh);
  }

  console.log('✅ Seeded 5 Retail Customers and Vehicles.');

  // =========================================================================
  // 4. SEED CATEGORY 1: RETAIL ROADSIDE JOBS (/jobs page)
  // Strictly fleetId: null, isTestService: false
  // =========================================================================
  const retailJobs = [
    {
      jobCode: 'JOB-CA-10101',
      customer: seededCustomers[0],
      vehicle: seededVehicles[0],
      status: 'PENDING' as const,
      urgency: 'URGENT' as const,
      address: '401 Hwy Eastbound near Allen Rd, Toronto, ON',
      lat: 43.7254,
      lng: -79.4442,
      notes: 'Punctured tire on highway shoulder. Fast service requested.',
      services: [{ name: 'Tire Repair (Plug)', price: 12000 }],
      paymentMethod: 'POS',
    },
    {
      jobCode: 'JOB-CA-10102',
      customer: seededCustomers[1],
      vehicle: seededVehicles[1],
      status: 'PENDING' as const,
      urgency: 'URGENT' as const,
      address: 'Gardiner Expressway near Spadina Ave, Toronto, ON',
      lat: 43.6405,
      lng: -79.3958,
      notes: 'Blown tire on express lane shoulder. Hazard lights on.',
      services: [{ name: 'Spare Tire Change', price: 10000 }],
      paymentMethod: 'E_TRANSFER',
    },
    {
      jobCode: 'JOB-CA-10103',
      customer: seededCustomers[2],
      vehicle: seededVehicles[2],
      driver: alanDriver,
      status: 'ASSIGNED' as const,
      urgency: 'STANDARD' as const,
      address: '100 City Centre Dr, Mississauga, ON L5B 2C9',
      lat: 43.5931,
      lng: -79.6425,
      notes: 'Square One Mall parking lot. Driver dispatched with 275/65R18 new tire.',
      services: [{ name: 'New Tire Replacement', price: 24000 }],
      paymentMethod: 'POS',
      etaMinutes: 12,
    },
    {
      jobCode: 'JOB-CA-10104',
      customer: seededCustomers[3],
      vehicle: seededVehicles[3],
      driver: danDriver,
      status: 'IN_PROGRESS' as const,
      urgency: 'STANDARD' as const,
      address: 'Queen St W & Spadina Ave, Toronto, ON',
      lat: 43.6487,
      lng: -79.3972,
      notes: 'Technician on scene repairing tire puncture.',
      services: [{ name: 'Tire Repair (Plug)', price: 12000 }],
      paymentMethod: 'POS',
    },
    {
      jobCode: 'JOB-CA-10105',
      customer: seededCustomers[4],
      vehicle: seededVehicles[4],
      driver: danDriver,
      status: 'COMPLETED' as const,
      urgency: 'STANDARD' as const,
      address: 'Yonge St & Eglinton Ave, Toronto, ON',
      lat: 43.7067,
      lng: -79.3986,
      notes: 'Valve stem replacement completed on scene. Payment collected.',
      services: [{ name: 'Stem Valve Replacement', price: 8500 }],
      paymentMethod: 'POS',
      paymentStatus: 'VERIFIED_PAID' as const,
      materialCost: 2500,
      repairerFee: 3500,
      otherExpense: 500,
      completedAt: new Date(),
    },
  ];

  for (const rj of retailJobs) {
    const subtotal = rj.services.reduce((s, i) => s + i.price, 0);
    const tax = Math.round((subtotal * 1300) / 10000);
    const total = subtotal + tax;

    await prisma.job.create({
      data: {
        jobCode: rj.jobCode,
        customerId: rj.customer.id,
        vehicleId: rj.vehicle.id,
        createdById: agentUser.id,
        driverId: rj.driver ? rj.driver.id : null,
        countryCode: 'CA',
        currency: 'CAD',
        status: rj.status,
        urgency: rj.urgency,
        source: 'DIRECT_CALL',
        recipientName: rj.customer.fullName,
        recipientPhone: rj.customer.phone,
        serviceAddress: rj.address,
        serviceLatitude: rj.lat,
        serviceLongitude: rj.lng,
        problemNotes: rj.notes,
        subtotalCents: subtotal,
        taxRateBps: 1300,
        taxAmountCents: tax,
        totalCents: total,
        itPlatformFeeCents: 150,
        paymentMethod: rj.paymentMethod as any,
        paymentStatus: (rj as any).paymentStatus || 'UNPAID',
        materialCostCents: (rj as any).materialCost || 0,
        repairerFeeCents: (rj as any).repairerFee || 0,
        otherExpenseCents: (rj as any).otherExpense || 0,
        expenseStatedById: (rj as any).materialCost ? accountantUser.id : null,
        expenseStatedAt: (rj as any).materialCost ? new Date() : null,
        completedAt: (rj as any).completedAt || null,
        assignedAt: rj.driver ? new Date() : null,
        estimatedArrivalAt: (rj as any).etaMinutes
          ? new Date(Date.now() + (rj as any).etaMinutes * 60000)
          : null,
        serviceItems: {
          create: rj.services.map((s) => ({
            serviceName: s.name,
            category: 'TIRE_SERVICE',
            unitPriceCents: s.price,
            quantity: 1,
          })),
        },
      },
    });
  }

  // Seed US and UK Cross-Border Retail Roadside Jobs
  const usDriver = userMap['driver.us@xtremecrm.com'];
  const ukDriver = userMap['driver.uk@xtremecrm.com'];

  const usCust = await prisma.customer.create({
    data: {
      fullName: 'Robert Jackson',
      phone: '+17035550211',
      email: 'rjackson@gmail.com',
      countryCode: 'US',
      customerType: 'RETAIL',
    },
  });

  const usVeh = await prisma.vehicle.create({
    data: {
      customerId: usCust.id,
      countryCode: 'US',
      make: 'Chevrolet',
      model: 'Silverado 1500',
      year: 2022,
      licensePlate: 'VA-CHEV1',
      tireSize: '275/65R18',
    },
  });

  const now = new Date();
  const windowStartUS = new Date(now.getTime() + 60 * 60000);
  const windowEndUS = new Date(now.getTime() + 120 * 60000);

  await prisma.job.create({
    data: {
      jobCode: 'JOB-US-10201',
      customerId: usCust.id,
      vehicleId: usVeh.id,
      createdById: agentUser.id,
      driverId: usDriver ? usDriver.id : null,
      countryCode: 'US',
      currency: 'USD',
      status: 'ASSIGNED',
      urgency: 'STANDARD',
      source: 'DIRECT_CALL',
      recipientName: usCust.fullName,
      recipientPhone: usCust.phone,
      serviceAddress: '10500 Judicial Dr, Fairfax, VA 22030 USA',
      serviceLatitude: 38.8462,
      serviceLongitude: -77.3064,
      problemNotes: 'Rear driver tire puncture on I-66 exit. Promised arrival between window.',
      subtotalCents: 15000,
      taxRateBps: 800,
      taxAmountCents: 1200,
      totalCents: 16200,
      itPlatformFeeCents: 100,
      paymentMethod: 'POS',
      paymentStatus: 'UNPAID',
      assignedAt: new Date(),
      estimatedArrivalAt: windowStartUS,
      arrivalWindowStart: windowStartUS,
      arrivalWindowEnd: windowEndUS,
      appointmentDate: windowStartUS,
      serviceItems: {
        create: [
          {
            serviceName: 'Tire Repair (Plug)',
            category: 'TIRE_SERVICE',
            unitPriceCents: 15000,
            quantity: 1,
          },
        ],
      },
    },
  });

  const ukCust = await prisma.customer.create({
    data: {
      fullName: 'Liam Davies',
      phone: '+442079460212',
      email: 'liam.davies@ukmail.co.uk',
      countryCode: 'UK',
      customerType: 'RETAIL',
    },
  });

  const ukVeh = await prisma.vehicle.create({
    data: {
      customerId: ukCust.id,
      countryCode: 'UK',
      make: 'Vauxhall',
      model: 'Vivaro',
      year: 2023,
      licensePlate: 'LD-VAUX1',
      tireSize: '215/65R16',
    },
  });

  const windowStartUK = new Date(now.getTime() + 45 * 60000);
  const windowEndUK = new Date(now.getTime() + 105 * 60000);

  await prisma.job.create({
    data: {
      jobCode: 'JOB-UK-10301',
      customerId: ukCust.id,
      vehicleId: ukVeh.id,
      createdById: agentUser.id,
      driverId: ukDriver ? ukDriver.id : null,
      countryCode: 'UK',
      currency: 'GBP',
      status: 'PENDING',
      urgency: 'URGENT',
      source: 'DIRECT_CALL',
      recipientName: ukCust.fullName,
      recipientPhone: ukCust.phone,
      serviceAddress: '100 Victoria St, London SW1E 5JL UK',
      serviceLatitude: 51.4975,
      serviceLongitude: -0.1384,
      problemNotes: 'Punctured front nearside tire. Customer waiting on roadside.',
      subtotalCents: 12500,
      taxRateBps: 2000,
      taxAmountCents: 2500,
      totalCents: 15000,
      itPlatformFeeCents: 100,
      paymentMethod: 'POS',
      paymentStatus: 'UNPAID',
      estimatedArrivalAt: windowStartUK,
      arrivalWindowStart: windowStartUK,
      arrivalWindowEnd: windowEndUK,
      appointmentDate: windowStartUK,
      serviceItems: {
        create: [
          {
            serviceName: 'Emergency Mobile Tire Fitting',
            category: 'TIRE_SERVICE',
            unitPriceCents: 12500,
            quantity: 1,
          },
        ],
      },
    },
  });

  console.log('✅ Seeded Cross-Border Retail Jobs: Canada (5), US (1), UK (1).');

  // =========================================================================
  // 5. SEED CATEGORY 2: COMMERCIAL FLEET WORK ORDERS (/fleet-jobs page)
  // Contracted fleets with unit #s, commercial tires 11R22.5, Net 30 terms
  // =========================================================================
  const fleetJobs = [
    {
      jobCode: 'JOB-CA-F2001',
      fleet: ktFleet,
      vehicle: ktVeh1,
      status: 'PENDING' as const,
      urgency: 'URGENT' as const,
      address: 'Highway 410 Northbound near Queen St, Brampton, ON',
      lat: 43.7022,
      lng: -79.7289,
      notes: '[Contracted Fleet: KT Group] Unit KT-15 steer tire blowout on highway. Commercial tire 11R22.5 needed.',
      services: [{ name: 'Commercial Steer Tire Replacement', price: 45000 }],
    },
    {
      jobCode: 'JOB-CA-F2002',
      fleet: ktFleet,
      vehicle: ktVeh2,
      driver: alanDriver,
      status: 'ASSIGNED' as const,
      urgency: 'STANDARD' as const,
      address: '2283 Argentina Rd, Mississauga, ON L5N 5Z2',
      lat: 43.5985,
      lng: -79.7421,
      notes: '[Contracted Fleet: KT Group] Unit KT-18 dual drive tire swap at depot yard.',
      services: [{ name: 'Commercial Dual Tire Replacement', price: 85000 }],
      etaMinutes: 20,
    },
    {
      jobCode: 'JOB-CA-F2003',
      fleet: apexFleet,
      vehicle: apexVeh1,
      driver: danDriver,
      status: 'IN_PROGRESS' as const,
      urgency: 'URGENT' as const,
      address: '70 Steeles Ave E, Brampton, ON L6W 1A1',
      lat: 43.6821,
      lng: -79.7198,
      notes: '[Contracted Fleet: Apex Freight] Unit AP-42 trailer tire puncture. Driver on scene.',
      services: [{ name: 'Trailer Tire Replacement & Mount', price: 52000 }],
    },
  ];

  for (const fj of fleetJobs) {
    const subtotal = fj.services.reduce((s, i) => s + i.price, 0);
    const tax = Math.round((subtotal * 1300) / 10000);
    const total = subtotal + tax;

    await prisma.job.create({
      data: {
        jobCode: fj.jobCode,
        fleetId: fj.fleet.id,
        vehicleId: fj.vehicle.id,
        createdById: agentUser.id,
        driverId: fj.driver ? fj.driver.id : null,
        countryCode: 'CA',
        currency: 'CAD',
        status: fj.status,
        urgency: fj.urgency,
        source: 'FLEET_PORTAL',
        recipientName: fj.fleet.name,
        recipientPhone: fj.fleet.phone,
        serviceAddress: fj.address,
        serviceLatitude: fj.lat,
        serviceLongitude: fj.lng,
        problemNotes: fj.notes,
        subtotalCents: subtotal,
        taxRateBps: 1300,
        taxAmountCents: tax,
        totalCents: total,
        itPlatformFeeCents: 150,
        paymentStatus: 'UNPAID',
        assignedAt: fj.driver ? new Date() : null,
        estimatedArrivalAt: (fj as any).etaMinutes
          ? new Date(Date.now() + (fj as any).etaMinutes * 60000)
          : null,
        serviceItems: {
          create: fj.services.map((s) => ({
            serviceName: s.name,
            category: 'TIRE_SERVICE',
            unitPriceCents: s.price,
            quantity: 1,
          })),
        },
      },
    });
  }
  console.log('✅ Seeded Category 2: 3 Commercial Fleet Work Orders (/fleet-jobs).');

  // =========================================================================
  // 6. SEED CATEGORY 3: PROSPECTIVE FLEET TRIAL SERVICES (/fleet-jobs page)
  // isTestService: true (Prospect lead converted to roadside trial run)
  // =========================================================================
  const trialLead = await prisma.lead.create({
    data: {
      companyName: 'Swift Haulage Corp',
      contactPerson: 'Arthur Pendelton',
      phone: '+19055550301',
      email: 'arthur@swifthaulage.ca',
      address: '8800 Huntington Rd, Vaughan, ON L4H 4G7',
      notes: 'Fleet of 35 big rigs. Trial roadside emergency service booked before full contract onboarding.',
      countryCode: 'CA',
      status: 'CALLED',
      stage: 'DISPATCHER_REVIEW',
      uploadedById: vaUser.id,
    },
  });

  const trialVeh = await prisma.vehicle.create({
    data: {
      countryCode: 'CA',
      year: 2021,
      make: 'Peterbilt',
      model: '579',
      unitNumber: 'SW-01',
      unitType: 'COMMERCIAL_TRUCK',
      licensePlate: 'SW-01',
      tireSize: '11R22.5',
    },
  });

  await prisma.job.create({
    data: {
      jobCode: 'JOB-CA-T3001',
      leadId: trialLead.id,
      vehicleId: trialVeh.id,
      createdById: agentUser.id,
      countryCode: 'CA',
      currency: 'CAD',
      status: 'PENDING',
      urgency: 'URGENT',
      isTestService: true,
      source: 'DIRECT_CALL',
      recipientName: 'Arthur Pendelton (Swift Haulage Trial)',
      recipientPhone: '+19055550301',
      serviceAddress: 'Highway 400 Northbound near Rutherford Rd, Vaughan, ON',
      serviceLatitude: 43.8341,
      serviceLongitude: -79.5392,
      problemNotes: '[Prospective Fleet Trial Service] Swift Haulage trial run. Roadside steer tire emergency.',
      subtotalCents: 35000,
      taxRateBps: 1300,
      taxAmountCents: 4550,
      totalCents: 39550,
      itPlatformFeeCents: 150,
      paymentMethod: 'POS',
      paymentStatus: 'UNPAID',
      serviceItems: {
        create: [
          {
            serviceName: 'Trial Steer Tire Replacement',
            category: 'TIRE_SERVICE',
            unitPriceCents: 35000,
            quantity: 1,
          },
        ],
      },
    },
  });
  console.log('✅ Seeded Category 3: 1 Prospective Fleet Trial Service (/fleet-jobs).');

  // =========================================================================
  // 7. SEED CATEGORY 4: WEBSITE PUBLIC BOOKINGS (/bookings page)
  // Source: WEBSITE, status: UNVERIFIED_PUBLIC (raw customer text address)
  // =========================================================================
  const publicBookings = [
    {
      jobCode: 'PUB-CA-50101',
      name: 'Jane Foster',
      phone: '+14165550401',
      rawAddress: 'Near Bay and Bloor, right in front of the subway station, Toronto',
      notes: 'Hit curb sharply on Bloor St. Front passenger tire is completely flat and rim is touching asphalt.',
      vehicle: { make: 'Honda', model: 'Civic', year: 2021, plate: 'ON-CIVC', tire: '215/55R16' },
      paymentMethod: 'POS',
      urgency: 'STANDARD',
    },
    {
      jobCode: 'PUB-CA-50102',
      name: 'Robert Chen',
      phone: '+19055550402',
      rawAddress: '350 Hwy 7 East, in parking lot behind the grocery store, Richmond Hill',
      notes: 'Tire pressure sensor is warning low pressure. Nail visible in rear driver tire.',
      vehicle: { make: 'Tesla', model: 'Model Y', year: 2023, plate: 'ON-ELON', tire: '255/45R19' },
      paymentMethod: 'E_TRANSFER',
      urgency: 'STANDARD',
    },
  ];

  for (const pb of publicBookings) {
    const pubVeh = await prisma.vehicle.create({
      data: {
        countryCode: 'CA',
        make: pb.vehicle.make,
        model: pb.vehicle.model,
        year: pb.vehicle.year,
        licensePlate: pb.vehicle.plate,
        tireSize: pb.vehicle.tire,
      },
    });

    await prisma.job.create({
      data: {
        jobCode: pb.jobCode,
        vehicleId: pubVeh.id,
        createdById: userMap['admin@xtremecrm.com'].id,
        countryCode: 'CA',
        currency: 'CAD',
        status: 'UNVERIFIED_PUBLIC',
        urgency: pb.urgency as any,
        source: 'WEBSITE',
        recipientName: pb.name,
        recipientPhone: pb.phone,
        serviceAddress: pb.rawAddress,
        serviceLatitude: null, // Unverified coordinates awaiting dispatcher geocoding!
        serviceLongitude: null,
        problemNotes: pb.notes,
        subtotalCents: 12000,
        taxRateBps: 1300,
        taxAmountCents: 1560,
        totalCents: 13560,
        itPlatformFeeCents: 150,
        paymentMethod: pb.paymentMethod as any,
        paymentStatus: 'UNPAID',
        serviceItems: {
          create: [
            {
              serviceName: 'Tire Repair (Plug)',
              category: 'TIRE_SERVICE',
              unitPriceCents: 12000,
              quantity: 1,
            },
          ],
        },
      },
    });
  }
  console.log('✅ Seeded Category 4: 2 Inbound Website Bookings (/bookings).');

  // =========================================================================
  // 8. SEED OUTBOUND CALL CAMPAIGN BATCH & LEADS (For VA 1-Lead Focus Mode)
  // =========================================================================
  const batch = await prisma.batch.create({
    data: {
      batchName: 'CA Spring Fleet Outreach 2026',
      countryCode: 'CA',
      status: 'ACTIVE',
      totalLeads: 5,
      uploadedById: vaUser.id,
    },
  });

  const outboundLeads = [
    {
      companyName: 'Boreal Courier Express Ltd',
      contactPerson: 'David Ross',
      phone: '+14165550701',
      email: 'ops@borealexpress.ca',
      address: '150 King St W, Toronto, ON',
      units: 18,
      notes: '18 local delivery vans. Interested in 24/7 roadside emergency tire repair.',
    },
    {
      companyName: 'Maple Leaf Cold Haul',
      contactPerson: 'Elena Rostova',
      phone: '+14165550702',
      email: 'elena@mapleleafhaul.ca',
      address: '250 Queen St E, Brampton, ON',
      units: 24,
      notes: 'Refrigerated food delivery trailers. Steer and drive tires replacement inquiry.',
    },
    {
      companyName: 'Pinnacle Freightway Systems',
      contactPerson: 'Gary Cooper',
      phone: '+19055550703',
      email: 'gcooper@pinnaclefreight.ca',
      address: '400 Britannia Rd E, Mississauga, ON',
      units: 30,
      notes: 'Heavy duty highway cargo tractors.',
    },
    {
      companyName: 'Urban Cargo Services',
      contactPerson: 'Maya Lin',
      phone: '+14165550704',
      email: 'maya@urbancargo.ca',
      address: '80 Front St E, Toronto, ON',
      units: 12,
      notes: 'Downtown parcel vans requiring rapid mobile tire dispatch.',
    },
    {
      companyName: 'Great North Distribution',
      contactPerson: 'Thomas Becker',
      phone: '+19055550705',
      email: 'tbecker@greatnorthdist.ca',
      address: '600 Derry Rd W, Mississauga, ON',
      units: 22,
      notes: 'Cross-dock logistics trucks.',
    },
  ];

  for (let i = 0; i < outboundLeads.length; i++) {
    const ol = outboundLeads[i];
    await prisma.lead.create({
      data: {
        batchId: batch.id,
        companyName: ol.companyName,
        contactPerson: ol.contactPerson,
        phone: ol.phone,
        email: ol.email,
        address: ol.address,
        notes: `${ol.units} units. ${ol.notes}`,
        countryCode: 'CA',
        status: 'NEW',
        stage: 'VA_OUTREACH',
        uploadedById: vaUser.id,
        priority: 5 - i,
      },
    });
  }
  console.log('✅ Seeded Outbound Batch & 5 Leads for VA dialer.');

  console.log('🎉 Fresh, healthy seeding completed successfully!');
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
