import { prisma } from '../config/database.js';

/**
 * Generate a unique job code with collision retry loop
 */
export async function generateUniqueJobCode(country: string, prefix = 'JOB'): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = `${prefix}-${country}-${Math.floor(10000 + Math.random() * 90000)}`;
    const exists = await prisma.job.findUnique({ where: { jobCode: code } });
    if (!exists) return code;
  }
  return `${prefix}-${country}-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
}

/**
 * Generate a unique fleet code with collision retry loop
 */
export async function generateUniqueFleetCode(customCode?: string): Promise<string> {
  if (customCode?.trim()) return customCode.trim().toUpperCase();
  for (let i = 0; i < 5; i++) {
    const code = `XMT-${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await prisma.fleet.findUnique({ where: { fleetCode: code } });
    if (!exists) return code;
  }
  return `XMT-${Date.now().toString().slice(-4)}`;
}
