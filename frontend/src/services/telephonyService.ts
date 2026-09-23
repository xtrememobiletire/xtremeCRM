import { api } from '../utils/api';

export interface TransferCallParams {
  callId?: string;
  transferType?: 'INBOUND_MOTORIST' | 'OUTBOUND_LEAD';
  callerPhone?: string;
  callerName?: string;
  companyName?: string;
  notes?: string;
  vehicleInfo?: string;
  leadId?: string;
}

export const telephonyService = {
  async getToken(): Promise<{ token: string; connectionId: string; sipUsername: string }> {
    const res = await api.get('/telephony/token');
    return res.data.data;
  },

  async triggerTestCall(callerNumber = '+1 (416) 555-0192', callerName = 'Roadside Motorist') {
    const res = await api.post('/telephony/webhook', {
      data: {
        event_type: 'call.initiated',
        payload: {
          call_control_id: `call-${Date.now()}`,
          from: callerNumber,
          from_name: callerName,
        },
      },
    });
    return res.data;
  },

  async makeCall(toPhone: string, leadId?: string) {
    const res = await api.post('/telephony/call', { toPhone, leadId });
    return res.data.data;
  },

  async transferCall(params: TransferCallParams) {
    const res = await api.post('/telephony/transfer', params);
    return res.data.data;
  },
};

export default telephonyService;
