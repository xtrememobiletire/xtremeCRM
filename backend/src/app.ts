import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import passport from 'passport';
import './config/passport.js';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app: Application = express();

// Security & Utility Middleware
app.use(
  config.NODE_ENV === 'production'
    ? helmet() // Strict production defaults
    : helmet({
        contentSecurityPolicy: false, // Relaxed in dev for local tools, hot reload, Swagger UI
        crossOriginEmbedderPolicy: false,
      })
);
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://xtreme-crm.vercel.app',
  ...(config.FRONTEND_URL ? config.FRONTEND_URL.split(',').map((s) => s.trim()) : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-country-code'],
  })
);
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(config.COOKIE_SECRET));
app.use(passport.initialize());

// Root Redirect to Swagger Docs
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/api/docs');
});

// Static file hosting
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Root API Router
app.use('/api', apiRouter);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(errorHandler);

export default app;
