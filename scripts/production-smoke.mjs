import assert from 'node:assert/strict';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { io as createSocket } from 'socket.io-client';

const DEFAULT_TIMEOUT_MS = Number.parseInt(
  process.env.SMOKE_TIMEOUT_MS ?? '10000',
  10,
);

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (key?.startsWith('--') && value) {
    args.set(key.slice(2), value);
  }
}

const config = {
  backendUrl:
    args.get('backend-url') ??
    process.env.BACKEND_URL ??
    'http://127.0.0.1:4000',
  frontendUrl:
    args.get('frontend-url') ?? process.env.FRONTEND_URL ?? '',
  timeoutMs: Number.parseInt(
    args.get('timeout-ms') ?? process.env.SMOKE_TIMEOUT_MS ?? `${DEFAULT_TIMEOUT_MS}`,
    10,
  ),
  password: args.get('password') ?? process.env.SMOKE_PASSWORD ?? 'SmokePass123!',
};

const state = {
  accessToken: '',
  refreshToken: '',
  workspaceId: '',
  boardId: '',
  sourceListId: '',
  targetListId: '',
  cardId: '',
  commentId: '',
};

const smokeId = Date.now().toString(36);
const email = `smoke-${smokeId}@collabboards.local`;
const name = `Smoke ${smokeId}`;

const toUrl = (path, base = config.backendUrl) => new URL(path, base).toString();

const logStep = (message) => {
  console.log(`[smoke] ${message}`);
};

const expectJson = async (response, expectedStatus, context) => {
  const bodyText = await response.text();
  let json;

  try {
    json = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    throw new Error(`${context}: expected JSON response, received "${bodyText}"`);
  }

  assert.equal(
    response.status,
    expectedStatus,
    `${context}: expected HTTP ${expectedStatus}, received ${response.status} with body ${bodyText}`,
  );

  return json;
};

const apiRequest = async (
  path,
  {
    method = 'GET',
    token,
    body,
    expectedStatus = 200,
    baseUrl = config.backendUrl,
  } = {},
) => {
  const headers = {};
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(toUrl(path, baseUrl), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (expectedStatus === 204) {
    assert.equal(
      response.status,
      204,
      `${method} ${path}: expected HTTP 204, received ${response.status}`,
    );
    return null;
  }

  return expectJson(response, expectedStatus, `${method} ${path}`);
};

const waitForSocketEvent = async (socket, event, action, description) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(
        new Error(
          `${description}: timed out waiting for socket event "${event}" after ${config.timeoutMs}ms`,
        ),
      );
    }, config.timeoutMs);

    const handler = (payload) => {
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };

    socket.on(event, handler);

    Promise.resolve(action())
      .catch((error) => {
        clearTimeout(timer);
        socket.off(event, handler);
        reject(error);
      });
  });

const connectSocket = async (token) =>
  new Promise((resolve, reject) => {
    const socket = createSocket(config.backendUrl, {
      transports: ['websocket'],
      auth: { token },
      timeout: config.timeoutMs,
    });

    const timer = setTimeout(() => {
      socket.close();
      reject(
        new Error(`socket connect timeout after ${config.timeoutMs}ms`),
      );
    }, config.timeoutMs);

    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      socket.close();
      reject(error);
    });
  });

const cleanup = async () => {
  if (!state.accessToken) {
    return;
  }

  const attempts = [
    ['delete comment', state.commentId, () =>
      apiRequest(`/api/comments/${state.commentId}`, {
        method: 'DELETE',
        token: state.accessToken,
        expectedStatus: 204,
      })],
    ['delete card', state.cardId, () =>
      apiRequest(`/api/cards/${state.cardId}`, {
        method: 'DELETE',
        token: state.accessToken,
        expectedStatus: 204,
      })],
    ['delete target list', state.targetListId, () =>
      apiRequest(`/api/lists/${state.targetListId}`, {
        method: 'DELETE',
        token: state.accessToken,
        expectedStatus: 204,
      })],
    ['delete source list', state.sourceListId, () =>
      apiRequest(`/api/lists/${state.sourceListId}`, {
        method: 'DELETE',
        token: state.accessToken,
        expectedStatus: 204,
      })],
    ['delete board', state.boardId, () =>
      apiRequest(`/api/boards/${state.boardId}`, {
        method: 'DELETE',
        token: state.accessToken,
        expectedStatus: 204,
      })],
  ];

  for (const [label, id, action] of attempts) {
    if (!id) {
      continue;
    }

    try {
      await action();
    } catch (error) {
      console.warn(`[smoke] cleanup skipped for ${label}: ${error.message}`);
    }
  }
};

const main = async () => {
  logStep(`backend ${config.backendUrl}`);
  if (config.frontendUrl) {
    logStep(`frontend ${config.frontendUrl}`);
  }

  const health = await apiRequest('/api/health');
  assert.deepEqual(health, { status: 'ok' }, 'health payload mismatch');
  logStep('health ok');

  if (config.frontendUrl) {
    const frontendResponse = await fetch(toUrl('/', config.frontendUrl));
    const html = await frontendResponse.text();
    assert.equal(
      frontendResponse.status,
      200,
      `frontend root expected HTTP 200, received ${frontendResponse.status}`,
    );
    assert.match(
      html,
      /<div id="root"><\/div>/,
      'frontend root missing app mount',
    );
    logStep('frontend root ok');
  }

  const register = await apiRequest('/api/auth/register', {
    method: 'POST',
    expectedStatus: 201,
    body: {
      email,
      password: config.password,
      name,
    },
  });
  assert.ok(register.accessToken, 'register access token missing');
  assert.ok(register.refreshToken, 'register refresh token missing');

  const login = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email,
      password: config.password,
    },
  });
  state.accessToken = login.accessToken;
  state.refreshToken = login.refreshToken;
  assert.ok(state.accessToken, 'login access token missing');
  assert.ok(state.refreshToken, 'login refresh token missing');
  logStep('auth register/login ok');

  const refreshed = await apiRequest('/api/auth/refresh', {
    method: 'POST',
    body: {
      refreshToken: state.refreshToken,
    },
  });
  assert.ok(refreshed.accessToken, 'refresh access token missing');
  assert.ok(refreshed.refreshToken, 'refresh token missing');
  state.accessToken = refreshed.accessToken;
  state.refreshToken = refreshed.refreshToken;

  await apiRequest('/api/auth/logout', {
    method: 'POST',
    expectedStatus: 204,
  });
  logStep('auth refresh/logout ok');

  const workspace = await apiRequest('/api/workspaces', {
    method: 'POST',
    token: state.accessToken,
    expectedStatus: 201,
    body: {
      name: `Smoke Workspace ${smokeId}`,
    },
  });
  state.workspaceId = workspace.id;
  assert.ok(state.workspaceId, 'workspace id missing');

  const workspaceList = await apiRequest('/api/workspaces', {
    token: state.accessToken,
  });
  assert.ok(
    workspaceList.workspaces.some((item) => item.id === state.workspaceId),
    'created workspace missing from list response',
  );
  logStep('workspace create/list ok');

  const socket = await connectSocket(state.accessToken);

  try {
    socket.emit('join-workspace', state.workspaceId);
    await delay(250);

    const board = await waitForSocketEvent(
      socket,
      'board:created',
      () =>
        apiRequest(`/api/workspaces/${state.workspaceId}/boards`, {
          method: 'POST',
          token: state.accessToken,
          expectedStatus: 201,
          body: {
            title: `Smoke Board ${smokeId}`,
            description: 'Disposable smoke board',
          },
        }),
      'workspace room board create',
    );

    state.boardId = board.id;
    assert.ok(state.boardId, 'board id missing');

    const boards = await apiRequest(`/api/workspaces/${state.workspaceId}/boards`, {
      token: state.accessToken,
    });
    assert.ok(
      boards.boards.some((item) => item.id === state.boardId),
      'created board missing from workspace board list',
    );

    const openedBoard = await apiRequest(`/api/boards/${state.boardId}`, {
      token: state.accessToken,
    });
    assert.equal(openedBoard.id, state.boardId, 'opened board mismatch');
    logStep('board create/list/open ok');

    socket.emit('join-board', state.boardId);
    await delay(250);

    const sourceList = await waitForSocketEvent(
      socket,
      'list:created',
      () =>
        apiRequest(`/api/boards/${state.boardId}/lists`, {
          method: 'POST',
          token: state.accessToken,
          expectedStatus: 201,
          body: {
            title: 'Smoke Source',
          },
        }),
      'board room source list create',
    );
    state.sourceListId = sourceList.id;

    const targetList = await waitForSocketEvent(
      socket,
      'list:created',
      () =>
        apiRequest(`/api/boards/${state.boardId}/lists`, {
          method: 'POST',
          token: state.accessToken,
          expectedStatus: 201,
          body: {
            title: 'Smoke Target',
          },
        }),
      'board room target list create',
    );
    state.targetListId = targetList.id;

    const card = await waitForSocketEvent(
      socket,
      'card:created',
      () =>
        apiRequest(`/api/lists/${state.sourceListId}/cards`, {
          method: 'POST',
          token: state.accessToken,
          expectedStatus: 201,
          body: {
            title: 'Smoke Card',
            description: 'Disposable smoke card',
            labels: ['smoke'],
          },
        }),
      'board room card create',
    );
    state.cardId = card.id;

    const movedCard = await waitForSocketEvent(
      socket,
      'card:moved',
      () =>
        apiRequest(`/api/cards/${state.cardId}`, {
          method: 'PATCH',
          token: state.accessToken,
          body: {
            listId: state.targetListId,
          },
        }),
      'board room card move',
    );
    assert.equal(movedCard.id, state.cardId, 'moved card payload mismatch');

    const refreshedBoard = await apiRequest(`/api/boards/${state.boardId}`, {
      token: state.accessToken,
    });
    const movedIntoTarget = refreshedBoard.lists.find(
      (list) => list.id === state.targetListId,
    )?.cards.some((item) => item.id === state.cardId);
    assert.equal(movedIntoTarget, true, 'board refresh missing moved card');
    logStep('list/card create and board refresh ok');

    const comment = await waitForSocketEvent(
      socket,
      'comment:added',
      () =>
        apiRequest(`/api/cards/${state.cardId}/comments`, {
          method: 'POST',
          token: state.accessToken,
          expectedStatus: 201,
          body: {
            body: `Smoke comment ${smokeId}`,
          },
        }),
      'board room comment create',
    );
    state.commentId = comment.id;

    const cardDetails = await apiRequest(`/api/cards/${state.cardId}`, {
      token: state.accessToken,
    });
    assert.ok(
      cardDetails.comments.some((item) => item.id === state.commentId),
      'card refresh missing created comment',
    );
    logStep('comment create and card refresh ok');
  } finally {
    socket.close();
  }
};

try {
  await main();
} finally {
  await cleanup();
}

logStep('complete');
