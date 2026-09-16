import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

// Automatically load environment (.env.development vs .env.production)
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config(); // Fallback to root or default .env if present


const app = express();
const PORT = process.env.PORT || 5000;

// Security & Utility Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

import { prisma } from './lib/prisma.js';

// Basic Hello & Health Routes
app.get('/api/hello', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Hello from XtremeCRM Express Backend!',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    res.json({
      status: 'ok',
      service: 'xtremecrm-backend',
      database: 'connected (Neon PostgreSQL via PgBouncer pooler)',
      userCount,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      service: 'xtremecrm-backend',
      database: 'disconnected',
      error: err instanceof Error ? err.message : 'Database query failed',
    });
  }
});


// Start Server
app.listen(PORT, () => {
  console.log(`🚀 XtremeCRM backend running at http://localhost:${PORT}`);
});
