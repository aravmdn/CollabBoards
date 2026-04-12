import request from 'supertest';
import {
  createIntegrationHarness,
  type IntegrationHarness,
} from '../testUtils/integrationHarness';

jest.setTimeout(30000);

describe('DB-backed API integration flow', () => {
  let harness: IntegrationHarness | undefined;

  const getHarness = () => {
    if (!harness) {
      throw new Error('Integration harness not initialized');
    }

    return harness;
  };

  beforeAll(async () => {
    harness = await createIntegrationHarness();
  });

  afterAll(async () => {
    if (harness) {
      await harness.stop();
    }
  });

  beforeEach(async () => {
    await harness?.reset();
  });

  it('executes auth, workspace, board, card, and comment flow against PostgreSQL', async () => {
    const client = request(getHarness().app);

    const registerResponse = await client.post('/api/auth/register').send({
      email: 'owner@example.com',
      password: 'password123',
      name: 'Owner',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.accessToken).toEqual(expect.any(String));
    expect(registerResponse.body.refreshToken).toEqual(expect.any(String));

    const loginResponse = await client.post('/api/auth/login').send({
      email: 'owner@example.com',
      password: 'password123',
    });

    expect(loginResponse.status).toBe(200);

    const refreshResponse = await client.post('/api/auth/refresh').send({
      refreshToken: loginResponse.body.refreshToken,
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.refreshToken).toEqual(expect.any(String));

    const authHeader = {
      Authorization: `Bearer ${loginResponse.body.accessToken}`,
    };

    const createWorkspaceResponse = await client
      .post('/api/workspaces')
      .set(authHeader)
      .send({ name: 'Workspace Alpha' });

    expect(createWorkspaceResponse.status).toBe(201);
    expect(createWorkspaceResponse.body.name).toBe('Workspace Alpha');
    expect(createWorkspaceResponse.body.members).toHaveLength(1);

    const workspaceId = createWorkspaceResponse.body.id as string;

    const listWorkspacesResponse = await client
      .get('/api/workspaces')
      .set(authHeader);

    expect(listWorkspacesResponse.status).toBe(200);
    expect(listWorkspacesResponse.body.workspaces).toHaveLength(1);
    expect(listWorkspacesResponse.body.workspaces[0].id).toBe(workspaceId);

    const createBoardResponse = await client
      .post(`/api/workspaces/${workspaceId}/boards`)
      .set(authHeader)
      .send({
        title: 'Board Alpha',
        description: 'Primary board',
      });

    expect(createBoardResponse.status).toBe(201);
    expect(createBoardResponse.body.title).toBe('Board Alpha');

    const boardId = createBoardResponse.body.id as string;

    const createTodoListResponse = await client
      .post(`/api/boards/${boardId}/lists`)
      .set(authHeader)
      .send({ title: 'Todo' });

    expect(createTodoListResponse.status).toBe(201);
    expect(createTodoListResponse.body.position).toBe(0);

    const createDoneListResponse = await client
      .post(`/api/boards/${boardId}/lists`)
      .set(authHeader)
      .send({ title: 'Done' });

    expect(createDoneListResponse.status).toBe(201);
    expect(createDoneListResponse.body.position).toBe(1);

    const todoListId = createTodoListResponse.body.id as string;
    const doneListId = createDoneListResponse.body.id as string;

    const createCardResponse = await client
      .post(`/api/lists/${todoListId}/cards`)
      .set(authHeader)
      .send({
        title: 'Ship integration tests',
        description: 'Cover the recovery path',
        labels: ['backend', 'integration'],
      });

    expect(createCardResponse.status).toBe(201);
    expect(createCardResponse.body.title).toBe('Ship integration tests');
    expect(createCardResponse.body.labels).toEqual(['backend', 'integration']);

    const cardId = createCardResponse.body.id as string;

    const moveCardResponse = await client
      .patch(`/api/cards/${cardId}`)
      .set(authHeader)
      .send({ listId: doneListId });

    expect(moveCardResponse.status).toBe(200);
    expect(moveCardResponse.body.listId).toBe(doneListId);
    expect(moveCardResponse.body.position).toBe(0);

    const createCommentResponse = await client
      .post(`/api/cards/${cardId}/comments`)
      .set(authHeader)
      .send({ body: 'Integration flow is green.' });

    expect(createCommentResponse.status).toBe(201);
    expect(createCommentResponse.body.body).toBe('Integration flow is green.');

    const commentId = createCommentResponse.body.id as string;

    const cardCommentsResponse = await client
      .get(`/api/cards/${cardId}/comments`)
      .set(authHeader);

    expect(cardCommentsResponse.status).toBe(200);
    expect(cardCommentsResponse.body).toHaveLength(1);
    expect(cardCommentsResponse.body[0].id).toBe(commentId);

    const boardResponse = await client
      .get(`/api/boards/${boardId}`)
      .set(authHeader);

    expect(boardResponse.status).toBe(200);
    expect(boardResponse.body.lists).toHaveLength(2);
    expect(boardResponse.body.lists[1].cards).toHaveLength(1);
    expect(boardResponse.body.lists[1].cards[0].id).toBe(cardId);

    const cardResponse = await client.get(`/api/cards/${cardId}`).set(authHeader);

    expect(cardResponse.status).toBe(200);
    expect(cardResponse.body.comments).toHaveLength(1);
    expect(cardResponse.body.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'CARD_CREATED' }),
        expect.objectContaining({ type: 'CARD_MOVED' }),
        expect.objectContaining({ type: 'COMMENT_ADDED' }),
      ]),
    );

    const deleteCommentResponse = await client
      .delete(`/api/comments/${commentId}`)
      .set(authHeader);

    expect(deleteCommentResponse.status).toBe(204);
  });

  it('blocks non-members from reading workspace-scoped data', async () => {
    const client = request(getHarness().app);
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      const ownerRegisterResponse = await client.post('/api/auth/register').send({
        email: 'owner2@example.com',
        password: 'password123',
        name: 'Owner 2',
      });

      const outsiderRegisterResponse = await client.post('/api/auth/register').send({
        email: 'outsider@example.com',
        password: 'password123',
        name: 'Outsider',
      });

      const ownerHeader = {
        Authorization: `Bearer ${ownerRegisterResponse.body.accessToken}`,
      };
      const outsiderHeader = {
        Authorization: `Bearer ${outsiderRegisterResponse.body.accessToken}`,
      };

      const workspaceResponse = await client
        .post('/api/workspaces')
        .set(ownerHeader)
        .send({ name: 'Private Workspace' });

      const workspaceId = workspaceResponse.body.id as string;

      const boardResponse = await client
        .post(`/api/workspaces/${workspaceId}/boards`)
        .set(ownerHeader)
        .send({ title: 'Private Board' });

      const forbiddenWorkspaceResponse = await client
        .get(`/api/workspaces/${workspaceId}`)
        .set(outsiderHeader);

      expect(forbiddenWorkspaceResponse.status).toBe(403);
      expect(forbiddenWorkspaceResponse.body.message).toBe(
        'Not a member of this workspace',
      );

      const missingBoardResponse = await client
        .get(`/api/boards/${boardResponse.body.id as string}`)
        .set(outsiderHeader);

      expect(missingBoardResponse.status).toBe(404);
      expect(missingBoardResponse.body.message).toBe('Board not found');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
