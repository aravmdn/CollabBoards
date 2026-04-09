import { Router } from 'express';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import { deleteComment } from '../services/commentService';

const router = Router();

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
