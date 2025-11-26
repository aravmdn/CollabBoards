import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import app from './app';

dotenv.config();

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

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});


