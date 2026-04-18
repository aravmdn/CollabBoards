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

const userSelect = {
  id: true,
  email: true,
  name: true,
} as const;

export async function listWorkspaceMembers(workspaceId: string, userId: string) {
  await requireWorkspaceRole(workspaceId, userId, [
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  ]);

  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: userSelect } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function inviteWorkspaceMember(
  workspaceId: string,
  actorId: string,
  email: string,
  role: WorkspaceRole,
) {
  await requireWorkspaceRole(workspaceId, actorId, [
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
  ]);

  if (role === WorkspaceRole.OWNER) {
    throw Object.assign(new Error('Cannot assign OWNER role via invite'), { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!target) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: target.id, workspaceId } },
  });

  if (existing) {
    throw Object.assign(new Error('User is already a member'), { status: 409 });
  }

  return prisma.workspaceMember.create({
    data: { workspaceId, userId: target.id, role },
    include: { user: { select: userSelect } },
  });
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  actorId: string,
  memberId: string,
  role: WorkspaceRole,
) {
  await requireWorkspaceRole(workspaceId, actorId, [WorkspaceRole.OWNER]);

  if (role === WorkspaceRole.OWNER) {
    throw Object.assign(new Error('Cannot assign OWNER role'), { status: 400 });
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: memberId, workspaceId } },
  });

  if (!membership) {
    throw Object.assign(new Error('Member not found'), { status: 404 });
  }

  if (membership.role === WorkspaceRole.OWNER) {
    throw Object.assign(new Error('Cannot change role of workspace owner'), { status: 400 });
  }

  return prisma.workspaceMember.update({
    where: { userId_workspaceId: { userId: memberId, workspaceId } },
    data: { role },
    include: { user: { select: userSelect } },
  });
}

export async function removeWorkspaceMember(
  workspaceId: string,
  actorId: string,
  memberId: string,
) {
  await requireWorkspaceRole(workspaceId, actorId, [
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
  ]);

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: memberId, workspaceId } },
  });

  if (!membership) {
    throw Object.assign(new Error('Member not found'), { status: 404 });
  }

  if (membership.role === WorkspaceRole.OWNER) {
    throw Object.assign(new Error('Cannot remove workspace owner'), { status: 400 });
  }

  await prisma.workspaceMember.delete({
    where: { userId_workspaceId: { userId: memberId, workspaceId } },
  });
}

