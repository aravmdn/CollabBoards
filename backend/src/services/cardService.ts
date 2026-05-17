import { prisma } from '../lib/prisma';
import {
  broadcastToBoard,
  SOCKET_EVENTS,
} from '../lib/socketEvents';
import {
  ensureWorkspaceAssignee,
  requireCardMembership,
  requireListMembership,
} from './accessControl';

export interface CreateCardInput {
  title: string;
  description?: string;
  listId: string;
  dueDate?: Date;
  assigneeId?: string;
  labels?: string[];
}

export interface UpdateCardInput {
  title?: string;
  description?: string;
  position?: number;
  listId?: string; // For moving cards between lists
  dueDate?: Date | null;
  assigneeId?: string | null;
  labels?: string[];
}

export async function createCard(input: CreateCardInput, userId: string) {
  const listScope = await requireListMembership(input.listId, userId);
  await ensureWorkspaceAssignee(input.assigneeId, listScope.workspaceId);

  // Get the current max position for cards in this list
  const maxPosition = await prisma.card.findFirst({
    where: { listId: input.listId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const newPosition = maxPosition ? maxPosition.position + 1 : 0;

  const card = await prisma.card.create({
    data: {
      title: input.title,
      description: input.description,
      listId: input.listId,
      position: newPosition,
      dueDate: input.dueDate,
      assigneeId: input.assigneeId,
      labels: input.labels ?? [],
    },
    include: {
      list: {
        include: {
          board: {
            select: {
              id: true,
              title: true,
              workspaceId: true,
            },
          },
        },
      },
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
          activities: true,
        },
      },
    },
  });

  // Create activity log entry
  await prisma.activityLog.create({
    data: {
      type: 'CARD_CREATED',
      message: `Card "${card.title}" was created`,
      cardId: card.id,
    },
  });

  // Broadcast to board room
  broadcastToBoard(card.list.board.id, SOCKET_EVENTS.CARD_CREATED, card);

  return card;
}

export async function getCardById(id: string, userId: string) {
  const card = await prisma.card.findFirst({
    where: {
      id,
      list: {
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
    },
    include: {
      list: {
        include: {
          board: {
            select: {
              id: true,
              title: true,
              workspaceId: true,
            },
          },
        },
      },
      comments: {
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
      assignee: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      attachments: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      activities: {
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!card) {
    throw Object.assign(new Error('Card not found'), { status: 404 });
  }

  return card;
}

const CARD_INCLUDE = {
  list: {
    include: {
      board: {
        select: {
          id: true,
          title: true,
          workspaceId: true,
        },
      },
    },
  },
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
      activities: true,
    },
  },
} as const;

export async function updateCard(
  id: string,
  input: UpdateCardInput,
  userId: string,
) {
  const existingCard = await requireCardMembership(id, userId);

  const targetListId = input.listId ?? existingCard.listId;
  const isCrossList = input.listId !== undefined && input.listId !== existingCard.listId;

  if (isCrossList) {
    const targetList = await requireListMembership(input.listId!, userId);
    if (targetList.workspaceId !== existingCard.workspaceId) {
      throw Object.assign(new Error('Card cannot move across workspaces'), {
        status: 400,
      });
    }
  }

  await ensureWorkspaceAssignee(
    input.assigneeId,
    existingCard.workspaceId,
  );

  const needsReorder =
    input.position !== undefined || isCrossList;

  if (needsReorder) {
    await prisma.$transaction(async (tx) => {
      const siblings = await tx.card.findMany({
        where: { listId: targetListId, id: { not: id } },
        orderBy: { position: 'asc' },
        select: { id: true },
      });

      const desiredPosition =
        input.position !== undefined
          ? Math.max(0, Math.min(input.position, siblings.length))
          : siblings.length;

      const orderedIds = [
        ...siblings.slice(0, desiredPosition).map((c) => c.id),
        id,
        ...siblings.slice(desiredPosition).map((c) => c.id),
      ];

      const scalarUpdates: Record<string, unknown> = {};
      if (input.title !== undefined) scalarUpdates.title = input.title;
      if (input.description !== undefined) scalarUpdates.description = input.description;
      if (input.dueDate !== undefined) scalarUpdates.dueDate = input.dueDate;
      if (input.assigneeId !== undefined) scalarUpdates.assigneeId = input.assigneeId;
      if (input.labels !== undefined) scalarUpdates.labels = input.labels;
      if (isCrossList) scalarUpdates.listId = targetListId;

      for (let i = 0; i < orderedIds.length; i++) {
        const cardId = orderedIds[i];
        await tx.card.update({
          where: { id: cardId },
          data:
            cardId === id
              ? { ...scalarUpdates, position: i }
              : { position: i },
        });
      }

      if (isCrossList) {
        const sourceSiblings = await tx.card.findMany({
          where: { listId: existingCard.listId },
          orderBy: { position: 'asc' },
          select: { id: true },
        });
        for (let i = 0; i < sourceSiblings.length; i++) {
          await tx.card.update({
            where: { id: sourceSiblings[i].id },
            data: { position: i },
          });
        }
      }
    });
  } else {
    const scalarUpdates: Record<string, unknown> = {};
    if (input.title !== undefined) scalarUpdates.title = input.title;
    if (input.description !== undefined) scalarUpdates.description = input.description;
    if (input.dueDate !== undefined) scalarUpdates.dueDate = input.dueDate;
    if (input.assigneeId !== undefined) scalarUpdates.assigneeId = input.assigneeId;
    if (input.labels !== undefined) scalarUpdates.labels = input.labels;
    if (Object.keys(scalarUpdates).length > 0) {
      await prisma.card.update({ where: { id }, data: scalarUpdates });
    }
  }

  const card = await prisma.card.findUniqueOrThrow({
    where: { id },
    include: CARD_INCLUDE,
  });

  if (input.title && input.title !== existingCard.title) {
    await prisma.activityLog.create({
      data: {
        type: 'CARD_UPDATED',
        message: `Card title changed from "${existingCard.title}" to "${input.title}"`,
        cardId: card.id,
      },
    });
  }

  if (isCrossList) {
    await prisma.activityLog.create({
      data: {
        type: 'CARD_MOVED',
        message: `Card moved to a different list`,
        cardId: card.id,
      },
    });
    broadcastToBoard(card.list.board.id, SOCKET_EVENTS.CARD_MOVED, card);
  } else {
    broadcastToBoard(card.list.board.id, SOCKET_EVENTS.CARD_UPDATED, card);
  }

  return card;
}

export async function deleteCard(id: string, userId: string) {
  const card = await requireCardMembership(id, userId);

  await prisma.card.delete({
    where: { id },
  });

  // Broadcast card deleted event
  broadcastToBoard(card.boardId, SOCKET_EVENTS.CARD_DELETED, { id });
}

