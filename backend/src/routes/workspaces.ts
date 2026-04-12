import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import {
  isWorkspaceMember,
  requireWorkspaceRole,
} from '../middleware/rbac';
import { WorkspaceRole } from '@prisma/client';
import {
  createWorkspace,
  getWorkspaceById,
  getUserWorkspaces,
  updateWorkspace,
  deleteWorkspace,
} from '../services/workspaceService';

const router = Router();

// Validation schemas
const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// GET /api/workspaces - List workspaces for current user (paginated)
router.get(
  '/',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const page = Number.parseInt(req.query.page as string, 10) || 1;
      const limit = Number.parseInt(req.query.limit as string, 10) || 20;

      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const result = await getUserWorkspaces(req.user.userId, page, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/workspaces - Create a new workspace
router.post(
  '/',
  isAuthenticated,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const body = createWorkspaceSchema.parse(req.body);

      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const workspace = await createWorkspace({
        name: body.name,
        userId: req.user.userId,
      });

      res.status(201).json(workspace);
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

// GET /api/workspaces/:id - Get workspace details
router.get(
  '/:workspaceId',
  isAuthenticated,
  isWorkspaceMember,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const workspace = await getWorkspaceById(
        req.params.workspaceId,
        req.user.userId,
      );
      res.json(workspace);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/workspaces/:id - Update workspace (OWNER or ADMIN only)
router.patch(
  '/:workspaceId',
  isAuthenticated,
  requireWorkspaceRole(WorkspaceRole.OWNER, WorkspaceRole.ADMIN),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = req.user;
      const body = updateWorkspaceSchema.parse(req.body);
      const workspace = await updateWorkspace(
        req.params.workspaceId,
        body,
        user.userId,
      );
      res.json(workspace);
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

// DELETE /api/workspaces/:id - Delete workspace (OWNER only)
router.delete(
  '/:workspaceId',
  isAuthenticated,
  requireWorkspaceRole(WorkspaceRole.OWNER),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = req.user;
      await deleteWorkspace(req.params.workspaceId, user.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;

