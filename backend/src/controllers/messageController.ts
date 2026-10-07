import { Request, Response } from 'express';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  createPaginatedResponse,
} from '../utils/index.js';

export const messageController = {
  /**
   * Internal Portal Inbox (External communication handled via WhatsApp/SMS/Email)
   */
  async getPortalMessages(req: Request, res: Response) {
    try {
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 20;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);

      const paginated = createPaginatedResponse([], page, limit, 0);
      return res.status(200).json(paginated);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async sendPortalMessage(req: Request, res: Response) {
    return sendSuccess(res, { id: 'msg-external' }, 'Portal message processed', 201);
  },

  async markMessageRead(req: Request, res: Response) {
    return sendSuccess(res, { id: req.params.id }, 'Message marked as read');
  },

  /**
   * Two-Way Job Dispatcher & Driver Chat (Delegated to WhatsApp / Phone Call)
   */
  async getJobMessages(req: Request, res: Response) {
    return sendSuccess(res, []);
  },

  async sendJobMessage(req: Request, res: Response) {
    return sendSuccess(res, { id: 'msg-external' }, 'Job message processed', 201);
  },
};

export default messageController;
