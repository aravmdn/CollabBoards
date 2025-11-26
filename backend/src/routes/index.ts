import { Router } from 'express';
import authRouter from './auth';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.use('/auth', authRouter);

// TODO: add /workspaces, /boards, /lists, /cards, /comments routes

export default router;
