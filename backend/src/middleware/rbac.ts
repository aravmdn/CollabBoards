import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from './auth';
import { WorkspaceRole } from '@prisma/client';

/**
 * Middleware to check if the authenticated user is a member of a workspace.
 * Expects workspaceId in req.params.workspaceId or req.body.workspaceId
 */
export const isWorkspaceMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const workspaceId =
    req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;

  if (!workspaceId) {
    return res.status(400).json({ message: 'Workspace ID required' });
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: req.user.userId,
        workspaceId: String(workspaceId),
      },
    },
  });

  if (!membership) {
    return res.status(403).json({ message: 'Not a member of this workspace' });
  }

  // Attach membership info to request for use in subsequent middleware/routes
  req.user.workspaceId = workspaceId;
  req.user.roles = [membership.role];

  return next();
};

/**
 * Middleware to check if the user has one of the specified roles in the workspace.
 * Must be used after isWorkspaceMember or isAuthenticated + isWorkspaceMember.
 */
export const hasWorkspaceRole =
  (...allowedRoles: WorkspaceRole[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const userRoles = req.user.roles as WorkspaceRole[];
    const hasRole = userRoles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        message: `Requires one of: ${allowedRoles.join(', ')}`,
      });
    }

    return next();
  };

/**
 * Convenience middleware: isWorkspaceMember + hasWorkspaceRole combined
 */
export const requireWorkspaceRole =
  (...allowedRoles: WorkspaceRole[]) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // First check membership
    await isWorkspaceMember(req, res, () => {
      // Then check role
      hasWorkspaceRole(...allowedRoles)(req, res, next);
    });
  };

