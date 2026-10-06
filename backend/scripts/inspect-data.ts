import { prisma } from '../src/config/database.js';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, fullName: true },
  });
  console.log('--- USERS ---');
  console.log(users);

  const fleets = await prisma.fleet.findMany({
    include: {
      vehicles: true,
      drivers: true,
      managerUser: { select: { id: true, email: true } },
    },
  });
  console.log('--- FLEETS ---');
  console.log(JSON.stringify(fleets, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
