import jwt from 'jsonwebtoken';
import type { AuthPayload } from '../middleware/auth';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

const getAccessSecret = () => {
  const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_TOKEN_SECRET not configured');
  }
  return secret;
};

const getRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_TOKEN_SECRET not configured');
  }
  return secret;
};

export const signAccessToken = (payload: AuthPayload) =>
  jwt.sign(payload, getAccessSecret(), { expiresIn: ACCESS_TOKEN_TTL });

export const signRefreshToken = (payload: Pick<AuthPayload, 'userId'>) =>
  jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_TOKEN_TTL });

export const verifyAccessToken = (token: string): AuthPayload =>
  jwt.verify(token, getAccessSecret()) as AuthPayload;

export const verifyRefreshToken = (token: string): Pick<AuthPayload, 'userId'> =>
  jwt.verify(token, getRefreshSecret()) as Pick<AuthPayload, 'userId'>;


