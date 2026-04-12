import request from 'supertest';
import app from '../app';

const createCardMock = jest.fn();
const getCardByIdMock = jest.fn();
const updateCardMock = jest.fn();
const getListByIdMock = jest.fn();

jest.mock('../middleware/auth', () => {
  const actual = jest.requireActual('../middleware/auth');

  return {
    ...actual,
    isAuthenticated: (
      req: { user?: { userId: string } },
      _res: unknown,
      next: () => void,
    ) => {
      req.user = { userId: 'user-1' };
      next();
    },
  };
});

jest.mock('../services/cardService', () => ({
  createCard: (...args: unknown[]) => createCardMock(...args),
  getCardById: (...args: unknown[]) => getCardByIdMock(...args),
  updateCard: (...args: unknown[]) => updateCardMock(...args),
  deleteCard: jest.fn(),
}));

jest.mock('../services/listService', () => ({
  getListById: (...args: unknown[]) => getListByIdMock(...args),
}));

describe('card metadata routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getListByIdMock.mockResolvedValue({ id: 'list-1' });
    getCardByIdMock.mockResolvedValue({ id: 'card-1', title: 'Card' });
  });

  it('accepts metadata on card create', async () => {
    createCardMock.mockResolvedValue({
      id: 'card-1',
      title: 'Card',
      labels: ['backend'],
    });

    const response = await request(app)
      .post('/api/lists/list-1/cards')
      .send({
        title: 'Card',
        description: 'Desc',
        dueDate: '2026-04-15T10:00:00.000Z',
        assigneeId: 'user-2',
        labels: ['backend'],
      });

    expect(response.status).toBe(201);
    expect(createCardMock).toHaveBeenCalledWith({
      title: 'Card',
      description: 'Desc',
      listId: 'list-1',
      dueDate: new Date('2026-04-15T10:00:00.000Z'),
      assigneeId: 'user-2',
      labels: ['backend'],
    }, 'user-1');
  });

  it('allows clearing nullable metadata on card update', async () => {
    updateCardMock.mockResolvedValue({
      id: 'card-1',
      title: 'Card',
      assigneeId: null,
      dueDate: null,
      labels: [],
    });

    const response = await request(app)
      .patch('/api/cards/card-1')
      .send({
        assigneeId: null,
        dueDate: null,
        labels: [],
      });

    expect(response.status).toBe(200);
    expect(updateCardMock).toHaveBeenCalledWith(
      'card-1',
      {
        assigneeId: null,
        dueDate: null,
        labels: [],
      },
      'user-1',
    );
  });
});
