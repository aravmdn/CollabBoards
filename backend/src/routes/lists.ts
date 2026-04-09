import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import { getListById, updateList, deleteList } from '../services/listService';

const router = Router();

const updateListSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  position: z.number().int().min(0).optional(),
});

const createCardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  dueDate: z.coerce.date().optional(),
  assigneeId: z.string().optional(),
  labels: z.array(z.string().min(1).max(50)).max(10).optional(),
});

// GET /api/lists/:id - Get list details
router.get(
  '/:id',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const list = await getListById(req.params.id, req.user.userId);
      res.json(list);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/lists/:id - Update list
router.patch(
  '/:id',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      await getListById(req.params.id, req.user.userId);
      const body = updateListSchema.parse(req.body);

      const updatedList = await updateList(req.params.id, body);
      res.json(updatedList);
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

// DELETE /api/lists/:id - Delete list
router.delete(
  '/:id',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      await getListById(req.params.id, req.user.userId);
      await deleteList(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/lists/:listId/cards - Create a new card
router.post(
  '/:listId/cards',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      await getListById(req.params.listId, req.user.userId);
      const body = createCardSchema.parse(req.body);
      const { createCard } = await import('../services/cardService');

      const card = await createCard({
        title: body.title,
        description: body.description,
        listId: req.params.listId,
        dueDate: body.dueDate,
        assigneeId: body.assigneeId,
        labels: body.labels,
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

export default router;
