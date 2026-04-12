import { prisma } from '../lib/prisma';
import { WorkspaceRole } from '@prisma/client';
import { requireWorkspaceRole } from './accessControl';

export interface CreateWorkspaceInput {
  name: string;
  userId: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
}

export async function createWorkspace(input: CreateWorkspaceInput) {
  const workspace = await prisma.workspace.create({
    data: {
      name: input.name,
      members: {
        create: {
          userId: input.userId,
          role: WorkspaceRole.OWNER,
        },
      },
    },
    include: {
      members: {
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

  return workspace;
}

export async function getWorkspaceById(id: string, userId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id,
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      members: {
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
      boards: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      _count: {
        select: {
          members: true,
          boards: true,
        },
      },
    },
  });

  if (!workspace) {
    throw Object.assign(new Error('Workspace not found'), { status: 404 });
  }

  return workspace;
}

export async function getUserWorkspaces(
  userId: string,
  page = 1,
  limit = 20,
) {
  const skip = (page - 1) * limit;

  const [workspaces, total] = await Promise.all([
    prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
        _count: {
          select: {
            members: true,
            boards: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.workspace.count({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
    }),
  ]);

  return {
    workspaces,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateWorkspace(
  id: string,
  input: UpdateWorkspaceInput,
  userId: string,
) {
  await requireWorkspaceRole(id, userId, [
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
  ]);

  const workspace = await prisma.workspace.update({
    where: { id },
    data: input,
    include: {
      members: {
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

  return workspace;
}

export async function deleteWorkspace(id: string, userId: string) {
  await requireWorkspaceRole(id, userId, [WorkspaceRole.OWNER]);

  await prisma.workspace.delete({
    where: { id },
  });
}

