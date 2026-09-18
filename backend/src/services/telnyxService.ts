import { config } from '../config/env.js';

export const telnyxService = {
  async getWebRtcToken(userId: string) {
    return {
      token: 	elnyx_simulated_token__,
      connectionId: config.TELNYX.CONNECTION_ID,
      sipUsername: gent_,
    };
  },

  handleInboundWebhook(payload: any) {
    return {
      callId: payload.data?.payload?.call_control_id || 'unknown',
      callerNumber: payload.data?.payload?.from || 'unknown',
      event: payload.data?.event_type || 'call.initiated',
    };
  },
};

export default telnyxService;
