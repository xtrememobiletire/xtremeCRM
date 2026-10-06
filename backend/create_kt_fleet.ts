import bcrypt from 'bcrypt';
import { prisma } from './src/config/database.js';

async function main() {
  console.log('🚀 Creating 1st Fleet Account: KT Group Of Companies LTD (XFC-526)...');

  const rawPassword = 'Xtreme@ktgroup';
  const email = 'Administration@ktgroupcanada.ca';
  const managerName = 'S Pratheep';
  const managerPhone = '+14378828406';
  const companyPhone = '+18666869660';
  const assignedDid = '(437)-3755674';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Create or Update Fleet Manager User Account
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      fullName: managerName,
      phone: managerPhone,
      role: 'FLEET_MANAGER',
      countryCode: 'CA',
    },
    create: {
      email,
      passwordHash,
      fullName: managerName,
      phone: managerPhone,
      role: 'FLEET_MANAGER',
      countryCode: 'CA',
    },
  });
  console.log(`✅ Fleet Manager User created/updated: ${user.email} (ID: ${user.id}, Role: ${user.role})`);

  // 2. Create or Update Fleet Account (XFC-526)
  const fleet = await prisma.fleet.upsert({
    where: { fleetCode: 'XFC-526' },
    update: {
      name: 'KT Group Of Companies LTD',
      contactPerson: managerName,
      phone: companyPhone,
      email: email,
      fleetManager: managerName,
      managerPhone: managerPhone,
      ceoOwnerName: 'Kana Selva',
      address: 'Unit 16, 2283 Argentina Rd, Mississauga, ON L5N 5Z2 Canada',
      website: 'https://ktgroupcanada.ca',
      officeTimings: '8AM To 5PM',
      businessType: 'Facilities Management / Business Services',
      assignedDid: assignedDid,
      countryCode: 'CA',
      status: 'APPROVED',
      managerUserId: user.id,
      contractSignedAt: new Date(),
    },
    create: {
      fleetCode: 'XFC-526',
      name: 'KT Group Of Companies LTD',
      contactPerson: managerName,
      phone: companyPhone,
      email: email,
      fleetManager: managerName,
      managerPhone: managerPhone,
      ceoOwnerName: 'Kana Selva',
      address: 'Unit 16, 2283 Argentina Rd, Mississauga, ON L5N 5Z2 Canada',
      website: 'https://ktgroupcanada.ca',
      officeTimings: '8AM To 5PM',
      businessType: 'Facilities Management / Business Services',
      assignedDid: assignedDid,
      countryCode: 'CA',
      status: 'APPROVED',
      managerUserId: user.id,
      contractSignedAt: new Date(),
    },
  });
  console.log(`✅ Fleet Account created/updated: ${fleet.name} [${fleet.fleetCode}] (ID: ${fleet.id})`);

  // 3. Register Fleet Driver for 24/7 Roadside Verification
  const driver = await prisma.fleetDriver.upsert({
    where: {
      fleetId_phone: {
        fleetId: fleet.id,
        phone: managerPhone,
      },
    },
    update: {
      fullName: managerName,
      isActive: true,
    },
    create: {
      fleetId: fleet.id,
      fullName: managerName,
      phone: managerPhone,
      isActive: true,
    },
  });
  console.log(`✅ Fleet Driver registered: ${driver.fullName} (${driver.phone})`);

  // 4. Register Vehicles / Vans & Commercial Trucks (18 Units Total)
  const vehicleList = [
    // 13 Commercial Vehicles / Vans
    { year: 2018, make: 'Dodge', model: 'Ram Rtr', color: 'BLACK', unitType: 'COMMERCIAL_VAN', unitNumber: 'Unit-01' },
    { year: 2023, make: 'Hyundai', model: 'Tucson', color: 'BLACK', unitType: 'COMMERCIAL_VEHICLE', unitNumber: 'Unit-02' },
    { year: 2023, make: 'Hyundai', model: 'Venue', color: 'STANDARD', unitType: 'COMMERCIAL_VEHICLE', unitNumber: 'Unit-03' },
    { year: 2017, make: 'Hyundai', model: 'Tucson', color: 'STANDARD', unitType: 'COMMERCIAL_VEHICLE', unitNumber: 'Unit-04' },
    { year: 2017, make: 'Hyundai', model: 'Tucson SE', color: 'STANDARD', unitType: 'COMMERCIAL_VEHICLE', unitNumber: 'Unit-05' },
    { year: 2008, make: 'Toyota', model: 'CTR', color: 'Grey', unitType: 'COMMERCIAL_VEHICLE', unitNumber: 'Unit-06' },
    { year: 2020, make: 'Hyundai', model: 'Tucson', color: 'STANDARD', unitType: 'COMMERCIAL_VEHICLE', unitNumber: 'Unit-07' },
    { year: 2023, make: 'Hyundai', model: 'Venue', color: 'STANDARD', unitType: 'COMMERCIAL_VEHICLE', unitNumber: 'Unit-08' },
    { year: 2006, make: 'Toyota', model: 'Sienna', color: 'Blue', unitType: 'COMMERCIAL_VAN', unitNumber: 'Unit-09' },
    { year: 2022, make: 'Honda', model: 'CR-V', color: 'STANDARD', unitType: 'COMMERCIAL_VEHICLE', unitNumber: 'Unit-10' },
    { year: 2020, make: 'GMC', model: 'Savana', color: 'STANDARD', unitType: 'COMMERCIAL_VAN', unitNumber: 'Unit-11' },
    { year: 2014, make: 'Toyota', model: 'Corolla CE', color: 'STANDARD', unitType: 'COMMERCIAL_VEHICLE', unitNumber: 'Unit-12' },
    { year: 2024, make: 'Chrysler', model: 'Grand Caravan', color: 'Black', unitType: 'COMMERCIAL_VAN', unitNumber: 'Unit-13' },

    // 05 Commercial Trucks
    { year: 2010, make: 'ISU', model: 'Commercial Truck NRR', color: 'STANDARD', unitType: 'COMMERCIAL_TRUCK', unitNumber: 'Unit-14' },
    { year: 2000, make: 'INTL', model: '40 S 2000', color: 'White', unitType: 'COMMERCIAL_TRUCK', unitNumber: 'Unit-15' },
    { year: 2009, make: 'GMC', model: '550', color: 'STANDARD', unitType: 'COMMERCIAL_TRUCK', unitNumber: 'Unit-16' },
    { year: 2020, make: 'Sweeper', model: 'Sweeper Truck', color: 'STANDARD', unitType: 'COMMERCIAL_TRUCK', unitNumber: 'S2' },
    { year: 2020, make: 'Sweeper', model: 'Sweeper Truck', color: 'STANDARD', unitType: 'COMMERCIAL_TRUCK', unitNumber: 'S3' },
  ];

  // Remove previous vehicles for this fleet if any, to avoid duplicate inserts on re-runs
  await prisma.vehicle.deleteMany({
    where: { fleetId: fleet.id },
  });

  for (const v of vehicleList) {
    await prisma.vehicle.create({
      data: {
        fleetId: fleet.id,
        countryCode: 'CA',
        year: v.year,
        make: v.make,
        model: v.model,
        color: v.color,
        unitType: v.unitType,
        unitNumber: v.unitNumber,
        tireSize: 'TBD',
      },
    });
  }
  console.log(`✅ Successfully seeded ${vehicleList.length} vehicles for Fleet ${fleet.fleetCode}!`);

  // 5. Verification Query
  const finalFleet = await prisma.fleet.findUnique({
    where: { id: fleet.id },
    include: {
      managerUser: {
        select: { id: true, email: true, fullName: true, role: true, phone: true },
      },
      drivers: true,
      vehicles: {
        orderBy: { unitNumber: 'asc' },
      },
      _count: {
        select: { vehicles: true, drivers: true },
      },
    },
  });

  console.log('\n================ VERIFICATION DATA ================');
  console.log('Fleet Code:', finalFleet?.fleetCode);
  console.log('Company Name:', finalFleet?.name);
  console.log('Status:', finalFleet?.status);
  console.log('Office Timings:', finalFleet?.officeTimings);
  console.log('Business Type:', finalFleet?.businessType);
  console.log('Assigned DID:', finalFleet?.assignedDid);
  console.log('Fleet Manager Account:', finalFleet?.managerUser?.email);
  console.log('Manager Name:', finalFleet?.fleetManager);
  console.log('Manager Contact:', finalFleet?.managerPhone);
  console.log('Total Vehicles / Trucks:', finalFleet?._count.vehicles);
  console.log('===================================================\n');
}

main()
  .catch((e) => {
    console.error('Execution error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
