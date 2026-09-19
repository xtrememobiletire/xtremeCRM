import { Socket, Server } from 'socket.io';
import { logger } from '../utils/logger.js';

export const registerChatHandlers = (_io: Server, socket: Socket) => {
  socket.on('chat:join', (jobId: string) => {
    const room = `chat:job:${jobId}`;
    socket.join(room);
    logger.info(`Socket ${socket.id} joined job chat room: ${room}`);
  });

  socket.on('chat:message', (data: { jobId: string; sender: string; text: string }) => {
    socket.to(`chat:job:${data.jobId}`).emit('chat:message', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  });
};

export default registerChatHandlers;
