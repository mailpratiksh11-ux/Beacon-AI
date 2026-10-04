import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { verifyToken } from '../utils/token.js';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';

let io = null;
const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const room = (userId) => `user:${userId}`;

export async function initSocket(httpServer) {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (env.corsOrigin.includes(origin)) return cb(null, true);
        if (!env.isProd && LOCALHOST_RE.test(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    },
  });

  // Scale Socket.IO across multiple instances via Redis pub/sub (optional).
  const pair = await redis.pubSubPair();
  if (pair) {
    io.adapter(createAdapter(pair.pub, pair.sub));
    console.log('✔ Socket.IO using Redis adapter');
  }

  // Authenticate every socket with the same JWT used by the REST API.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const payload = verifyToken(String(token));
      socket.userId = payload.uid;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(room(socket.userId));
    socket.emit('connected', { userId: socket.userId, at: new Date().toISOString() });
    socket.on('disconnect', () => { /* room cleanup is automatic */ });
  });

  console.log('✔ Socket.IO ready on /socket.io');
  return io;
}

export function getIO() { return io; }

// Emit an event to every live socket belonging to one user.
export function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(room(userId)).emit(event, payload);
}

export async function closeSocket() {
  try { await io?.close(); } catch { /* ignore */ }
}
