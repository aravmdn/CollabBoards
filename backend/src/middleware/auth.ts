import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  workspaceId?: string;
  roles?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export const isAuthenticated = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_TOKEN_SECRET not configured');
    }

    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const hasRole =
  (...roles: string[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const has = req.user.roles.some((r) => roles.includes(r));
    if (!has) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };


