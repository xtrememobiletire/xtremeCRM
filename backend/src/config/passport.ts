import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { config } from './env.js';
import { prisma } from './database.js';

const cookieExtractor = (req: any) => req?.cookies?.token || null;

const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    cookieExtractor,
  ]),
  secretOrKey: config.JWT_SECRET,
};

const userCache = new Map<string, { user: any; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export const invalidateUserAuthCache = (userId?: string) => {
  if (userId) {
    userCache.delete(userId);
  } else {
    userCache.clear();
  }
};

passport.use(
  new JwtStrategy(opts, async (jwtPayload, done) => {
    try {
      const now = Date.now();
      const cached = userCache.get(jwtPayload.id);
      if (cached && cached.expiresAt > now) {
        return done(null, cached.user);
      }

      const user = await prisma.user.findUnique({
        where: { id: jwtPayload.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          countryCode: true,
          phone: true,
          isAgentActive: true,
          canApprovePayouts: true,
          deletedAt: true,
        },
      });

      if (user && !user.deletedAt) {
        userCache.set(jwtPayload.id, { user, expiresAt: now + CACHE_TTL_MS });
        return done(null, user);
      }
      userCache.delete(jwtPayload.id);
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  })
);

export default passport;
