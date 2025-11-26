import { prisma } from '../lib/prisma';
import {
  broadcastToBoard,
  SOCKET_EVENTS,
} from '../lib/socketEvents';

export interface CreateCardInput {
  title: string;
  description?: string;
  listId: string;
}

export interface UpdateCardInput {
  title?: string;
  description?: string;
  position?: number;
  listId?: string; // For moving cards between lists
}

export async function createCard(input: CreateCardInput) {
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

export async function updateCard(id: string, input: UpdateCardInput) {
  const existingCard = await prisma.card.findUnique({
    where: { id },
    include: {
      list: {
        include: {
          board: true,
        },
      },
    },
  });

  if (!existingCard) {
    throw Object.assign(new Error('Card not found'), { status: 404 });
  }

  // If moving to a different list, get max position in new list
  let newPosition = input.position;
  if (input.listId && input.listId !== existingCard.listId) {
    const maxPosition = await prisma.card.findFirst({
      where: { listId: input.listId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    newPosition = maxPosition ? maxPosition.position + 1 : 0;
  }

  const updateData: UpdateCardInput = {
    ...input,
    position: newPosition,
  };

  const card = await prisma.card.update({
    where: { id },
    data: updateData,
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
      _count: {
        select: {
          comments: true,
          attachments: true,
          activities: true,
        },
      },
    },
  });

  // Create activity log entry for significant changes
  if (input.title && input.title !== existingCard.title) {
    await prisma.activityLog.create({
      data: {
        type: 'CARD_UPDATED',
        message: `Card title changed from "${existingCard.title}" to "${input.title}"`,
        cardId: card.id,
      },
    });
  }

  if (input.listId && input.listId !== existingCard.listId) {
    await prisma.activityLog.create({
      data: {
        type: 'CARD_MOVED',
        message: `Card moved to a different list`,
        cardId: card.id,
      },
    });
    // Broadcast card moved event
    broadcastToBoard(card.list.board.id, SOCKET_EVENTS.CARD_MOVED, card);
  } else {
    // Broadcast card updated event
    broadcastToBoard(card.list.board.id, SOCKET_EVENTS.CARD_UPDATED, card);
  }

  return card;
}

export async function deleteCard(id: string) {
  // Get card info before deletion for broadcasting
  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      list: {
        include: {
          board: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  await prisma.card.delete({
    where: { id },
  });

  if (card) {
    // Broadcast card deleted event
    broadcastToBoard(card.list.board.id, SOCKET_EVENTS.CARD_DELETED, { id });
  }
}

