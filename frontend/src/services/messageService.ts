import { api } from '../utils/api';

export interface JobMessageItem {
  id: string;
  jobId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: {
    id: string;
    fullName: string;
    role: string;
  };
}

export const messageService = {
  async getJobMessages(jobId: string): Promise<JobMessageItem[]> {
    const res = await api.get(`/messages/job/${jobId}`);
    return res.data.data || [];
  },

  async sendJobMessage(jobId: string, content: string): Promise<JobMessageItem> {
    const res = await api.post(`/messages/job/${jobId}`, { content });
    return res.data.data;
  },
};
