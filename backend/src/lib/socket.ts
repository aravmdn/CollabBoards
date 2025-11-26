import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../config/jwt';
import { AuthPayload } from '../middleware/auth';
import { prisma } from './prisma';

// Extend Socket interface to include user data
export interface AuthenticatedSocket extends Socket {
  user?: AuthPayload;
}

/**
 * Authenticate socket connection using JWT token
 */
export const authenticateSocket = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void,
) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const payload = verifyAccessToken(token as string);
    
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.user = payload;
    next();
  } catch {
    next(new Error('Authentication error: Invalid token'));
  }
};

/**
 * Verify user is a member of a workspace before joining workspace room
 */
export const verifyWorkspaceAccess = async (
  socket: AuthenticatedSocket,
  workspaceId: string,
): Promise<boolean> => {
  if (!socket.user) {
    return false;
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: socket.user.userId,
        workspaceId,
      },
    },
  });

  return !!membership;
};

/**
 * Verify user has access to a board (via workspace membership)
 */
export const verifyBoardAccess = async (
  socket: AuthenticatedSocket,
  boardId: string,
): Promise<boolean> => {
  if (!socket.user) {
    return false;
  }

  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      workspace: {
        members: {
          some: {
            userId: socket.user.userId,
          },
        },
      },
    },
  });

  return !!board;
};

/**
 * Room naming conventions:
 * - workspace:{workspaceId} - for workspace-level updates
 * - board:{boardId} - for board-level updates (card moves, list changes, etc.)
 */
export const ROOM_PREFIXES = {
  WORKSPACE: 'workspace:',
  BOARD: 'board:',
} as const;

export type SocketIO = SocketIOServer;

