// Simple Prisma seed script for local development
/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@collabboards.local' },
    update: {},
    create: {
      email: 'demo@collabboards.local',
      password: 'hashed-password-placeholder',
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
                },
                {
                  title: 'Design workspace/board schema',
                  description: 'Model workspaces, boards, lists, and cards',
                  position: 2,
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


