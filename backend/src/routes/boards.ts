import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import { isWorkspaceMember } from '../middleware/rbac';
import {
  createBoard,
  getBoardById,
  getWorkspaceBoards,
  updateBoard,
  deleteBoard,
} from '../services/boardService';

const router = Router();

const createBoardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

const updateBoardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
});

const createListSchema = z.object({
  title: z.string().min(1).max(200),
});

// GET /api/workspaces/:workspaceId/boards - List boards in a workspace (paginated)
router.get(
  '/:workspaceId/boards',
  isAuthenticated,
  isWorkspaceMember,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const page = Number.parseInt(req.query.page as string, 10) || 1;
      const limit = Number.parseInt(req.query.limit as string, 10) || 20;

      const result = await getWorkspaceBoards(
        req.params.workspaceId,
        req.user.userId,
        page,
        limit,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/workspaces/:workspaceId/boards - Create a new board
router.post(
  '/:workspaceId/boards',
  isAuthenticated,
  isWorkspaceMember,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const body = createBoardSchema.parse(req.body);

      const board = await createBoard({
        title: body.title,
        description: body.description,
        workspaceId: req.params.workspaceId,
      });

      res.status(201).json(board);
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

// GET /api/boards/:id - Get board details
router.get(
  '/:id',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const board = await getBoardById(req.params.id, req.user.userId);
      res.json(board);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/boards/:id - Update board
router.patch(
  '/:id',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      await getBoardById(req.params.id, req.user.userId);
      const body = updateBoardSchema.parse(req.body);

      const updatedBoard = await updateBoard(req.params.id, body);
      res.json(updatedBoard);
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

// DELETE /api/boards/:id - Delete board
router.delete(
  '/:id',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      await getBoardById(req.params.id, req.user.userId);
      await deleteBoard(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/boards/:boardId/lists - Create a new list
router.post(
  '/:boardId/lists',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      await getBoardById(req.params.boardId, req.user.userId);
      const body = createListSchema.parse(req.body);
      const { createList } = await import('../services/listService');

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

export default router;
