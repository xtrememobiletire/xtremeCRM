import { Request, Response } from 'express';
import { sseManager } from '../services/sseManager.js';

export const sseController = {
  stream(req: Request, res: Response) {
    const user = req.user as any;
    const countryCode = (req.query.countryCode as string) || (req as any).countryCode || user?.countryCode || 'CA';
    const userId = user?.id || 'anonymous';
    const role = user?.role || 'GUEST';
    const lastEventId = req.headers['last-event-id'] as string;

    // Standard SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Traefik/Nginx buffering
    res.flushHeaders?.();

    // Initial connection acknowledgement
    res.write(`:connected\n\n`);

    const clientId = sseManager.addClient(res, countryCode, userId, role, lastEventId);

    req.on('close', () => {
      sseManager.removeClient(clientId);
    });
  },
};
