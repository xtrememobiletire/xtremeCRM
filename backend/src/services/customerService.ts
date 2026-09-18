import { prisma } from '../config/database.js';
import { CountryCode } from '../types/common.js';

export const customerService = {
  async searchCustomer(query: string, countryCode: CountryCode) {
    return prisma.customer.findMany({
      where: {
        countryCode,
        OR: [
          { phone: { contains: query } },
          { fullName: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        vehicles: true,
      },
    });
  },

  async getCustomerById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        vehicles: true,
        jobs: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
  },

  async createCustomer(data: any) {
    return prisma.customer.create({
      data,
      include: {
        vehicles: true,
      },
    });
  },
};

export default customerService;
