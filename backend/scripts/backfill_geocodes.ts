import { prisma } from '../src/config/database.js';
import { geocodingService } from '../src/services/geocodingService.js';

async function backfill() {
  console.log('Backfilling geocodes for existing records...');
  
  // 1. Customers
  const customers = await prisma.customer.findMany({
    where: {
      address: { not: null },
      latitude: null,
    },
    take: 50,
  });
  console.log(`Found ${customers.length} customers needing geocoding.`);
  for (const c of customers) {
    if (c.address) {
      const geo = await geocodingService.geocodeAddress(c.address, c.countryCode);
      if (geo.latitude && geo.longitude) {
        await prisma.customer.update({
          where: { id: c.id },
          data: { latitude: geo.latitude, longitude: geo.longitude },
        });
        console.log(`Geocoded customer ${c.fullName}: ${geo.latitude}, ${geo.longitude}`);
      }
    }
  }

  // 2. Fleets
  const fleets = await prisma.fleet.findMany({
    where: {
      address: { not: null },
      latitude: null,
    },
    take: 50,
  });
  console.log(`Found ${fleets.length} fleets needing geocoding.`);
  for (const f of fleets) {
    if (f.address) {
      const geo = await geocodingService.geocodeAddress(f.address, f.countryCode);
      if (geo.latitude && geo.longitude) {
        await prisma.fleet.update({
          where: { id: f.id },
          data: { latitude: geo.latitude, longitude: geo.longitude },
        });
        console.log(`Geocoded fleet ${f.name}: ${geo.latitude}, ${geo.longitude}`);
      }
    }
  }

  // 3. Jobs
  const jobs = await prisma.job.findMany({
    where: {
      serviceAddress: { not: '' },
      serviceLatitude: null,
    },
    take: 50,
  });
  console.log(`Found ${jobs.length} jobs needing geocoding.`);
  for (const j of jobs) {
    if (j.serviceAddress) {
      const geo = await geocodingService.geocodeAddress(j.serviceAddress, j.countryCode);
      if (geo.latitude && geo.longitude) {
        await prisma.job.update({
          where: { id: j.id },
          data: { serviceLatitude: geo.latitude, serviceLongitude: geo.longitude },
        });
        console.log(`Geocoded job ${j.jobCode}: ${geo.latitude}, ${geo.longitude}`);
      }
    }
  }

  console.log('Backfill complete!');
  await prisma.$disconnect();
}

backfill().catch(console.error);
