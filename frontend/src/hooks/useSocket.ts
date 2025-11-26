import { useEffect, useRef } from 'react';
import { getSocket, SOCKET_EVENTS, type Socket } from '../lib/socket';

interface UseSocketOptions {
  token?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: { message: string }) => void;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const { token, onConnect, onDisconnect, onError } = options;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket(token);
    socketRef.current = socket;

    if (onConnect) {
      socket.on('connect', onConnect);
    }

    if (onDisconnect) {
      socket.on('disconnect', onDisconnect);
    }

    if (onError) {
      socket.on('error', onError);
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
    };
  }, [token, onConnect, onDisconnect, onError]);

  const joinWorkspace = (workspaceId: string) => {
    socketRef.current?.emit('join-workspace', workspaceId);
  };

  const leaveWorkspace = (workspaceId: string) => {
    socketRef.current?.emit('leave-workspace', workspaceId);
  };

  const joinBoard = (boardId: string) => {
    socketRef.current?.emit('join-board', boardId);
  };

  const leaveBoard = (boardId: string) => {
    socketRef.current?.emit('leave-board', boardId);
  };

  const on = (event: string, callback: (data: unknown) => void) => {
    socketRef.current?.on(event, callback);
  };

  const off = (event: string, callback?: (data: unknown) => void) => {
    if (callback) {
      socketRef.current?.off(event, callback);
    } else {
      socketRef.current?.off(event);
    }
  };

  return {
    socket: socketRef.current,
    joinWorkspace,
    leaveWorkspace,
    joinBoard,
    leaveBoard,
    on,
    off,
    SOCKET_EVENTS,
  };
};

