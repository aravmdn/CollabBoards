import { Router } from 'express';
import { z } from 'zod';
import { registerUser, loginUser, refreshTokens } from '../services/authService';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const tokens = await registerUser(parsed);
    res.status(201).json(tokens);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', issues: err.issues });
    }
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const tokens = await loginUser(parsed);
    res.json(tokens);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', issues: err.issues });
    }
    return next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const parsed = refreshSchema.parse(req.body);
    const tokens = await refreshTokens(parsed.refreshToken);
    res.json(tokens);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', issues: err.issues });
    }
    return next(err);
  }
});

// For now, logout is handled client-side by discarding tokens.
router.post('/logout', (_req, res) => {
  res.status(204).send();
});

export default router;


