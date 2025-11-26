import { Router } from 'express';
import authRouter from './auth';
import workspacesRouter from './workspaces';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.use('/auth', authRouter);
router.use('/workspaces', workspacesRouter);

// TODO: add /boards, /lists, /cards, /comments routes

export default router;
