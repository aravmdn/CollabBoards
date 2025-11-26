import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import {
  createCard,
  getCardById,
  updateCard,
  deleteCard,
} from '../services/cardService';

const router = Router();

// Validation schemas
const createCardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
});

const updateCardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  position: z.number().int().min(0).optional(),
  listId: z.string().optional(),
});

// POST /api/lists/:listId/cards - Create a new card
router.post(
  '/lists/:listId/cards',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Verify user has access to the list's board
      await import('../services/listService').then((m) =>
        m.getListById(req.params.listId, req.user!.userId),
      );

      const body = createCardSchema.parse(req.body);

      const card = await createCard({
        title: body.title,
        description: body.description,
        listId: req.params.listId,
      });

      res.status(201).json(card);
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

      // Verify user has access to the card's board
      await getCardById(req.params.id, req.user.userId);
      const body = updateCardSchema.parse(req.body);

      // If moving to a different list, verify access to the new list's board
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

      // Verify user has access to the card's board
      await getCardById(req.params.id, req.user.userId);
      await deleteCard(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;

