import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import { getCardById, updateCard, deleteCard } from '../services/cardService';

const router = Router();

const updateCardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  position: z.number().int().min(0).optional(),
  listId: z.string().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  labels: z.array(z.string().min(1).max(50)).max(10).optional(),
});

const createCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});

// GET /api/cards/:id - Get card details
router.get(
  '/:id',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const card = await getCardById(req.params.id, req.user.userId);
      res.json(card);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/cards/:id - Update card (including moving between lists)
router.patch(
  '/:id',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      await getCardById(req.params.id, req.user.userId);
      const body = updateCardSchema.parse(req.body);

      if (body.listId) {
        await import('../services/listService').then((m) =>
          m.getListById(body.listId!, req.user!.userId),
        );
      }

      const updatedCard = await updateCard(req.params.id, body);
      res.json(updatedCard);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: err.errors,
        });
      }
      next(err);
    }
  },
);

// DELETE /api/cards/:id - Delete card
router.delete(
  '/:id',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      await getCardById(req.params.id, req.user.userId);
      await deleteCard(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/cards/:cardId/comments - Create a new comment
router.post(
  '/:cardId/comments',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const body = createCommentSchema.parse(req.body);
      const { createComment } = await import('../services/commentService');

      const comment = await createComment({
        body: body.body,
        cardId: req.params.cardId,
        authorId: req.user.userId,
      });

      res.status(201).json(comment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: err.errors,
        });
      }
      next(err);
    }
  },
);

// GET /api/cards/:cardId/comments - Get all comments for a card
router.get(
  '/:cardId/comments',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { getCardComments } = await import('../services/commentService');
      const comments = await getCardComments(req.params.cardId, req.user.userId);
      res.json(comments);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
