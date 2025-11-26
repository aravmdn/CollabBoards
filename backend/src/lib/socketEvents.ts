import type { SocketIO } from './socket';
import { ROOM_PREFIXES } from './socket';

// This will be set by index.ts after io is created
let ioInstance: SocketIO | null = null;

export const setSocketIO = (io: SocketIO) => {
  ioInstance = io;
};

export const getSocketIO = (): SocketIO => {
  if (!ioInstance) {
    throw new Error('Socket.IO instance not initialized');
  }
  return ioInstance;
};

/**
 * Broadcast events to board room
 */
export const broadcastToBoard = (boardId: string, event: string, data: unknown) => {
  const io = getSocketIO();
  const room = `${ROOM_PREFIXES.BOARD}${boardId}`;
  io.to(room).emit(event, data);
};

/**
 * Broadcast events to workspace room
 */
export const broadcastToWorkspace = (
  workspaceId: string,
  event: string,
  data: unknown,
) => {
  const io = getSocketIO();
  const room = `${ROOM_PREFIXES.WORKSPACE}${workspaceId}`;
  io.to(room).emit(event, data);
};

/**
 * Event names for real-time updates
 */
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

