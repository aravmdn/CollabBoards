// Simple Prisma seed script for local development
/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const demoPassword = await bcrypt.hash('demo12345', 10);

  // Demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@collabboards.local' },
    update: {
      password: demoPassword,
      name: 'Demo User',
    },
    create: {
      email: 'demo@collabboards.local',
      password: demoPassword,
      name: 'Demo User',
    },
  });

  // Demo workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Demo Workspace',
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  // Demo board with lists and cards
  const board = await prisma.board.create({
    data: {
      title: 'Demo Board',
      description: 'Sample board seeded for CollabBoards',
      workspaceId: workspace.id,
      lists: {
        create: [
          {
            title: 'To Do',
            position: 1,
            cards: {
              create: [
                {
                  title: 'Set up backend skeleton',
                  description: 'Express app, Socket.IO, and middleware',
                  position: 1,
                  labels: ['backend', 'api'],
                  assigneeId: user.id,
                },
                {
                  title: 'Design workspace/board schema',
                  description: 'Model workspaces, boards, lists, and cards',
                  position: 2,
                  dueDate: new Date('2026-04-15T10:00:00.000Z'),
                  labels: ['database'],
                },
              ],
            },
          },
          {
            title: 'In Progress',
            position: 2,
            cards: {
              create: [
                {
                  title: 'Implement auth & RBAC',
                  description: 'JWT + role-based permissions',
                  position: 1,
                  labels: ['auth', 'security'],
                },
              ],
            },
          },
          {
            title: 'Done',
            position: 3,
            cards: {
              create: [
                {
                  title: 'Create project skeleton',
                  description: 'Frontend + backend scaffolding',
                  position: 1,
                  labels: ['setup'],
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      lists: {
        include: {
          cards: true,
        },
      },
    },
  });

  const firstCard = board.lists[0]?.cards[0];

  if (firstCard) {
    await prisma.comment.create({
      data: {
        body: 'This is a seeded comment on the first card.',
        cardId: firstCard.id,
        authorId: user.id,
      },
    });

    await prisma.activityLog.create({
      data: {
        type: 'CARD_CREATED',
        message: `Card "${firstCard.title}" created in list "${board.lists[0].title}"`,
        cardId: firstCard.id,
        userId: user.id,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


