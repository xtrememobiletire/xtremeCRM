import { Socket, Server } from 'socket.io';
import { logger } from '../utils/logger.js';

export const registerDispatchHandlers = (_io: Server, socket: Socket) => {
  socket.on('dispatch:join', (region: string) => {
    const room = `dispatch:${region}`;
    socket.join(room);
    logger.info(`Socket ${socket.id} joined dispatch room: ${room}`);
  });

  socket.on('dispatch:assign', (data: { jobId: string; driverId: string }) => {
    logger.info(`Job assigned: ${data.jobId} to driver ${data.driverId}`);
    socket.to(`driver:${data.driverId}`).emit('job:assigned', data);
  });
};

export default registerDispatchHandlers;
