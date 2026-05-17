import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import { lookup as lookupMime } from 'mime-types';
import { AuthenticatedRequest, isAuthenticated } from '../middleware/auth';
import {
  createAttachment,
  deleteAttachment,
  ensureUploadDir,
  getAttachmentForAccess,
  getUploadDir,
  listAttachmentsForCard,
} from '../services/attachmentService';

const MAX_UPLOAD_BYTES = (() => {
  const fromEnv = Number(process.env.MAX_UPLOAD_BYTES);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  return 10 * 1024 * 1024;
})();

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await ensureUploadDir();
      cb(null, getUploadDir());
    } catch (err) {
      cb(err as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 16);
    const id = crypto.randomBytes(16).toString('hex');
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

const cardAttachmentsRouter = Router({ mergeParams: true });

cardAttachmentsRouter.get(
  '/',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const attachments = await listAttachmentsForCard(
        req.params.cardId,
        req.user.userId,
      );
      res.json(attachments);
    } catch (err) {
      next(err);
    }
  },
);

cardAttachmentsRouter.post(
  '/',
  isAuthenticated,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            message: 'File too large',
            limitBytes: MAX_UPLOAD_BYTES,
          });
        }
        return next(err);
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res, next) => {
    if (!req.user) {
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => undefined);
      }
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File is required (field name "file")' });
    }

    try {
      const attachment = await createAttachment(
        req.params.cardId,
        req.user.userId,
        {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
        },
      );
      res.status(201).json(attachment);
    } catch (err) {
      next(err);
    }
  },
);

const attachmentsRouter = Router();

attachmentsRouter.get(
  '/:id/download',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const attachment = await getAttachmentForAccess(
        req.params.id,
        req.user.userId,
      );

      const filePath = path.join(getUploadDir(), attachment.url);
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: 'File missing on server' });
      }

      const downloadName = attachment.name ?? attachment.url;
      const mimeType =
        attachment.mimeType ||
        lookupMime(downloadName) ||
        'application/octet-stream';

      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(downloadName)}"`,
      );
      if (attachment.size) {
        res.setHeader('Content-Length', String(attachment.size));
      }

      createReadStream(filePath).pipe(res);
    } catch (err) {
      next(err);
    }
  },
);

attachmentsRouter.delete(
  '/:id',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      await deleteAttachment(req.params.id, req.user.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export { cardAttachmentsRouter, attachmentsRouter };
