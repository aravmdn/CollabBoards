import { Router } from 'express';

const router = Router();

// Placeholder route structure
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// TODO: add /auth, /workspaces, /boards, /lists, /cards, /comments routes

export default router;


