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
