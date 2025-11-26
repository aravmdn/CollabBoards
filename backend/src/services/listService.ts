import { prisma } from '../lib/prisma';
import {
  broadcastToBoard,
  SOCKET_EVENTS,
} from '../lib/socketEvents';

export interface CreateListInput {
  title: string;
  boardId: string;
}

export interface UpdateListInput {
  title?: string;
  position?: number;
}

export async function createList(input: CreateListInput) {
  // Get the current max position for lists in this board
  const maxPosition = await prisma.list.findFirst({
    where: { boardId: input.boardId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const newPosition = maxPosition ? maxPosition.position + 1 : 0;

  const list = await prisma.list.create({
    data: {
      title: input.title,
      boardId: input.boardId,
      position: newPosition,
    },
    include: {
      board: {
        select: {
          id: true,
          title: true,
          workspaceId: true,
        },
      },
      cards: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  });

  // Broadcast to board room
  broadcastToBoard(list.board.id, SOCKET_EVENTS.LIST_CREATED, list);

  return list;
}

export async function getListById(id: string, userId: string) {
  const list = await prisma.list.findFirst({
    where: {
      id,
      board: {
        workspace: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    },
    include: {
      board: {
        select: {
          id: true,
          title: true,
          workspaceId: true,
        },
      },
      cards: {
        orderBy: {
          position: 'asc',
        },
        include: {
          _count: {
            select: {
              comments: true,
              attachments: true,
            },
          },
        },
      },
    },
  });

  if (!list) {
    throw Object.assign(new Error('List not found'), { status: 404 });
  }

  return list;
}

export async function updateList(id: string, input: UpdateListInput) {
  const list = await prisma.list.update({
    where: { id },
    data: input,
    include: {
      board: {
        select: {
          id: true,
          title: true,
          workspaceId: true,
        },
      },
      cards: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  });

  // Broadcast to board room
  broadcastToBoard(list.board.id, SOCKET_EVENTS.LIST_UPDATED, list);

  return list;
}

export async function deleteList(id: string) {
  // Get list info before deletion for broadcasting
  const list = await prisma.list.findUnique({
    where: { id },
    include: {
      board: {
        select: {
          id: true,
        },
      },
    },
  });

  await prisma.list.delete({
    where: { id },
  });

  if (list) {
    // Broadcast list deleted event
    broadcastToBoard(list.board.id, SOCKET_EVENTS.LIST_DELETED, { id });
  }
}

