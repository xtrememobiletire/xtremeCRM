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

passport.use(
  new JwtStrategy(opts, async (jwtPayload, done) => {
    try {
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
        return done(null, user);
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  })
);

export default passport;
