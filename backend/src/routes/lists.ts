import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import { createList, getListById, updateList, deleteList } from '../services/listService';

const router = Router();

// Validation schemas
const createListSchema = z.object({
  title: z.string().min(1).max(200),
});

const updateListSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  position: z.number().int().min(0).optional(),
});

// POST /api/boards/:boardId/lists - Create a new list
router.post(
  '/boards/:boardId/lists',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Verify user has access to the board
      await import('../services/boardService').then((m) =>
        m.getBoardById(req.params.boardId, req.user!.userId),
      );

      const body = createListSchema.parse(req.body);

      const list = await createList({
        title: body.title,
        boardId: req.params.boardId,
      });

      res.status(201).json(list);
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

      // Verify user has access to the list's board
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

      // Verify user has access to the list's board
      await getListById(req.params.id, req.user.userId);
      await deleteList(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;

