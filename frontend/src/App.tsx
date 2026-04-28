import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { useAuth } from './hooks/useAuth';
import { useSocket } from './hooks/useSocket';
import { disconnectSocket } from './lib/socket';
import { api } from './lib/api';
import { WorkspaceMembers } from './components/WorkspaceMembers';

interface UserSummary {
  id: string;
  email: string;
  name?: string | null;
}

interface Workspace {
  id: string;
  name: string;
}

interface BoardListItem {
  id: string;
  title: string;
  description?: string | null;
}

interface CardSummary {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  labels?: string[];
  assignee?: UserSummary | null;
  _count?: {
    comments: number;
    attachments: number;
  };
}

interface BoardList {
  id: string;
  title: string;
  position: number;
  cards: CardSummary[];
}

interface BoardDetails {
  id: string;
  title: string;
  description?: string | null;
  workspaceId: string;
  workspace?: Workspace;
  lists: BoardList[];
}

interface CommentRecord {
  id: string;
  body: string;
  createdAt: string;
  author: UserSummary;
}

interface ActivityRecord {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  user?: UserSummary | null;
}

interface CardDetails extends CardSummary {
  list: {
    id: string;
    board: {
      id: string;
      workspaceId: string;
    };
  };
  comments: CommentRecord[];
  activities: ActivityRecord[];
}

interface PaginatedWorkspaces {
  workspaces: Workspace[];
}

interface PaginatedBoards {
  boards: BoardListItem[];
}

const decodeJwtUserId = (token: string | undefined): string | null => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { userId?: string };
    return payload.userId ?? null;
  } catch {
    return null;
  }
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    return error.response?.data?.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'No due date';
  }

  return new Date(value).toLocaleString();
};

function App() {
  const auth = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardDetails | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardDetails | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [isLoadingCard, setIsLoadingCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [boardForm, setBoardForm] = useState({ title: '', description: '' });
  const [listTitle, setListTitle] = useState('');
  const [cardDrafts, setCardDrafts] = useState<Record<string, string>>({});
  const [commentBody, setCommentBody] = useState('');

  // Edit state
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editWorkspaceName, setEditWorkspaceName] = useState('');
  const [editingBoardTitle, setEditingBoardTitle] = useState(false);
  const [editBoardForm, setEditBoardForm] = useState({ title: '', description: '' });
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListTitle, setEditListTitle] = useState('');
  const [editingCard, setEditingCard] = useState(false);
  const [editCardForm, setEditCardForm] = useState({ title: '', description: '' });

  const { joinWorkspace, leaveWorkspace, joinBoard, leaveBoard, on, off, SOCKET_EVENTS } =
    useSocket({
      token: auth.tokens?.accessToken,
    });

  const selectedListIds = useMemo(
    () => new Set(board?.lists.map((list) => list.id) ?? []),
    [board],
  );

  const fetchSelectedCard = useCallback(async (cardId: string) => {
    setIsLoadingCard(true);

    try {
      const { data } = await api.get<CardDetails>(`/cards/${cardId}`);
      setSelectedCard(data);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Card load failed'));
    } finally {
      setIsLoadingCard(false);
    }
  }, []);

  const fetchBoard = useCallback(async (boardId: string) => {
    setIsLoadingBoard(true);

    try {
      const { data } = await api.get<BoardDetails>(`/boards/${boardId}`);
      setBoard(data);
      setSelectedBoardId(data.id);

      if (selectedCardId) {
        const cardStillVisible = data.lists.some((list) =>
          list.cards.some((card) => card.id === selectedCardId),
        );

        if (cardStillVisible) {
          await fetchSelectedCard(selectedCardId);
        } else {
          setSelectedCardId(null);
          setSelectedCard(null);
        }
      }
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Board load failed'));
    } finally {
      setIsLoadingBoard(false);
    }
  }, [fetchSelectedCard, selectedCardId]);

  const fetchBoards = useCallback(async (workspaceId: string) => {
    try {
      const { data } = await api.get<PaginatedBoards>(
        `/workspaces/${workspaceId}/boards`,
      );
      setBoards(data.boards);

      const nextBoardId =
        selectedBoardId && data.boards.some((boardItem) => boardItem.id === selectedBoardId)
          ? selectedBoardId
          : data.boards[0]?.id ?? null;

      setSelectedBoardId(nextBoardId);

      if (nextBoardId) {
        await fetchBoard(nextBoardId);
      } else {
        setBoard(null);
        setSelectedCard(null);
        setSelectedCardId(null);
      }
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Board list load failed'));
    }
  }, [fetchBoard, selectedBoardId]);

  const bootstrap = useCallback(async () => {
    if (!auth.isAuthenticated) {
      return;
    }

    setIsBootstrapping(true);
    setError(null);

    try {
      const { data } = await api.get<PaginatedWorkspaces>('/workspaces');
      setWorkspaces(data.workspaces);

      const nextWorkspaceId =
        selectedWorkspaceId &&
        data.workspaces.some((workspace) => workspace.id === selectedWorkspaceId)
          ? selectedWorkspaceId
          : data.workspaces[0]?.id ?? null;

      setSelectedWorkspaceId(nextWorkspaceId);

      if (nextWorkspaceId) {
        await fetchBoards(nextWorkspaceId);
      } else {
        setBoards([]);
        setBoard(null);
        setSelectedBoardId(null);
        setSelectedCardId(null);
        setSelectedCard(null);
      }
    } catch (bootstrapError) {
      setError(getErrorMessage(bootstrapError, 'Workspace load failed'));
    } finally {
      setIsBootstrapping(false);
    }
  }, [auth.isAuthenticated, fetchBoards, selectedWorkspaceId]);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setWorkspaces([]);
      setBoards([]);
      setBoard(null);
      setSelectedBoardId(null);
      setSelectedWorkspaceId(null);
      setSelectedCardId(null);
      setSelectedCard(null);
      return;
    }

    void bootstrap();
  }, [auth.isAuthenticated, bootstrap]);

  useEffect(() => {
    if (!selectedWorkspaceId || !auth.isAuthenticated) {
      return;
    }

    joinWorkspace(selectedWorkspaceId);

    return () => {
      leaveWorkspace(selectedWorkspaceId);
    };
  }, [auth.isAuthenticated, joinWorkspace, leaveWorkspace, selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedBoardId || !auth.isAuthenticated) {
      return;
    }

    joinBoard(selectedBoardId);

    return () => {
      leaveBoard(selectedBoardId);
    };
  }, [auth.isAuthenticated, joinBoard, leaveBoard, selectedBoardId]);

  useEffect(() => {
    if (!selectedBoardId || !auth.isAuthenticated) {
      return;
    }

    const refreshBoard = () => {
      void fetchBoard(selectedBoardId);
      if (selectedWorkspaceId) {
        void fetchBoards(selectedWorkspaceId);
      }
    };

    const refreshComments = () => {
      if (selectedCardId) {
        void fetchSelectedCard(selectedCardId);
      }
      void fetchBoard(selectedBoardId);
    };

    const boardEvents = [
      SOCKET_EVENTS.BOARD_CREATED,
      SOCKET_EVENTS.BOARD_UPDATED,
      SOCKET_EVENTS.BOARD_DELETED,
      SOCKET_EVENTS.LIST_CREATED,
      SOCKET_EVENTS.LIST_UPDATED,
      SOCKET_EVENTS.LIST_DELETED,
      SOCKET_EVENTS.CARD_CREATED,
      SOCKET_EVENTS.CARD_UPDATED,
      SOCKET_EVENTS.CARD_MOVED,
      SOCKET_EVENTS.CARD_DELETED,
    ];

    for (const event of boardEvents) {
      on(event, refreshBoard);
    }

    on(SOCKET_EVENTS.COMMENT_ADDED, refreshComments);
    on(SOCKET_EVENTS.COMMENT_DELETED, refreshComments);

    return () => {
      for (const event of boardEvents) {
        off(event, refreshBoard);
      }
      off(SOCKET_EVENTS.COMMENT_ADDED, refreshComments);
      off(SOCKET_EVENTS.COMMENT_DELETED, refreshComments);
    };
  }, [
    auth.isAuthenticated,
    fetchBoard,
    fetchBoards,
    fetchSelectedCard,
    off,
    on,
    selectedBoardId,
    selectedCardId,
    selectedWorkspaceId,
    SOCKET_EVENTS.BOARD_CREATED,
    SOCKET_EVENTS.BOARD_DELETED,
    SOCKET_EVENTS.BOARD_UPDATED,
    SOCKET_EVENTS.CARD_CREATED,
    SOCKET_EVENTS.CARD_DELETED,
    SOCKET_EVENTS.CARD_MOVED,
    SOCKET_EVENTS.CARD_UPDATED,
    SOCKET_EVENTS.COMMENT_ADDED,
    SOCKET_EVENTS.COMMENT_DELETED,
    SOCKET_EVENTS.LIST_CREATED,
    SOCKET_EVENTS.LIST_DELETED,
    SOCKET_EVENTS.LIST_UPDATED,
  ]);

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const name = String(formData.get('name') ?? '');

    try {
      if (authMode === 'login') {
        await auth.login(email, password);
      } else {
        await auth.register(email, password, name || undefined);
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError, `${authMode} failed`));
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    auth.logout();
  };

  const handleWorkspaceCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspaceName.trim()) {
      return;
    }

    setError(null);

    try {
      const { data } = await api.post<Workspace>('/workspaces', {
        name: workspaceName.trim(),
      });

      setWorkspaceName('');
      await bootstrap();
      setSelectedWorkspaceId(data.id);
    } catch (workspaceError) {
      setError(getErrorMessage(workspaceError, 'Workspace create failed'));
    }
  };

  const handleBoardCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedWorkspaceId || !boardForm.title.trim()) {
      return;
    }

    setError(null);

    try {
      const { data } = await api.post<BoardListItem>(
        `/workspaces/${selectedWorkspaceId}/boards`,
        {
          title: boardForm.title.trim(),
          description: boardForm.description.trim() || undefined,
        },
      );

      setBoardForm({ title: '', description: '' });
      await fetchBoards(selectedWorkspaceId);
      await fetchBoard(data.id);
    } catch (boardError) {
      setError(getErrorMessage(boardError, 'Board create failed'));
    }
  };

  const handleListCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBoardId || !listTitle.trim()) {
      return;
    }

    setError(null);

    try {
      await api.post(`/boards/${selectedBoardId}/lists`, {
        title: listTitle.trim(),
      });

      setListTitle('');
      await fetchBoard(selectedBoardId);
    } catch (listError) {
      setError(getErrorMessage(listError, 'List create failed'));
    }
  };

  const handleCardCreate = async (listId: string) => {
    const title = cardDrafts[listId]?.trim();
    if (!title) {
      return;
    }

    setError(null);

    try {
      await api.post(`/lists/${listId}/cards`, {
        title,
      });

      setCardDrafts((current) => ({
        ...current,
        [listId]: '',
      }));

      if (selectedBoardId) {
        await fetchBoard(selectedBoardId);
      }
    } catch (cardError) {
      setError(getErrorMessage(cardError, 'Card create failed'));
    }
  };

  const handleCardMove = async (cardId: string, targetListId: string) => {
    setError(null);

    try {
      await api.patch(`/cards/${cardId}`, {
        listId: targetListId,
      });

      if (selectedBoardId) {
        await fetchBoard(selectedBoardId);
      }
    } catch (moveError) {
      setError(getErrorMessage(moveError, 'Card move failed'));
    }
  };

  const handleCardSelect = async (cardId: string) => {
    setSelectedCardId(cardId);
    await fetchSelectedCard(cardId);
  };

  const handleCommentCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCardId || !commentBody.trim()) {
      return;
    }

    setError(null);

    try {
      await api.post(`/cards/${selectedCardId}/comments`, {
        body: commentBody.trim(),
      });

      setCommentBody('');
      await fetchSelectedCard(selectedCardId);
      if (selectedBoardId) {
        await fetchBoard(selectedBoardId);
      }
    } catch (commentError) {
      setError(getErrorMessage(commentError, 'Comment create failed'));
    }
  };

  const handleCardUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCardId) return;
    setError(null);
    try {
      await api.patch(`/cards/${selectedCardId}`, {
        title: editCardForm.title.trim() || undefined,
        description: editCardForm.description.trim() || undefined,
      });
      setEditingCard(false);
      await fetchSelectedCard(selectedCardId);
      if (selectedBoardId) await fetchBoard(selectedBoardId);
    } catch (e) {
      setError(getErrorMessage(e, 'Card update failed'));
    }
  };

  const handleCardDelete = async (cardId: string) => {
    if (!window.confirm('Delete this card?')) return;
    setError(null);
    try {
      await api.delete(`/cards/${cardId}`);
      setSelectedCardId(null);
      setSelectedCard(null);
      if (selectedBoardId) await fetchBoard(selectedBoardId);
    } catch (e) {
      setError(getErrorMessage(e, 'Card delete failed'));
    }
  };

  const handleListUpdate = async (listId: string) => {
    if (!editListTitle.trim()) return;
    setError(null);
    try {
      await api.patch(`/lists/${listId}`, { title: editListTitle.trim() });
      setEditingListId(null);
      if (selectedBoardId) await fetchBoard(selectedBoardId);
    } catch (e) {
      setError(getErrorMessage(e, 'List update failed'));
    }
  };

  const handleListDelete = async (listId: string) => {
    if (!window.confirm('Delete this list and all its cards?')) return;
    setError(null);
    try {
      await api.delete(`/lists/${listId}`);
      if (selectedBoardId) await fetchBoard(selectedBoardId);
    } catch (e) {
      setError(getErrorMessage(e, 'List delete failed'));
    }
  };

  const handleBoardUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBoardId || !editBoardForm.title.trim()) return;
    setError(null);
    try {
      await api.patch(`/boards/${selectedBoardId}`, {
        title: editBoardForm.title.trim(),
        description: editBoardForm.description.trim() || undefined,
      });
      setEditingBoardTitle(false);
      if (selectedWorkspaceId) await fetchBoards(selectedWorkspaceId);
      await fetchBoard(selectedBoardId);
    } catch (e) {
      setError(getErrorMessage(e, 'Board update failed'));
    }
  };

  const handleBoardDelete = async () => {
    if (!selectedBoardId || !window.confirm('Delete this board?')) return;
    setError(null);
    try {
      await api.delete(`/boards/${selectedBoardId}`);
      setSelectedBoardId(null);
      setBoard(null);
      setSelectedCardId(null);
      setSelectedCard(null);
      if (selectedWorkspaceId) await fetchBoards(selectedWorkspaceId);
    } catch (e) {
      setError(getErrorMessage(e, 'Board delete failed'));
    }
  };

  const handleWorkspaceUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingWorkspaceId || !editWorkspaceName.trim()) return;
    setError(null);
    try {
      await api.patch(`/workspaces/${editingWorkspaceId}`, { name: editWorkspaceName.trim() });
      setEditingWorkspaceId(null);
      await bootstrap();
    } catch (e) {
      setError(getErrorMessage(e, 'Workspace update failed'));
    }
  };

  const handleWorkspaceDelete = async (workspaceId: string) => {
    if (!window.confirm('Delete this workspace and everything in it?')) return;
    setError(null);
    try {
      await api.delete(`/workspaces/${workspaceId}`);
      if (selectedWorkspaceId === workspaceId) {
        setSelectedWorkspaceId(null);
        setBoards([]);
        setBoard(null);
        setSelectedBoardId(null);
        setSelectedCardId(null);
        setSelectedCard(null);
      }
      await bootstrap();
    } catch (e) {
      setError(getErrorMessage(e, 'Workspace delete failed'));
    }
  };

  const nextListForCard = (listId: string) => {
    if (!board) {
      return null;
    }

    const listIndex = board.lists.findIndex((list) => list.id === listId);
    if (listIndex < 0 || listIndex === board.lists.length - 1) {
      return null;
    }

    return board.lists[listIndex + 1];
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <p className="eyebrow">Repo recovery build</p>
          <h1>CollabBoards</h1>
          <p className="auth-copy">
            Login or register. Then app loads real workspaces, boards, lists,
            cards, comments.
          </p>
          <div className="auth-toggle">
            <button
              className={authMode === 'login' ? 'primary-button' : 'secondary-button'}
              type="button"
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              className={authMode === 'register' ? 'primary-button' : 'secondary-button'}
              type="button"
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
          </div>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' ? (
              <label>
                Name
                <input name="name" placeholder="Team member" />
              </label>
            ) : null}
            <label>
              Email
              <input name="email" type="email" required placeholder="you@company.com" />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                minLength={8}
                required
                placeholder="At least 8 chars"
              />
            </label>
            <button className="primary-button" disabled={auth.isLoading} type="submit">
              {auth.isLoading
                ? 'Working...'
                : authMode === 'login'
                  ? 'Enter workspace'
                  : 'Create account'}
            </button>
          </form>
          {error || auth.error ? (
            <p className="status-banner status-banner--error">{error ?? auth.error}</p>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Live workspace</p>
          <h1>CollabBoards</h1>
          <span className="app-subtitle">
            Core flow only. Real API. Real socket refresh.
          </span>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={() => void bootstrap()} type="button">
            Refresh
          </button>
          <button className="secondary-button" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </header>

      {error ? <p className="status-banner status-banner--error">{error}</p> : null}
      {isBootstrapping ? (
        <p className="status-banner">Loading workspaces...</p>
      ) : null}

      <main className="app-main">
        <aside className="sidebar">
          <section>
            <h2>Workspaces</h2>
            <div className="tile-stack">
              {workspaces.map((workspace) => (
                <div className="tile-row" key={workspace.id}>
                  {editingWorkspaceId === workspace.id ? (
                    <form className="inline-form" onSubmit={handleWorkspaceUpdate}>
                      <input
                        autoFocus
                        value={editWorkspaceName}
                        onChange={(e) => setEditWorkspaceName(e.target.value)}
                      />
                      <button className="primary-button" type="submit">Save</button>
                      <button className="ghost-button" type="button" onClick={() => setEditingWorkspaceId(null)}>Cancel</button>
                    </form>
                  ) : (
                    <>
                      <button
                        className={
                          workspace.id === selectedWorkspaceId
                            ? 'workspace-tile workspace-tile--active'
                            : 'workspace-tile'
                        }
                        onClick={() => {
                          setSelectedWorkspaceId(workspace.id);
                          setSelectedCardId(null);
                          setSelectedCard(null);
                          void fetchBoards(workspace.id);
                        }}
                        type="button"
                      >
                        {workspace.name}
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        title="Rename"
                        onClick={() => { setEditingWorkspaceId(workspace.id); setEditWorkspaceName(workspace.name); }}
                      >✏️</button>
                      <button
                        className="ghost-button"
                        type="button"
                        title="Delete"
                        onClick={() => void handleWorkspaceDelete(workspace.id)}
                      >🗑️</button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <form className="inline-form" onSubmit={handleWorkspaceCreate}>
              <input
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="New workspace"
                value={workspaceName}
              />
              <button className="primary-button" type="submit">
                Add workspace
              </button>
            </form>
          </section>

          {selectedWorkspaceId ? (
            <WorkspaceMembers
              workspaceId={selectedWorkspaceId}
              currentUserId={decodeJwtUserId(auth.tokens?.accessToken) ?? ''}
            />
          ) : null}

          <section>
            <h2>Boards</h2>
            <div className="tile-stack">
              {boards.map((boardItem) => (
                <button
                  className={
                    boardItem.id === selectedBoardId
                      ? 'workspace-tile workspace-tile--active'
                      : 'workspace-tile'
                  }
                  key={boardItem.id}
                  onClick={() => {
                    setSelectedBoardId(boardItem.id);
                    setSelectedCardId(null);
                    setSelectedCard(null);
                    void fetchBoard(boardItem.id);
                  }}
                  type="button"
                >
                  <strong>{boardItem.title}</strong>
                  <span>{boardItem.description || 'No description'}</span>
                </button>
              ))}
            </div>
            <form className="inline-form" onSubmit={handleBoardCreate}>
              <input
                onChange={(event) =>
                  setBoardForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Board title"
                value={boardForm.title}
              />
              <textarea
                onChange={(event) =>
                  setBoardForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Board description"
                value={boardForm.description}
              />
              <button className="primary-button" type="submit">
                Add board
              </button>
            </form>
          </section>
        </aside>

        <section className="board-section">
          <header className="board-header">
            {editingBoardTitle && board ? (
              <form className="inline-form" onSubmit={handleBoardUpdate}>
                <input
                  autoFocus
                  value={editBoardForm.title}
                  onChange={(e) => setEditBoardForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Board title"
                />
                <input
                  value={editBoardForm.description}
                  onChange={(e) => setEditBoardForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Description"
                />
                <button className="primary-button" type="submit">Save</button>
                <button className="ghost-button" type="button" onClick={() => setEditingBoardTitle(false)}>Cancel</button>
              </form>
            ) : (
              <div>
                <h2>{board?.title ?? 'Select board'}</h2>
                <p>{board?.description ?? 'Choose workspace, then board.'}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {board && !editingBoardTitle && (
                <>
                  <button className="ghost-button" type="button" title="Edit board" onClick={() => {
                    setEditBoardForm({ title: board.title, description: board.description ?? '' });
                    setEditingBoardTitle(true);
                  }}>✏️ Edit</button>
                  <button className="ghost-button" type="button" title="Delete board" onClick={() => void handleBoardDelete()}>🗑️ Delete</button>
                </>
              )}
              {isLoadingBoard ? <span className="app-subtitle">Syncing...</span> : null}
            </div>
          </header>

          {board ? (
            <>
              <form className="inline-form inline-form--compact" onSubmit={handleListCreate}>
                <input
                  onChange={(event) => setListTitle(event.target.value)}
                  placeholder="New list"
                  value={listTitle}
                />
                <button className="secondary-button" type="submit">
                  Add list
                </button>
              </form>
              <div className="board-lists">
                {board.lists.map((list) => (
                  <article className="board-list" key={list.id}>
                    <div className="list-heading">
                      {editingListId === list.id ? (
                        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); void handleListUpdate(list.id); }}>
                          <input
                            autoFocus
                            value={editListTitle}
                            onChange={(e) => setEditListTitle(e.target.value)}
                          />
                          <button className="primary-button" type="submit">Save</button>
                          <button className="ghost-button" type="button" onClick={() => setEditingListId(null)}>Cancel</button>
                        </form>
                      ) : (
                        <>
                          <h3>{list.title}</h3>
                          <span>{list.cards.length} cards</span>
                          <button className="ghost-button" type="button" title="Rename list" onClick={() => { setEditingListId(list.id); setEditListTitle(list.title); }}>✏️</button>
                          <button className="ghost-button" type="button" title="Delete list" onClick={() => void handleListDelete(list.id)}>🗑️</button>
                        </>
                      )}
                    </div>
                    {list.cards.map((card) => {
                      const targetList = nextListForCard(list.id);

                      return (
                        <div className="card card--interactive" key={card.id}>
                          <button
                            className="card-hitbox"
                            onClick={() => void handleCardSelect(card.id)}
                            type="button"
                          >
                            <strong>{card.title}</strong>
                            <span>{card.description || 'No description'}</span>
                            <small>
                              {card.labels?.length ? card.labels.join(', ') : 'No labels'}
                            </small>
                          </button>
                          <div className="card-meta">
                            <span>{card._count?.comments ?? 0} comments</span>
                            {targetList ? (
                              <button
                                className="ghost-button"
                                onClick={() => void handleCardMove(card.id, targetList.id)}
                                type="button"
                              >
                                Move to {targetList.title}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                    <div className="card-compose">
                      <input
                        onChange={(event) =>
                          setCardDrafts((current) => ({
                            ...current,
                            [list.id]: event.target.value,
                          }))
                        }
                        placeholder="New card title"
                        value={cardDrafts[list.id] ?? ''}
                      />
                      <button
                        className="ghost-button"
                        onClick={() => void handleCardCreate(list.id)}
                        type="button"
                      >
                        Add card
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>No board selected</h3>
              <p>Create workspace or board from left rail.</p>
            </div>
          )}
        </section>

        <aside className="details-panel">
          <h2>Card Details</h2>
          {isLoadingCard ? <p>Loading card...</p> : null}
          {selectedCard ? (
            <>
              <div className="details-section">
                {editingCard ? (
                  <form className="inline-form" onSubmit={handleCardUpdate}>
                    <input
                      autoFocus
                      value={editCardForm.title}
                      onChange={(e) => setEditCardForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Card title"
                    />
                    <textarea
                      value={editCardForm.description}
                      onChange={(e) => setEditCardForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Description"
                    />
                    <button className="primary-button" type="submit">Save</button>
                    <button className="ghost-button" type="button" onClick={() => setEditingCard(false)}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                      <h3 style={{ flex: 1 }}>{selectedCard.title}</h3>
                      <button className="ghost-button" type="button" onClick={() => { setEditCardForm({ title: selectedCard.title, description: selectedCard.description ?? '' }); setEditingCard(true); }}>✏️ Edit</button>
                      <button className="ghost-button" type="button" onClick={() => void handleCardDelete(selectedCard.id)}>🗑️ Delete</button>
                    </div>
                    <p>{selectedCard.description || 'No description'}</p>
                  </>
                )}
                <dl className="meta-grid">
                  <div>
                    <dt>Due</dt>
                    <dd>{formatDate(selectedCard.dueDate)}</dd>
                  </div>
                  <div>
                    <dt>Assignee</dt>
                    <dd>{selectedCard.assignee?.name || selectedCard.assignee?.email || 'None'}</dd>
                  </div>
                  <div>
                    <dt>Labels</dt>
                    <dd>{selectedCard.labels?.length ? selectedCard.labels.join(', ') : 'None'}</dd>
                  </div>
                </dl>
              </div>

              <div className="details-section">
                <h3>Comments</h3>
                <div className="comment-list">
                  {selectedCard.comments.map((comment) => (
                    <article className="comment" key={comment.id}>
                      <strong>{comment.author.name || comment.author.email}</strong>
                      <span>{comment.body}</span>
                    </article>
                  ))}
                </div>
                <form className="inline-form" onSubmit={handleCommentCreate}>
                  <textarea
                    aria-label="Add comment"
                    onChange={(event) => setCommentBody(event.target.value)}
                    placeholder="Add comment"
                    value={commentBody}
                  />
                  <button className="secondary-button" type="submit">
                    Post comment
                  </button>
                </form>
              </div>

              <div className="details-section">
                <h3>Activity</h3>
                <div className="activity-list">
                  {selectedCard.activities.map((activity) => (
                    <article className="activity" key={activity.id}>
                      <strong>{activity.type}</strong>
                      <span>{activity.message}</span>
                    </article>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p>
              Pick card. Comments and activity load from live API. Board socket
              refresh updates this panel too.
            </p>
          )}
        </aside>
      </main>

      <footer className="app-footer">
        <span>
          Visible lists: {board?.lists.length ?? 0}
        </span>
        <span>
          Visible cards: {board?.lists.reduce((sum, list) => sum + list.cards.length, 0) ?? 0}
        </span>
        <span>
          Selected card in board: {selectedCardId && selectedListIds.size ? 'yes' : 'no'}
        </span>
      </footer>
    </div>
  );
}

export default App;
