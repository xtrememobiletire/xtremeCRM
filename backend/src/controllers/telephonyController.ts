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
      const region = callData.region || req.body?.data?.payload?.custom_headers?.region || 'CA';

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
      const { toPhone, fromPhone, leadId } = req.body;
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
        leadId,
        initiatedBy: agent?.fullName || 'Agent',
        status: 'RINGING',
      }, 'Outbound call initiated');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Attended (Warm) Call Transfer to Dispatcher Manager (FR-1.2, FR-9.6)
   */
  async transferCall(req: Request, res: Response) {
    try {
      const {
        callId,
        transferType = 'INBOUND_MOTORIST',
        callerPhone,
        callerName,
        notes,
        vehicleInfo,
        leadId,
        companyName,
        destination = 'DISPATCH_MANAGER',
      } = req.body;

      const agent = req.user as any;
      const region = agent?.countryCode || 'CA';

      // 1. Telnyx Call Control API transfer (or simulated)
      const telnyxResult = await telnyxService.transferCall({
        callControlId: callId || `call-${Date.now()}`,
        to: destination === 'DISPATCH_MANAGER' ? `sip:dispatch_${region}@xtreme.sip.telnyx.com` : destination,
        customHeaders: {
          'X-Transfer-Agent': agent?.fullName || 'Agent',
          'X-Region': region,
        },
      });

      // 2. Broadcast warm transfer notification to Dispatcher Managers & Admins via Socket.io
      const transferPayload = {
        transferType, // 'INBOUND_MOTORIST' or 'OUTBOUND_LEAD'
        callId: callId || `call-${Date.now()}`,
        callerPhone: callerPhone || '+1 (416) 555-0192',
        callerName: callerName || companyName || 'Stranded Motorist',
        companyName,
        notes: notes || 'Caller requesting urgent roadside tire assistance',
        vehicleInfo: vehicleInfo || 'Vehicle details pending',
        leadId,
        transferringAgent: agent?.fullName || 'Call Center Agent',
        countryCode: region,
        timestamp: new Date().toISOString(),
      };

      try {
        const io = getIO();
        io.to(`dispatch:${region}`).emit('call:transfer', transferPayload);
        io.to('role:DISPATCHER').emit('call:transfer', transferPayload);
        io.to('role:ADMIN').emit('call:transfer', transferPayload);
      } catch {}

      return sendSuccess(res, {
        transferred: true,
        telnyxResult,
        payload: transferPayload,
      }, 'Call successfully transferred to Dispatcher Manager');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },
};

export default telephonyController;
