import { Socket, Server } from 'socket.io';
import { logger } from '../utils/logger.js';

export const registerDispatchHandlers = (_io: Server, socket: Socket) => {
  socket.on('dispatch:join', (region: string) => {
    const room = dispatch:;
    socket.join(room);
    logger.info(Socket  joined dispatch room: );
  });

  socket.on('dispatch:assign', (data: { jobId: string; driverId: string }) => {
    logger.info(Job assigned:  to driver );
    socket.to(driver:).emit('job:assigned', data);
  });
};

export default registerDispatchHandlers;
