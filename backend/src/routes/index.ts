import { Router } from 'express';
import authRouter from './auth';
import workspacesRouter from './workspaces';
import boardsRouter from './boards';
import listsRouter from './lists';
import cardsRouter from './cards';
import commentsRouter from './comments';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.use('/auth', authRouter);
router.use('/workspaces', workspacesRouter);
router.use('/', boardsRouter); // Handles /api/boards and /api/workspaces/:id/boards
router.use('/', listsRouter); // Handles /api/lists and /api/boards/:id/lists
router.use('/', cardsRouter); // Handles /api/cards and /api/lists/:id/cards
router.use('/', commentsRouter); // Handles /api/comments and /api/cards/:id/comments

export default router;
