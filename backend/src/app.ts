import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import './config/passport.js';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app: Application = express();

// Trust reverse proxy (Dokploy / Traefik / Nginx) for accurate client IP resolution
app.set('trust proxy', 1);

// Global API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/sse'),
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
    timestamp: new Date().toISOString(),
  },
});

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
      const isLocalDev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (allowedOrigins.includes(origin) || isLocalDev) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS'));
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

// Root API Router with rate limiting
app.use('/api', apiLimiter);
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
