import { api } from '../utils/api';

export const telephonyService = {
  async getToken(): Promise<{ token: string; connectionId: string; sipUsername: string }> {
    const res = await api.get('/telephony/token');
    return res.data.data;
  },

  async triggerTestCall(callerNumber = '+1 (416) 555-0192') {
    const res = await api.post('/telephony/webhook', {
      data: {
        event_type: 'call.initiated',
        payload: {
          call_control_id: `call-${Date.now()}`,
          from: callerNumber,
        },
      },
    });
    return res.data;
  },
};
