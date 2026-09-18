import { prisma } from '../config/database.js';
import { CountryCode, JobStatus } from '../types/common.js';

export const jobService = {
  async listJobs(countryCode: CountryCode) {
    return prisma.job.findMany({
      where: { countryCode },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        vehicle: true,
        driver: { select: { id: true, fullName: true, phone: true } },
      },
    });
  },

  async getJobById(id: string) {
    return prisma.job.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        driver: { select: { id: true, fullName: true, phone: true } },
        createdBy: { select: { id: true, fullName: true } },
        serviceItems: true,
      },
    });
  },

  async createJob(data: any, createdById: string) {
    const jobCode = JOB--;
    return prisma.job.create({
      data: {
        ...data,
        jobCode,
        createdById,
        currency: data.countryCode === 'UK' ? 'GBP' : data.countryCode === 'US' ? 'USD' : 'CAD',
      },
      include: {
        customer: true,
        vehicle: true,
      },
    });
  },

  async updateJobStatus(id: string, status: JobStatus, driverId?: string, notes?: string) {
    return prisma.job.update({
      where: { id },
      data: {
        status,
        ...(driverId ? { driverId, assignedAt: new Date() } : {}),
        ...(notes ? { problemNotes: notes } : {}),
      },
      include: {
        driver: { select: { id: true, fullName: true } },
      },
    });
  },
};

export default jobService;
