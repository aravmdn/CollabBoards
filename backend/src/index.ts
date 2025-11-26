import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import app from './app';
import {
  authenticateSocket,
  verifyWorkspaceAccess,
  verifyBoardAccess,
  ROOM_PREFIXES,
  AuthenticatedSocket,
} from './lib/socket';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_ACCESS_TOKEN_SECRET',
  'JWT_REFRESH_TOKEN_SECRET',
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`,
  );
  process.exit(1);
}

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
});

// Apply authentication middleware
io.use(authenticateSocket);

io.on('connection', async (socket: AuthenticatedSocket) => {
  if (!socket.user) {
    socket.disconnect();
    return;
  }

  console.log(`Socket connected: ${socket.user.userId}`);

  // Join workspace room
  socket.on('join-workspace', async (workspaceId: string) => {
    const hasAccess = await verifyWorkspaceAccess(socket, workspaceId);
    if (hasAccess) {
      const room = `${ROOM_PREFIXES.WORKSPACE}${workspaceId}`;
      socket.join(room);
      console.log(`Socket ${socket.user?.userId} joined ${room}`);
    } else {
      socket.emit('error', { message: 'Access denied to workspace' });
    }
  });

  // Leave workspace room
  socket.on('leave-workspace', (workspaceId: string) => {
    const room = `${ROOM_PREFIXES.WORKSPACE}${workspaceId}`;
    socket.leave(room);
    console.log(`Socket ${socket.user?.userId} left ${room}`);
  });

  // Join board room
  socket.on('join-board', async (boardId: string) => {
    const hasAccess = await verifyBoardAccess(socket, boardId);
    if (hasAccess) {
      const room = `${ROOM_PREFIXES.BOARD}${boardId}`;
      socket.join(room);
      console.log(`Socket ${socket.user?.userId} joined ${room}`);
    } else {
      socket.emit('error', { message: 'Access denied to board' });
    }
  });

  // Leave board room
  socket.on('leave-board', (boardId: string) => {
    const room = `${ROOM_PREFIXES.BOARD}${boardId}`;
    socket.leave(room);
    console.log(`Socket ${socket.user?.userId} left ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.user?.userId}`);
  });
});

// Export io instance for use in services
export { io };
import { setSocketIO } from './lib/socketEvents';
setSocketIO(io);

const PORT = Number.parseInt(process.env.PORT || '4000', 10);

if (Number.isNaN(PORT)) {
  console.error('Invalid PORT environment variable');
  process.exit(1);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});


