import { Request, Response } from 'express';
import { telnyxService } from '../services/telnyxService.js';
import { sendSuccess, sendError, isValidPhone } from '../utils/index.js';
import { getIO } from '../config/socket.js';

export const telephonyController = {
  /**
   * Embedded Telnyx WebRTC Softphone Token (FR-1.2)
   */
  async getToken(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id || 'anon';
      const tokenData = await telnyxService.getWebRtcToken(userId);
      return sendSuccess(res, tokenData, 'WebRTC token generated');
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * Dual-Trigger Inbound Webhook Listener (FR-1.2)
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      const callData = telnyxService.handleInboundWebhook(req.body);
      const region = req.body?.data?.payload?.custom_headers?.region || 'CA';

      try {
        const io = getIO();
        io.to(`dispatch:${region}`).emit('call:incoming', callData);
      } catch {}

      return sendSuccess(res, { received: true, callData }, 'Webhook processed');
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * Click-to-Call Outbound Initiation (FR-1.2)
   */
  async makeCall(req: Request, res: Response) {
    try {
      const { toPhone, fromPhone } = req.body;
      if (!toPhone) return sendError(res, 'Destination phone number (toPhone) is required', 400);

      if (!isValidPhone(toPhone)) {
        return sendError(res, 'Invalid destination phone number format', 400);
      }

      const agent = req.user as any;
      const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      return sendSuccess(res, {
        callId,
        toPhone,
        fromPhone: fromPhone || '+14165550192',
        initiatedBy: agent?.fullName || 'Agent',
        status: 'RINGING',
      }, 'Outbound call initiated');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },
};

export default telephonyController;
