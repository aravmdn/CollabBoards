import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export const getSocket = (token?: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(BACKEND_URL, {
    transports: ['websocket'],
    auth: token ? { token } : undefined,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('error', (error: { message: string }) => {
    console.error('Socket error:', error.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Socket event names (should match backend SOCKET_EVENTS)
export const SOCKET_EVENTS = {
  // Board events
  BOARD_CREATED: 'board:created',
  BOARD_UPDATED: 'board:updated',
  BOARD_DELETED: 'board:deleted',
  
  // List events
  LIST_CREATED: 'list:created',
  LIST_UPDATED: 'list:updated',
  LIST_DELETED: 'list:deleted',
  
  // Card events
  CARD_CREATED: 'card:created',
  CARD_UPDATED: 'card:updated',
  CARD_MOVED: 'card:moved',
  CARD_DELETED: 'card:deleted',
  
  // Comment events
  COMMENT_ADDED: 'comment:added',
  COMMENT_DELETED: 'comment:deleted',
} as const;

