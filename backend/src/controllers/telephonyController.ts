import { Request, Response } from 'express';
import { telnyxService } from '../services/telnyxService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { getIO } from '../config/socket.js';

export const telephonyController = {
  async getToken(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id || 'anon';
      const tokenData = await telnyxService.getWebRtcToken(userId);
      sendSuccess(res, tokenData);
    } catch (err: any) {
      sendError(res, err.message);
    }
  },

  async handleWebhook(req: Request, res: Response) {
    try {
      const callData = telnyxService.handleInboundWebhook(req.body);
      try {
        const io = getIO();
        io.to('dispatch:CA').emit('call:incoming', callData);
      } catch {}
      sendSuccess(res, { received: true, callData });
    } catch (err: any) {
      sendError(res, err.message);
    }
  },
};

export default telephonyController;
