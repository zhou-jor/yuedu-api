import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { getRedis } from '../config/database';
import { cacheKeys } from '../utils/redis';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = verifyAccessToken(token as string);
      (socket as any).userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`[Socket] User connected: ${userId}`);

    socket.join(`user:${userId}`);

    getRedis().setex(cacheKeys.onlineStatus(userId), 300, '1');

    socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conv:${data.conversationId}`).emit('typing', {
        userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      });
    });

    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('disconnect', () => {
      getRedis().del(cacheKeys.onlineStatus(userId));
      console.log(`[Socket] User disconnected: ${userId}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export const emitToUser = (userId: string, event: string, data: any) => {
  getIO().to(`user:${userId}`).emit(event, data);
};

export const emitToConversation = (conversationId: string, event: string, data: any) => {
  getIO().to(`conv:${conversationId}`).emit(event, data);
};
