import { Socket, Server } from 'socket.io';
import { logger } from '../utils/logger.js';

export const registerDriverHandlers = (io: Server, socket: Socket) => {
  socket.on('driver:join', (driverId: string) => {
    const room = `driver:${driverId}`;
    socket.join(room);
    logger.info(`Driver connected: ${driverId}`);
  });

  socket.on('driver:location', (data: { driverId: string; lat: number; lng: number; region: string }) => {
    io.to(`dispatch:${data.region}`).emit('driver:location_update', data);
  });

  socket.on('driver:status', (data: { driverId: string; status: string; region: string }) => {
    io.to(`dispatch:${data.region}`).emit('driver:status_update', data);
  });
};

export default registerDriverHandlers;
