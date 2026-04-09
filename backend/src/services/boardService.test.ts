jest.mock('../lib/prisma', () => ({
  prisma: {
    board: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    workspaceMember: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../lib/socketEvents', () => ({
  SOCKET_EVENTS: {
    BOARD_CREATED: 'board:created',
    BOARD_UPDATED: 'board:updated',
    BOARD_DELETED: 'board:deleted',
  },
  broadcastToWorkspace: jest.fn(),
}));

import { prisma } from '../lib/prisma';
import {
  broadcastToWorkspace,
  SOCKET_EVENTS,
} from '../lib/socketEvents';
import {
  createBoard,
  deleteBoard,
  updateBoard,
} from './boardService';

const prismaMock = prisma as unknown as {
  board: {
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

const broadcastMock = broadcastToWorkspace as jest.Mock;

describe('boardService socket broadcasts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('broadcasts board created to workspace room', async () => {
    prismaMock.board.create.mockResolvedValue({
      id: 'board-1',
      title: 'Board',
      workspaceId: 'workspace-1',
      workspace: { id: 'workspace-1', name: 'Workspace' },
      lists: [],
    });

    await createBoard({
      title: 'Board',
      workspaceId: 'workspace-1',
    });

    expect(broadcastMock).toHaveBeenCalledWith(
      'workspace-1',
      SOCKET_EVENTS.BOARD_CREATED,
      expect.objectContaining({ id: 'board-1' }),
    );
  });

  it('broadcasts board updated to workspace room', async () => {
    prismaMock.board.update.mockResolvedValue({
      id: 'board-1',
      title: 'Renamed',
      workspaceId: 'workspace-1',
      workspace: { id: 'workspace-1', name: 'Workspace' },
      lists: [],
    });

    await updateBoard('board-1', { title: 'Renamed' });

    expect(broadcastMock).toHaveBeenCalledWith(
      'workspace-1',
      SOCKET_EVENTS.BOARD_UPDATED,
      expect.objectContaining({ id: 'board-1', title: 'Renamed' }),
    );
  });

  it('broadcasts board deleted to workspace room', async () => {
    prismaMock.board.delete.mockResolvedValue({
      id: 'board-1',
      workspaceId: 'workspace-1',
    });

    await deleteBoard('board-1');

    expect(broadcastMock).toHaveBeenCalledWith(
      'workspace-1',
      SOCKET_EVENTS.BOARD_DELETED,
      { id: 'board-1' },
    );
  });
});
