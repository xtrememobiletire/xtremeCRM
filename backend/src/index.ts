import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

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

// Basic Hello & Health Routes
app.get('/api/hello', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Hello from XtremeCRM Express Backend!',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'xtremecrm-backend',
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 XtremeCRM backend running at http://localhost:${PORT}`);
});
