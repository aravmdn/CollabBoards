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
router.use('/workspaces', boardsRouter);
router.use('/boards', boardsRouter);
router.use('/lists', listsRouter);
router.use('/cards', cardsRouter);
router.use('/comments', commentsRouter);

export default router;
