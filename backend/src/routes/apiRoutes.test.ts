import request from 'supertest';
import app from '../app';

jest.mock('../middleware/auth', () => {
  const actual = jest.requireActual('../middleware/auth');

  return {
    ...actual,
    isAuthenticated: (
      req: { headers: { authorization?: string }; user?: { userId: string } },
      res: { status: (code: number) => { json: (body: unknown) => unknown } },
      next: () => void,
    ) => {
      if (!req.headers.authorization) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      req.user = { userId: 'user-1' };
      next();
    },
  };
});

jest.mock('../middleware/rbac', () => ({
  isWorkspaceMember: (
    req: { user?: { workspaceId?: string; roles?: string[] } },
    _res: unknown,
    next: () => void,
  ) => {
    if (req.user) {
      req.user.workspaceId = 'workspace-1';
      req.user.roles = ['OWNER'];
    }

    next();
  },
  requireWorkspaceRole:
    () =>
    (
      req: { user?: { workspaceId?: string; roles?: string[] } },
      _res: unknown,
      next: () => void,
    ) => {
      if (req.user) {
        req.user.workspaceId = 'workspace-1';
        req.user.roles = ['OWNER'];
      }

      next();
    },
  requireWorkspaceManagerRole:
    () =>
    (
      req: { user?: { workspaceId?: string; roles?: string[] } },
      _res: unknown,
      next: () => void,
    ) => {
      if (req.user) {
        req.user.workspaceId = 'workspace-1';
        req.user.roles = ['OWNER'];
      }

      next();
    },
  requireBoardManagerRole:
    () =>
    (
      req: { user?: { workspaceId?: string; roles?: string[] } },
      _res: unknown,
      next: () => void,
    ) => {
      if (req.user) {
        req.user.workspaceId = 'workspace-1';
        req.user.roles = ['OWNER'];
      }

      next();
    },
  requireListManagerRole:
    () =>
    (
      req: { user?: { workspaceId?: string; roles?: string[] } },
      _res: unknown,
      next: () => void,
    ) => {
      if (req.user) {
        req.user.workspaceId = 'workspace-1';
        req.user.roles = ['OWNER'];
      }

      next();
    },
}));

describe('API route mounting', () => {
  it.each([
    ['GET', '/api/boards/board-1'],
    ['PATCH', '/api/boards/board-1'],
    ['DELETE', '/api/boards/board-1'],
    ['GET', '/api/lists/list-1'],
    ['PATCH', '/api/lists/list-1'],
    ['DELETE', '/api/lists/list-1'],
    ['GET', '/api/cards/card-1'],
    ['PATCH', '/api/cards/card-1'],
    ['DELETE', '/api/cards/card-1'],
    ['DELETE', '/api/comments/comment-1'],
  ])('%s %s requires auth instead of 404', async (method, path) => {
    const response = await request(app)[method.toLowerCase() as 'get'](path);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Unauthorized' });
  });

  it('keeps auth routes mounted under /api/auth', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bad', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation error');
  });

  it('keeps health route mounted under /api/health', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
