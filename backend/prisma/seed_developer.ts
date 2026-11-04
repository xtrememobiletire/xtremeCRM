import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Automatically load environment (.env.development vs .env.production)
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config(); // Fallback to root or default .env if present

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL or DIRECT_URL is required to seed the developer account.');
  console.error('   Please provide it in your environment or in .env file.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Parse CLI flags (e.g., --email=..., --password=..., --name=..., --country=...)
function getArg(flagName: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`--${flagName}=`));
  if (arg) return arg.split('=')[1]?.trim();
  const index = process.argv.indexOf(`--${flagName}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1]?.trim();
  }
  return undefined;
}

const devEmail = (getArg('email') || process.env.DEV_EMAIL || 'developer@xtrememobiletire.com').toLowerCase().trim();
const devPassword = getArg('password') || process.env.DEV_PASSWORD || 'DevXtreme2026!Secure';
const devName = getArg('name') || process.env.DEV_NAME || 'Xtreme Platform Developer';
const devCountry = ((getArg('country') || process.env.DEV_COUNTRY || 'CA').toUpperCase()) as 'CA' | 'US' | 'UK';

async function seedDeveloper() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 Seeding Developer Account (XtremeCRM Platform Engineering)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(` Target Email   : ${devEmail}`);
  console.log(` Target Name    : ${devName}`);
  console.log(` Target Region  : ${devCountry}`);
  console.log('───────────────────────────────────────────────────────────────');

  // Generate strong bcrypt salt hash
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(devPassword, saltRounds);

  // Upsert user account ensuring DEVELOPER role and active status
  const devUser = await prisma.user.upsert({
    where: { email: devEmail },
    update: {
      fullName: devName,
      role: 'DEVELOPER',
      passwordHash,
      countryCode: devCountry,
      isAgentActive: true,
      deletedAt: null,
    },
    create: {
      email: devEmail,
      fullName: devName,
      role: 'DEVELOPER',
      passwordHash,
      countryCode: devCountry,
      isAgentActive: true,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      countryCode: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Verify bcrypt password hash check
  const isMatch = await bcrypt.compare(devPassword, passwordHash);
  if (!isMatch) {
    throw new Error('Verification failure: bcrypt hash comparison did not match original password');
  }

  console.log('✅ Developer account provisioned and verified successfully!');
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│               DEVELOPER LOGIN CREDENTIALS                  │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log(`│ Email    : ${devUser.email.padEnd(48)} │`);
  console.log(`│ Password : ${devPassword.padEnd(48)} │`);
  console.log(`│ Role     : ${devUser.role.padEnd(48)} │`);
  console.log(`│ User ID  : ${devUser.id.padEnd(48)} │`);
  console.log(`│ Region   : ${devUser.countryCode.padEnd(48)} │`);
  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('💡 Access Permissions:');
  console.log('   • Exclusive access to /user-management (Credentials Override & User Classification)');
  console.log('   • Access to /developer-profit (IT platform royalties dashboard)');
  console.log('   • Full developer platform authority');
  console.log('═══════════════════════════════════════════════════════════════');
}

seedDeveloper()
  .catch((e) => {
    console.error('❌ Error provisioning developer account:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
