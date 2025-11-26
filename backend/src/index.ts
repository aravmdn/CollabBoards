import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import app from './app';

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
    origin: '*',
  },
});

io.on('connection', (socket) => {
  // Workspace and board rooms will be like workspace:{id}, board:{id}
  socket.on('join-room', (room: string) => {
    socket.join(room);
  });

  socket.on('leave-room', (room: string) => {
    socket.leave(room);
  });
});

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


