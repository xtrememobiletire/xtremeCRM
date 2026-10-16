import { Socket, Server } from 'socket.io';
import { logger } from '../utils/logger.js';

export const registerDispatchHandlers = (_io: Server, socket: Socket) => {
  socket.on('dispatch:join', (region: string) => {
    const authUser = (socket.data as any)?.user;
    const opsRoles = ['ADMIN', 'GENERAL_MANAGER', 'DISPATCHER', 'DEVELOPER', 'CALL_AGENT'];
    if (authUser && !opsRoles.includes(authUser.role)) {
      logger.warn(`[Socket.io] User ${authUser.id} (${authUser.role}) denied access to dispatch room for ${region}`);
      return;
    }
    const room = `dispatch:${region}`;
    socket.join(room);
    logger.info(`Socket ${socket.id} joined dispatch room: ${room}`);
  });

  socket.on('dispatch:assign', (data: { jobId: string; driverId: string }) => {
    logger.info(`Job assigned: ${data.jobId} to driver ${data.driverId}`);
    socket.to(`driver:${data.driverId}`).emit('job:assigned', data);
  });

  socket.on('chat:join', (jobId: string) => {
    const room = `chat:job:${jobId}`;
    socket.join(room);
    logger.info(`Socket ${socket.id} joined chat room: ${room}`);
  });

  socket.on('chat:leave', (jobId: string) => {
    const room = `chat:job:${jobId}`;
    socket.leave(room);
    logger.info(`Socket ${socket.id} left chat room: ${room}`);
  });
};

export default registerDispatchHandlers;
