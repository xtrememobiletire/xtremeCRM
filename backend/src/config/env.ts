import dotenv from 'dotenv';
import path from 'path';

// Automatically load environment (.env.development vs .env.production)
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config(); // Fallback to root or default .env if present

export const config = {
  NODE_ENV: nodeEnv,
  PORT: Number(process.env.PORT) || 5000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || '',
  DIRECT_URL: process.env.DIRECT_URL || '',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'default_cookie_secret_change_me',
  JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  TELNYX: {
    API_KEY: process.env.TELNYX_API_KEY || '',
    PUBLIC_KEY: process.env.TELNYX_PUBLIC_KEY || '',
    CONNECTION_ID: process.env.TELNYX_CONNECTION_ID || '',
  },
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
} as const;

export default config;
