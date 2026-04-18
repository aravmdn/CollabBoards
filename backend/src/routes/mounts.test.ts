import request from 'supertest';
import app from '../app';

describe('documented route mounts', () => {
  test('GET /api/health returns ok', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test.each([
    ['get workspace boards', 'get', '/api/workspaces/test-workspace/boards'],
    ['post workspace boards', 'post', '/api/workspaces/test-workspace/boards'],
    ['post board lists', 'post', '/api/boards/test-board/lists'],
    ['post list cards', 'post', '/api/lists/test-list/cards'],
    ['get board by id', 'get', '/api/boards/test-board'],
    ['patch board by id', 'patch', '/api/boards/test-board'],
    ['delete board by id', 'delete', '/api/boards/test-board'],
    ['get list by id', 'get', '/api/lists/test-list'],
    ['patch list by id', 'patch', '/api/lists/test-list'],
    ['delete list by id', 'delete', '/api/lists/test-list'],
    ['get card by id', 'get', '/api/cards/test-card'],
    ['patch card by id', 'patch', '/api/cards/test-card'],
    ['delete card by id', 'delete', '/api/cards/test-card'],
    ['delete comment by id', 'delete', '/api/comments/test-comment'],
    ['post card comments', 'post', '/api/cards/test-card/comments'],
    ['get card comments', 'get', '/api/cards/test-card/comments'],
    ['get workspace members', 'get', '/api/workspaces/test-workspace/members'],
    ['post workspace members', 'post', '/api/workspaces/test-workspace/members'],
    ['patch workspace member', 'patch', '/api/workspaces/test-workspace/members/test-member'],
    ['delete workspace member', 'delete', '/api/workspaces/test-workspace/members/test-member'],
  ] as const)(
    '%s mounted under documented /api path',
    async (_name, method, path) => {
      const response = await request(app)[method](path);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'Unauthorized' });
    },
  );
});
