import { prisma } from '../src/config/database.js';
import bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Seeding Senior and Junior Accountant credentials...');

  const passwordHash = await bcrypt.hash('AdminPassword123!', 10);

  const accountants = [
    {
      email: 'senior.accountant@xtremecrm.com',
      fullName: 'Sarah Senior Accountant',
      role: 'ACCOUNTANT' as const,
      countryCode: 'CA' as const,
      phone: '+14165550106',
      isAgentActive: false,
      canApprovePayouts: true,
    },
    {
      email: 'junior.accountant@xtremecrm.com',
      fullName: 'James Junior Accountant',
      role: 'ACCOUNTANT' as const,
      countryCode: 'CA' as const,
      phone: '+14165550107',
      isAgentActive: false,
      canApprovePayouts: false,
    },
    {
      email: 'accountant@xtremecrm.com',
      fullName: 'Alice Accountant (Senior)',
      role: 'ACCOUNTANT' as const,
      countryCode: 'CA' as const,
      phone: '+14165550104',
      isAgentActive: false,
      canApprovePayouts: true,
    },
  ];

  for (const acc of accountants) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        fullName: acc.fullName,
        role: acc.role,
        countryCode: acc.countryCode,
        phone: acc.phone,
        isAgentActive: acc.isAgentActive,
        canApprovePayouts: acc.canApprovePayouts,
        passwordHash,
      },
      create: {
        email: acc.email,
        passwordHash,
        fullName: acc.fullName,
        role: acc.role,
        countryCode: acc.countryCode,
        phone: acc.phone,
        isAgentActive: acc.isAgentActive,
        canApprovePayouts: acc.canApprovePayouts,
      },
    });

    console.log(`✅ Seeded: ${user.email} (Role: ${user.role}, canApprovePayouts: ${user.canApprovePayouts})`);
  }

  console.log('\n🎉 Accountant seeding complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error seeding accountants:', err);
  process.exit(1);
});
