import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';
import { config } from '../config/env.js';

export const authService = {
  async register(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: any;
    countryCode?: any;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error('User with this email already exists');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        role: data.role || 'CALL_AGENT',
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

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, countryCode: user.countryCode },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as any }
    );

    return { user, token };
  },

  async login(email: string, pass: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
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
