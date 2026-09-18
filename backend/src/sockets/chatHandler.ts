import { Socket, Server } from 'socket.io';
import { logger } from '../utils/logger.js';

export const registerChatHandlers = (_io: Server, socket: Socket) => {
  socket.on('chat:join', (jobId: string) => {
    const room = chat:job:;
    socket.join(room);
    logger.info(Socket  joined job chat room: );
  });

  socket.on('chat:message', (data: { jobId: string; sender: string; text: string }) => {
    socket.to(chat:job:).emit('chat:message', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  });
};

export default registerChatHandlers;
