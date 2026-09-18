import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
} from '../utils/index.js';
import { getIO } from '../config/socket.js';

export const messageController = {
  /**
   * Internal Portal Inbox (FR-3.2)
   */
  async getPortalMessages(req: Request, res: Response) {
    try {
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 20;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);
      const skip = calculateSkip(page, limit);

      const fleetId = req.query.fleetId as string;
      const customerId = req.query.customerId as string;
      const unreadOnly = req.query.unreadOnly === 'true';

      const where: any = {};
      if (fleetId) where.fleetId = fleetId;
      if (customerId) where.customerId = customerId;
      if (unreadOnly) where.readAt = null;

      const [messages, totalCount] = await Promise.all([
        prisma.portalMessage.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, fullName: true, role: true } },
            fleet: { select: { id: true, name: true, fleetCode: true } },
            customer: { select: { id: true, fullName: true } },
          },
        }),
        prisma.portalMessage.count({ where }),
      ]);

      const paginated = createPaginatedResponse(messages, page, limit, totalCount);
      return res.status(200).json(paginated);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async sendPortalMessage(req: Request, res: Response) {
    try {
      const senderId = (req.user as any)?.id || (await prisma.user.findFirst())?.id;
      if (!senderId) return sendError(res, 'Sender user required', 400);

      const { fleetId, customerId, subject, content, relatedEntityType, relatedEntityId } = req.body;

      const message = await prisma.portalMessage.create({
        data: {
          senderId,
          fleetId,
          customerId,
          subject,
          content,
          relatedEntityType,
          relatedEntityId,
        },
        include: {
          sender: { select: { id: true, fullName: true, role: true } },
        },
      });

      return sendSuccess(res, message, 'Portal message sent', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async markMessageRead(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const message = await prisma.portalMessage.update({
        where: { id },
        data: { readAt: new Date() },
      });

      return sendSuccess(res, message, 'Message marked as read');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Two-Way Job Dispatcher & Driver Chat (FR-4.5)
   */
  async getJobMessages(req: Request, res: Response) {
    try {
      const jobId = String(req.params.jobId);
      const messages = await prisma.jobMessage.findMany({
        where: { jobId },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, fullName: true, role: true } },
        },
      });

      return sendSuccess(res, messages);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async sendJobMessage(req: Request, res: Response) {
    try {
      const jobId = String(req.params.jobId);
      const senderId = (req.user as any)?.id || (await prisma.user.findFirst())?.id;
      if (!senderId) return sendError(res, 'Sender user required', 400);

      const { content } = req.body;

      const message = await prisma.jobMessage.create({
        data: {
          jobId,
          senderId,
          content,
        },
        include: {
          sender: { select: { id: true, fullName: true, role: true } },
        },
      });

      try {
        const io = getIO();
        io.to(`chat:job:${jobId}`).emit('chat:message', {
          jobId,
          sender: message.sender.fullName,
          senderId,
          text: content,
          timestamp: message.createdAt.toISOString(),
        });
      } catch {}

      return sendSuccess(res, message, 'Job message sent', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },
};

export default messageController;
