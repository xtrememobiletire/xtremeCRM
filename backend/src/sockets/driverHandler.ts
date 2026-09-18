import { Socket, Server } from 'socket.io';
import { logger } from '../utils/logger.js';

export const registerDriverHandlers = (io: Server, socket: Socket) => {
  socket.on('driver:join', (driverId: string) => {
    const room = driver:;
    socket.join(room);
    logger.info(Driver  connected: );
  });

  socket.on('driver:location', (data: { driverId: string; lat: number; lng: number; region: string }) => {
    io.to(dispatch:).emit('driver:location_update', data);
  });

  socket.on('driver:status', (data: { driverId: string; status: string; region: string }) => {
    io.to(dispatch:).emit('driver:status_update', data);
  });
};

export default registerDriverHandlers;
