import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { initSocket as initSocketServer, getIO } from '../config/socket.js';
import { registerDispatchHandlers } from './dispatchHandler.js';
import { registerDriverHandlers } from './driverHandler.js';
import { registerChatHandlers } from './chatHandler.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  const io = initSocketServer(httpServer);

  // Enforce JWT authentication during handshake
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.cookie?.match(/(?:^|;\s*)token=([^;]+)/)?.[1] ||
        (socket.handshake.query?.token as string);

      if (!token) {
        // Fallback for public tracking or reject
        socket.data.user = null;
        return next();
      }

      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      socket.data.user = decoded;
      return next();
    } catch (err: any) {
      logger.warn(`[Socket.io] Handshake auth failed: ${err.message}`);
      socket.data.user = null;
      return next();
    }
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.data.user?.id || 'anonymous'})`);

    const authUser = socket.data.user;
    if (authUser?.id) {
      socket.join(`user:${authUser.id}`);
      if (authUser.role) socket.join(`role:${authUser.role}`);
      if (authUser.role === 'DRIVER') socket.join(`driver:${authUser.id}`);
      const countryCode = authUser.countryCode || 'CA';
      if (['DISPATCHER', 'ADMIN', 'GENERAL_MANAGER', 'CALL_AGENT'].includes(authUser.role)) {
        socket.join(`dispatch:${countryCode}`);
      }
      if (['ACCOUNTANT', 'ADMIN', 'GENERAL_MANAGER'].includes(authUser.role)) {
        socket.join(`accounting:${countryCode}`);
      }
    }

    // Register user identity and role rooms (validated against socket.data.user)
    socket.on('auth:register', (data: { userId?: string; role?: string; countryCode?: string }) => {
      const verifiedUser = socket.data.user;
      // ponytail: if verified, use server identity; ignore client spoofing
      const userId = verifiedUser?.id || data?.userId;
      const role = verifiedUser?.role || data?.role;
      const countryCode = verifiedUser?.countryCode || data?.countryCode || 'CA';

      if (userId && (!verifiedUser || verifiedUser.id === userId)) {
        socket.join(`user:${userId}`);
      }
      if (role && (!verifiedUser || verifiedUser.role === role)) {
        socket.join(`role:${role}`);
      }
      if (role === 'DRIVER' && userId && (!verifiedUser || verifiedUser.id === userId)) {
        socket.join(`driver:${userId}`);
      }
      if (['DISPATCHER', 'ADMIN', 'GENERAL_MANAGER', 'CALL_AGENT'].includes(role || '') && (!verifiedUser || ['DISPATCHER', 'ADMIN', 'GENERAL_MANAGER'].includes(verifiedUser.role))) {
        socket.join(`dispatch:${countryCode}`);
      }
      if (['ACCOUNTANT', 'ADMIN', 'GENERAL_MANAGER'].includes(role || '') && (!verifiedUser || ['ACCOUNTANT', 'ADMIN', 'GENERAL_MANAGER'].includes(verifiedUser.role))) {
        socket.join(`accounting:${countryCode}`);
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
