import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../lib/prisma';
import { broadcastToBoard, SOCKET_EVENTS } from '../lib/socketEvents';
import { requireCardMembership } from './accessControl';

export function getUploadDir() {
  if (process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim()) {
    return path.resolve(process.env.UPLOAD_DIR);
  }
  return path.resolve(process.cwd(), 'uploads');
}

export async function ensureUploadDir() {
  await fs.mkdir(getUploadDir(), { recursive: true });
}

const notFound = (message: string) =>
  Object.assign(new Error(message), { status: 404 });

const forbidden = (message: string) =>
  Object.assign(new Error(message), { status: 403 });

export interface UploadedFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

export async function createAttachment(
  cardId: string,
  userId: string,
  file: UploadedFile,
) {
  const card = await requireCardMembership(cardId, userId).catch(async (err) => {
    await safeUnlink(file.path);
    throw err;
  });

  const attachment = await prisma.attachment.create({
    data: {
      cardId,
      url: file.filename,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedById: userId,
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      type: 'ATTACHMENT_ADDED',
      message: `Attachment "${file.originalname}" was added`,
      cardId,
      userId,
    },
  });

  broadcastToBoard(card.boardId, SOCKET_EVENTS.ATTACHMENT_ADDED, {
    cardId,
    attachment,
  });

  return attachment;
}

export async function listAttachmentsForCard(cardId: string, userId: string) {
  await requireCardMembership(cardId, userId);

  return prisma.attachment.findMany({
    where: { cardId },
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
}

export async function getAttachmentForAccess(id: string, userId: string) {
  const attachment = await prisma.attachment.findFirst({
    where: {
      id,
      card: {
        list: {
          board: {
            workspace: {
              members: {
                some: { userId },
              },
            },
          },
        },
      },
    },
    include: {
      card: {
        select: {
          id: true,
          list: { select: { boardId: true } },
        },
      },
    },
  });

  if (!attachment) {
    throw notFound('Attachment not found');
  }

  return attachment;
}

export async function deleteAttachment(id: string, userId: string) {
  const attachment = await getAttachmentForAccess(id, userId);

  if (attachment.uploadedById && attachment.uploadedById !== userId) {
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspace: {
          boards: {
            some: { id: attachment.card.list.boardId },
          },
        },
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      throw forbidden('Only the uploader, an admin, or an owner can delete an attachment');
    }
  }

  await prisma.attachment.delete({ where: { id } });
  await safeUnlink(path.join(getUploadDir(), attachment.url));

  await prisma.activityLog.create({
    data: {
      type: 'ATTACHMENT_DELETED',
      message: `Attachment "${attachment.name ?? attachment.url}" was deleted`,
      cardId: attachment.cardId,
      userId,
    },
  });

  broadcastToBoard(attachment.card.list.boardId, SOCKET_EVENTS.ATTACHMENT_DELETED, {
    id,
    cardId: attachment.cardId,
  });

  return { id };
}

async function safeUnlink(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('Failed to unlink attachment file', filePath, err);
    }
  }
}
