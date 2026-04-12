jest.mock('../lib/prisma', () => ({
  prisma: {
    workspaceMember: {
      findUnique: jest.fn(),
    },
    workspace: {
      update: jest.fn(),
    },
    board: {
      create: jest.fn(),
    },
    list: {
      findFirst: jest.fn(),
    },
    card: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    comment: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('../lib/socketEvents', () => ({
  SOCKET_EVENTS: {
    BOARD_CREATED: 'board:created',
    CARD_CREATED: 'card:created',
    CARD_UPDATED: 'card:updated',
    CARD_MOVED: 'card:moved',
    COMMENT_DELETED: 'comment:deleted',
  },
  broadcastToWorkspace: jest.fn(),
  broadcastToBoard: jest.fn(),
}));

import { prisma } from '../lib/prisma';
import { createBoard } from './boardService';
import { createCard, updateCard } from './cardService';
import { deleteComment } from './commentService';
import { updateWorkspace } from './workspaceService';

const prismaMock = prisma as unknown as {
  workspaceMember: {
    findUnique: jest.Mock;
  };
  workspace: {
    update: jest.Mock;
  };
  board: {
    create: jest.Mock;
  };
  list: {
    findFirst: jest.Mock;
  };
  card: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  comment: {
    findFirst: jest.Mock;
    delete: jest.Mock;
  };
};

describe('tenant scope enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks workspace updates without the required role', async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({
      role: 'MEMBER',
    });

    await expect(
      updateWorkspace('workspace-1', { name: 'Renamed' }, 'user-1'),
    ).rejects.toMatchObject({
      message: 'Forbidden',
      status: 403,
    });

    expect(prismaMock.workspace.update).not.toHaveBeenCalled();
  });

  it('blocks board creation outside workspace membership', async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue(null);

    await expect(
      createBoard(
        {
          title: 'Hidden board',
          workspaceId: 'workspace-2',
        },
        'user-1',
      ),
    ).rejects.toMatchObject({
      message: 'Workspace not found',
      status: 404,
    });

    expect(prismaMock.board.create).not.toHaveBeenCalled();
  });

  it('blocks assigning cards to users outside the workspace', async () => {
    prismaMock.list.findFirst.mockResolvedValue({
      id: 'list-1',
      boardId: 'board-1',
      board: {
        workspaceId: 'workspace-1',
      },
    });
    prismaMock.workspaceMember.findUnique.mockResolvedValue(null);

    await expect(
      createCard(
        {
          title: 'Card',
          listId: 'list-1',
          assigneeId: 'user-2',
        },
        'user-1',
      ),
    ).rejects.toMatchObject({
      message: 'Assignee must belong to the workspace',
      status: 400,
    });

    expect(prismaMock.card.create).not.toHaveBeenCalled();
  });

  it('blocks moving cards across workspaces', async () => {
    prismaMock.card.findFirst.mockResolvedValueOnce({
      id: 'card-1',
      title: 'Card',
      listId: 'list-1',
      list: {
        boardId: 'board-1',
        board: {
          workspaceId: 'workspace-1',
        },
      },
    });
    prismaMock.list.findFirst.mockResolvedValueOnce({
      id: 'list-2',
      boardId: 'board-2',
      board: {
        workspaceId: 'workspace-2',
      },
    });

    await expect(
      updateCard('card-1', { listId: 'list-2' }, 'user-1'),
    ).rejects.toMatchObject({
      message: 'Card cannot move across workspaces',
      status: 400,
    });

    expect(prismaMock.card.update).not.toHaveBeenCalled();
  });

  it('blocks comment deletion after workspace membership is lost', async () => {
    prismaMock.comment.findFirst.mockResolvedValue(null);

    await expect(deleteComment('comment-1', 'user-1')).rejects.toMatchObject({
      message: 'Comment not found',
      status: 404,
    });

    expect(prismaMock.comment.delete).not.toHaveBeenCalled();
  });
});
