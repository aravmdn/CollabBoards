import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import {
  createComment,
  getCardComments,
  deleteComment,
} from '../services/commentService';

const router = Router();

// Validation schemas
const createCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});

// POST /api/cards/:cardId/comments - Create a new comment
router.post(
  '/cards/:cardId/comments',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const body = createCommentSchema.parse(req.body);

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
  '/cards/:cardId/comments',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const comments = await getCardComments(req.params.cardId, req.user.userId);
      res.json(comments);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/comments/:id - Delete a comment (only by author)
router.delete(
  '/:id',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      await deleteComment(req.params.id, req.user.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;

