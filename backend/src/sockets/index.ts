import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { initSocket as initSocketServer, getIO } from '../config/socket.js';
import { registerDispatchHandlers } from './dispatchHandler.js';
import { registerDriverHandlers } from './driverHandler.js';
import { registerChatHandlers } from './chatHandler.js';
import { logger } from '../utils/logger.js';

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  const io = initSocketServer(httpServer);

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Register user identity and role rooms for targeted inter-role communications
    socket.on('auth:register', (data: { userId?: string; role?: string; countryCode?: string }) => {
      const { userId, role, countryCode = 'CA' } = data || {};
      if (userId) {
        socket.join(`user:${userId}`);
        logger.info(`Socket ${socket.id} registered user room: user:${userId}`);
      }
      if (role) {
        socket.join(`role:${role}`);
      }
      if (role === 'DRIVER' && userId) {
        socket.join(`driver:${userId}`);
        logger.info(`Driver ${userId} joined driver room: driver:${userId}`);
      }
      if (['DISPATCHER', 'ADMIN', 'CALL_AGENT'].includes(role || '')) {
        socket.join(`dispatch:${countryCode}`);
        logger.info(`Staff ${userId || socket.id} joined dispatch room: dispatch:${countryCode}`);
      }
      if (['ACCOUNTANT', 'ADMIN'].includes(role || '')) {
        socket.join(`accounting:${countryCode}`);
        logger.info(`Accountant/Admin ${userId || socket.id} joined accounting room: accounting:${countryCode}`);
      }
    });

    registerDispatchHandlers(io, socket);
    registerDriverHandlers(io, socket);
    registerChatHandlers(io, socket);

    socket.on('disconnect', (reason: string) => {
      logger.info(`Socket disconnected: ${socket.id} (reason: ${reason})`);
    });
  });

  return io;
};

export { getIO };
export default { initSocket, getIO };
