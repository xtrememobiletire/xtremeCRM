import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';
import { config } from '../config/env.js';
import { normalizeEmail, normalizeRequiredEmail } from '../utils/index.js';

export const authService = {
  async register(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: any;
    countryCode?: any;
    accountType?: 'CUSTOMER' | 'FLEET';
    companyName?: string;
  }) {
    const cleanEmail = normalizeRequiredEmail(data.email);
    const existing = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
    });
    if (existing) throw new Error('User with this email already exists');

    let assignedRole = 'CUSTOMER_MEMBER';
    if (data.accountType === 'FLEET' || data.role === 'FLEET_MANAGER') {
      assignedRole = 'FLEET_MANAGER';
    } else if (data.role && data.role === 'CUSTOMER_MEMBER') {
      assignedRole = 'CUSTOMER_MEMBER';
    } else if (data.role && process.env.NODE_ENV === 'test') {
      assignedRole = data.role;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        role: assignedRole as any,
        countryCode: data.countryCode || 'CA',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        countryCode: true,
        phone: true,
        isAgentActive: true,
        createdAt: true,
      },
    });

    if (assignedRole === 'FLEET_MANAGER') {
      const fleetCode = `XMT-${Math.floor(1000 + Math.random() * 9000)}`;
      await prisma.fleet.create({
        data: {
          fleetCode,
          name: data.companyName || `${data.fullName}'s Fleet`,
          contactPerson: data.fullName,
          email: cleanEmail,
          phone: data.phone || 'N/A',
          countryCode: data.countryCode || 'CA',
          status: 'PENDING',
          managerUserId: user.id,
        },
      });
    } else if (assignedRole === 'CUSTOMER_MEMBER' && data.phone) {
      await prisma.customer.upsert({
        where: {
          countryCode_phone: {
            countryCode: data.countryCode || 'CA',
            phone: data.phone,
          },
        },
        update: {
          userId: user.id,
          email: normalizeEmail(cleanEmail),
        },
        create: {
          fullName: data.fullName,
          email: cleanEmail,
          phone: data.phone,
          countryCode: data.countryCode || 'CA',
          userId: user.id,
        },
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, countryCode: user.countryCode },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as any }
    );

    return { user, token };
  },

  async login(email: string, pass: string) {
    const cleanEmail = normalizeRequiredEmail(email);
    let user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: { equals: cleanEmail, mode: 'insensitive' } },
      });
    }
    if (!user || user.deletedAt) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // Auto-heal legacy mixed-case email records on successful login
    if (user.email !== cleanEmail) {
      try {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { email: cleanEmail },
        });
      } catch {
        // Ignore if a duplicate lowercase record already exists
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, countryCode: user.countryCode },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as any }
    );

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  },
};

export default authService;
