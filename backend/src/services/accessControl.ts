import { WorkspaceRole } from '@prisma/client';
import { prisma } from '../lib/prisma';

const notFound = (message: string) =>
  Object.assign(new Error(message), { status: 404 });

const forbidden = (message: string) =>
  Object.assign(new Error(message), { status: 403 });

const badRequest = (message: string) =>
  Object.assign(new Error(message), { status: 400 });

const managerRoles = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN];

export async function requireWorkspaceMembership(
  workspaceId: string,
  userId: string,
) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    select: {
      role: true,
    },
  });

  if (!membership) {
    throw notFound('Workspace not found');
  }

  return membership;
}

export async function requireWorkspaceRole(
  workspaceId: string,
  userId: string,
  allowedRoles: WorkspaceRole[],
) {
  const membership = await requireWorkspaceMembership(workspaceId, userId);

  if (!allowedRoles.includes(membership.role)) {
    throw forbidden('Forbidden');
  }

  return membership;
}

export async function requireWorkspaceManagerRole(
  workspaceId: string,
  userId: string,
) {
  return requireWorkspaceRole(workspaceId, userId, managerRoles);
}

export async function requireBoardMembership(boardId: string, userId: string) {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      workspace: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    select: {
      id: true,
      workspaceId: true,
    },
  });

  if (!board) {
    throw notFound('Board not found');
  }

  return board;
}

export async function requireBoardManagerRole(boardId: string, userId: string) {
  const board = await requireBoardMembership(boardId, userId);
  await requireWorkspaceManagerRole(board.workspaceId, userId);
  return board;
}

export async function requireListMembership(listId: string, userId: string) {
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
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
    select: {
      id: true,
      boardId: true,
      board: {
        select: {
          workspaceId: true,
        },
      },
    },
  });

  if (!list) {
    throw notFound('List not found');
  }

  return {
    id: list.id,
    boardId: list.boardId,
    workspaceId: list.board.workspaceId,
  };
}

export async function requireListManagerRole(listId: string, userId: string) {
  const list = await requireListMembership(listId, userId);
  await requireWorkspaceManagerRole(list.workspaceId, userId);
  return list;
}

export async function requireCardMembership(cardId: string, userId: string) {
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
    select: {
      id: true,
      title: true,
      listId: true,
      list: {
        select: {
          boardId: true,
          board: {
            select: {
              workspaceId: true,
            },
          },
        },
      },
    },
  });

  if (!card) {
    throw notFound('Card not found');
  }

  return {
    id: card.id,
    title: card.title,
    listId: card.listId,
    boardId: card.list.boardId,
    workspaceId: card.list.board.workspaceId,
  };
}

export async function requireCommentMembership(
  commentId: string,
  userId: string,
) {
  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      card: {
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
    },
    select: {
      id: true,
      authorId: true,
      card: {
        select: {
          id: true,
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
    throw notFound('Comment not found');
  }

  return {
    id: comment.id,
    authorId: comment.authorId,
    cardId: comment.card.id,
    boardId: comment.card.list.boardId,
  };
}

export async function ensureWorkspaceAssignee(
  assigneeId: string | null | undefined,
  workspaceId: string,
) {
  if (!assigneeId) {
    return;
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: assigneeId,
        workspaceId,
      },
    },
    select: {
      userId: true,
    },
  });

  if (!membership) {
    throw badRequest('Assignee must belong to the workspace');
  }
}
