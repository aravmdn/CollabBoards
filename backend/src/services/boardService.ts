import { prisma } from '../lib/prisma';
import {
  broadcastToWorkspace,
  SOCKET_EVENTS,
} from '../lib/socketEvents';
import {
  requireBoardManagerRole,
  requireWorkspaceManagerRole,
} from './accessControl';

export interface CreateBoardInput {
  title: string;
  description?: string;
  workspaceId: string;
}

export interface UpdateBoardInput {
  title?: string;
  description?: string;
}

export async function createBoard(input: CreateBoardInput, userId: string) {
  await requireWorkspaceManagerRole(input.workspaceId, userId);

  const board = await prisma.board.create({
    data: {
      title: input.title,
      description: input.description,
      workspaceId: input.workspaceId,
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
      lists: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  });

  broadcastToWorkspace(board.workspaceId, SOCKET_EVENTS.BOARD_CREATED, board);

  return board;
}

export async function getBoardById(id: string, userId: string) {
  const board = await prisma.board.findFirst({
    where: {
      id,
      workspace: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
      lists: {
        orderBy: {
          position: 'asc',
        },
        include: {
          cards: {
            orderBy: {
              position: 'asc',
            },
            include: {
              assignee: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
              _count: {
                select: {
                  comments: true,
                  attachments: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!board) {
    throw Object.assign(new Error('Board not found'), { status: 404 });
  }

  return board;
}

export async function getWorkspaceBoards(
  workspaceId: string,
  userId: string,
  page = 1,
  limit = 20,
) {
  const skip = (page - 1) * limit;

  // First verify user is a member of the workspace
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });

  if (!membership) {
    throw Object.assign(new Error('Not a member of this workspace'), {
      status: 403,
    });
  }

  const [boards, total] = await Promise.all([
    prisma.board.findMany({
      where: {
        workspaceId,
      },
      include: {
        _count: {
          select: {
            lists: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.board.count({
      where: {
        workspaceId,
      },
    }),
  ]);

  return {
    boards,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateBoard(
  id: string,
  input: UpdateBoardInput,
  userId: string,
) {
  await requireBoardManagerRole(id, userId);

  const board = await prisma.board.update({
    where: { id },
    data: input,
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
      lists: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  });

  broadcastToWorkspace(board.workspaceId, SOCKET_EVENTS.BOARD_UPDATED, board);

  return board;
}

export async function deleteBoard(id: string, userId: string) {
  await requireBoardManagerRole(id, userId);

  const board = await prisma.board.delete({
    where: { id },
  });

  broadcastToWorkspace(board.workspaceId, SOCKET_EVENTS.BOARD_DELETED, { id });
}

