import { prisma } from '../lib/prisma';
import {
  broadcastToBoard,
  SOCKET_EVENTS,
} from '../lib/socketEvents';

export interface CreateCommentInput {
  body: string;
  cardId: string;
  authorId: string;
}

export async function createComment(input: CreateCommentInput) {
  // Verify the card exists and user has access
  const card = await prisma.card.findFirst({
    where: {
      id: input.cardId,
      list: {
        board: {
          workspace: {
            members: {
              some: {
                userId: input.authorId,
              },
            },
          },
        },
      },
    },
    include: {
      list: {
        select: {
          boardId: true,
        },
      },
    },
  });

  if (!card) {
    throw Object.assign(new Error('Card not found or access denied'), {
      status: 404,
    });
  }

  const comment = await prisma.comment.create({
    data: {
      body: input.body,
      cardId: input.cardId,
      authorId: input.authorId,
    },
    include: {
      author: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      card: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  // Create activity log entry
  await prisma.activityLog.create({
    data: {
      type: 'COMMENT_ADDED',
      message: `Comment added to card "${card.title}"`,
      cardId: card.id,
      userId: input.authorId,
    },
  });

  // Broadcast to board room
  broadcastToBoard(card.list.boardId, SOCKET_EVENTS.COMMENT_ADDED, comment);

  return comment;
}

export async function getCardComments(cardId: string, userId: string) {
  // Verify the card exists and user has access
  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
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
  });

  if (!card) {
    throw Object.assign(new Error('Card not found or access denied'), {
      status: 404,
    });
  }

  const comments = await prisma.comment.findMany({
    where: {
      cardId,
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
    orderBy: {
      createdAt: 'asc',
    },
  });

  return comments;
}

export async function deleteComment(id: string, userId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      card: {
        include: {
          list: {
            select: {
              boardId: true,
            },
          },
        },
      },
    },
  });

  if (!comment) {
    throw Object.assign(new Error('Comment not found'), { status: 404 });
  }

  // Only the author can delete their comment
  if (comment.authorId !== userId) {
    throw Object.assign(new Error('Not authorized to delete this comment'), {
      status: 403,
    });
  }

  const boardId = comment.card.list.boardId;

  await prisma.comment.delete({
    where: { id },
  });

  // Broadcast to board room
  broadcastToBoard(boardId, SOCKET_EVENTS.COMMENT_DELETED, { id });
}

