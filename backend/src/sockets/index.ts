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

    // Agent tri-state presence (PRD FR-1.1: Mutually exclusive INACTIVE / INBOUND / OUTBOUND)
    socket.on('agent:presence', (data: { userId?: string; mode?: string; countryCode?: string }) => {
      const { userId, mode = 'INACTIVE', countryCode = 'CA' } = data || {};

      // Leave mutually exclusive agent rooms
      socket.leave(`agents:inbound:${countryCode}`);
      socket.leave(`agents:outbound:${countryCode}`);
      socket.leave(`agents:inbound`);
      socket.leave(`agents:outbound`);

      if (mode === 'INBOUND') {
        socket.join(`agents:inbound:${countryCode}`);
        socket.join(`agents:inbound`);
        logger.info(`Agent ${userId || socket.id} joined INBOUND room for ${countryCode}`);
      } else if (mode === 'OUTBOUND') {
        socket.join(`agents:outbound:${countryCode}`);
        socket.join(`agents:outbound`);
        logger.info(`Agent ${userId || socket.id} joined OUTBOUND room for ${countryCode}`);
      } else {
        logger.info(`Agent ${userId || socket.id} set presence to INACTIVE`);
      }

      // Notify dispatchers and admins of agent status
      io.to(`dispatch:${countryCode}`).emit('agent:presence_updated', {
        userId,
        socketId: socket.id,
        mode,
        countryCode,
        timestamp: new Date().toISOString(),
      });
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
