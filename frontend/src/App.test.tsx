// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const {
  loginMock,
  registerMock,
  logoutMock,
  socketOnMock,
  socketOffMock,
  apiGetMock,
  apiPostMock,
  apiPatchMock,
} = vi.hoisted(() => ({
  loginMock: vi.fn(),
  registerMock: vi.fn(),
  logoutMock: vi.fn(),
  socketOnMock: vi.fn(),
  socketOffMock: vi.fn(),
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPatchMock: vi.fn(),
}));

const authState = {
  tokens: null as null | { accessToken: string; refreshToken: string },
  isAuthenticated: false,
  isLoading: false,
  error: null as string | null,
};

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    ...authState,
    login: loginMock,
    register: registerMock,
    logout: logoutMock,
    refresh: vi.fn(),
  }),
}));

vi.mock('./hooks/useSocket', () => ({
  useSocket: () => ({
    joinWorkspace: vi.fn(),
    leaveWorkspace: vi.fn(),
    joinBoard: vi.fn(),
    leaveBoard: vi.fn(),
    on: socketOnMock,
    off: socketOffMock,
    SOCKET_EVENTS: {
      BOARD_CREATED: 'board:created',
      BOARD_UPDATED: 'board:updated',
      BOARD_DELETED: 'board:deleted',
      LIST_CREATED: 'list:created',
      LIST_UPDATED: 'list:updated',
      LIST_DELETED: 'list:deleted',
      CARD_CREATED: 'card:created',
      CARD_UPDATED: 'card:updated',
      CARD_MOVED: 'card:moved',
      CARD_DELETED: 'card:deleted',
      COMMENT_ADDED: 'comment:added',
      COMMENT_DELETED: 'comment:deleted',
    },
  }),
}));

vi.mock('./lib/socket', () => ({
  disconnectSocket: vi.fn(),
}));

vi.mock('./lib/api', () => ({
  api: {
    get: apiGetMock,
    post: apiPostMock,
    patch: apiPatchMock,
  },
}));

describe('App', () => {
  beforeEach(() => {
    authState.tokens = null;
    authState.isAuthenticated = false;
    authState.isLoading = false;
    authState.error = null;
    loginMock.mockReset();
    registerMock.mockReset();
    logoutMock.mockReset();
    socketOnMock.mockReset();
    socketOffMock.mockReset();
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    apiPatchMock.mockReset();
  });

  it('renders login shell and submits credentials', async () => {
    loginMock.mockResolvedValue(undefined);

    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('you@company.com'), {
      target: { value: 'demo@collabboards.local' },
    });
    fireEvent.change(screen.getByPlaceholderText('At least 8 chars'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enter workspace' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith(
        'demo@collabboards.local',
        'password123',
      );
    });
  });

  it('loads live workspace and board data for authenticated user', async () => {
    authState.tokens = {
      accessToken: 'token-1',
      refreshToken: 'token-2',
    };
    authState.isAuthenticated = true;

    apiGetMock.mockImplementation((url: string) => {
      switch (url) {
        case '/workspaces':
          return Promise.resolve({
            data: {
              workspaces: [{ id: 'workspace-1', name: 'Core Workspace' }],
            },
          });
        case '/workspaces/workspace-1/boards':
          return Promise.resolve({
            data: {
              boards: [
                {
                  id: 'board-1',
                  title: 'Recovery Board',
                  description: 'Live board',
                },
              ],
            },
          });
        case '/boards/board-1':
          return Promise.resolve({
            data: {
              id: 'board-1',
              title: 'Recovery Board',
              description: 'Live board',
              workspaceId: 'workspace-1',
              lists: [
                {
                  id: 'list-1',
                  title: 'Todo',
                  position: 0,
                  cards: [
                    {
                      id: 'card-1',
                      title: 'Fix route mount drift',
                      description: 'Real card',
                      labels: ['backend'],
                      _count: { comments: 1, attachments: 0 },
                    },
                  ],
                },
              ],
            },
          });
        default:
          throw new Error(`Unexpected GET ${url}`);
      }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Core Workspace')).toBeInTheDocument();
      expect(screen.getAllByText('Recovery Board').length).toBeGreaterThan(0);
      expect(screen.getByText('Fix route mount drift')).toBeInTheDocument();
    });
  });
});
