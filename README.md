## CollabBoards

A Trello + Notion style real-time collaboration tool. Teams create **workspaces → boards → lists → cards**, and each card can have a mini rich-text doc and comments. All updates are pushed in real time to everyone on the board.

### Tech Stack

- **Backend**: Node.js, Express, TypeScript  
- **Database**: PostgreSQL + Prisma ORM  
- **Auth**: JWT access + refresh tokens (email/password)  
- **Real-time**: Socket.IO with rooms for `workspace:{id}` and `board:{id}`  
- **Frontend**: React, TypeScript, Vite  
- **CI**: GitHub Actions (tests and lint on push/PR)

### Project Structure

- `backend/` – Express API, auth, RBAC, Socket.IO, database layer  
- `frontend/` – React + Vite SPA for boards and card docs  
- `.github/workflows/ci.yml` – CI pipeline (Node setup, tests)

### Getting Started (Local)

```bash
# Install dependencies (root, using npm workspaces)
npm install

# Backend (Node/Express + Socket.IO)
npm run dev:backend

# Frontend (React + Vite)
npm run dev:frontend
```

By default:
- Backend listens on `http://localhost:4000`
- Frontend listens on `http://localhost:5173`

You can override the backend URL in the frontend via:

```bash
VITE_BACKEND_URL="http://localhost:4000"
```

### Deployment

#### Frontend (Vercel)

- Project root: `frontend/`  
- Build command: `npm install && npm run build`  
- Output directory: `dist`  
- Env vars:
  - `VITE_BACKEND_URL` – URL of the deployed backend (with HTTPS).

#### Backend (Railway)

1. **Create a new Railway project** and connect your GitHub repository.
2. **Add a PostgreSQL service** in Railway (or use an external database).
3. **Add a new service** for the backend:
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build` (runs Prisma generate + TypeScript compile)
   - **Start Command**: `npm start`
4. **Set environment variables**:
   - `DATABASE_URL` – From your PostgreSQL service (Railway provides this automatically if using Railway Postgres).
   - `JWT_ACCESS_TOKEN_SECRET` – Generate a secure random string.
   - `JWT_REFRESH_TOKEN_SECRET` – Generate a different secure random string.
   - `PORT` – Railway sets this automatically (defaults to 4000 if not set).
5. **Run migrations**: After first deploy, connect to your Railway service and run:
   ```bash
   npx prisma migrate deploy
   ```
   Or use Railway's CLI/console to run migrations.

**Note**: The backend validates required environment variables on startup and will exit with a clear error if any are missing.

### API Endpoints (Backend)

All routes are prefixed with `/api`:

#### Auth
- `POST /api/auth/register` – Register a new user (email, password, optional name), returns access + refresh tokens.
- `POST /api/auth/login` – Login with email/password, returns access + refresh tokens.
- `POST /api/auth/refresh` – Exchange a refresh token for a new access + refresh pair.
- `POST /api/auth/logout` – Stateless logout (client should discard tokens).

#### Workspaces (requires authentication)
- `GET /api/workspaces` – List workspaces for current user (paginated, query params: `page`, `limit`).
- `POST /api/workspaces` – Create a new workspace (body: `{ name: string }`). User becomes OWNER.
- `GET /api/workspaces/:id` – Get workspace details (must be a member).
- `PATCH /api/workspaces/:id` – Update workspace (OWNER or ADMIN only, body: `{ name?: string }`).
- `DELETE /api/workspaces/:id` – Delete workspace (OWNER only).

#### Boards (requires authentication + workspace membership)
- `GET /api/workspaces/:workspaceId/boards` – List boards in a workspace (paginated, query params: `page`, `limit`).
- `POST /api/workspaces/:workspaceId/boards` – Create a new board (body: `{ title: string, description?: string }`).
- `GET /api/boards/:id` – Get board details with lists and cards.
- `PATCH /api/boards/:id` – Update board (body: `{ title?: string, description?: string }`).
- `DELETE /api/boards/:id` – Delete board.

#### Lists (requires authentication + board access)
- `POST /api/boards/:boardId/lists` – Create a new list (body: `{ title: string }`).
- `GET /api/lists/:id` – Get list details with cards.
- `PATCH /api/lists/:id` – Update list (body: `{ title?: string, position?: number }`).
- `DELETE /api/lists/:id` – Delete list.

#### Cards (requires authentication + list access)
- `POST /api/lists/:listId/cards` – Create a new card (body: `{ title: string, description?: string }`).
- `GET /api/cards/:id` – Get card details with comments, attachments, and activity log.
- `PATCH /api/cards/:id` – Update card or move between lists (body: `{ title?: string, description?: string, position?: number, listId?: string }`).
- `DELETE /api/cards/:id` – Delete card.

#### Comments (requires authentication + card access)
- `POST /api/cards/:cardId/comments` – Add a comment to a card (body: `{ body: string }`).
- `GET /api/cards/:cardId/comments` – Get all comments for a card.
- `DELETE /api/comments/:id` – Delete a comment (only by author).

### Database & Prisma

To set up the local PostgreSQL database and Prisma schema:

```bash
# From the backend directory
cd backend

# Apply migrations (requires a running PostgreSQL instance and DATABASE_URL)
npx prisma migrate dev --name init

# Seed demo data (user, workspace, board, lists, cards, comments)
npm run prisma:seed
```

### Roadmap

See `REQUIREMENTS.md` and `CHECKLIST.md` (or your project board) for the implementation roadmap:

- Multi-tenant workspaces and RBAC
- Boards, lists, cards, comments, attachments, activity log
- Real-time board updates via Socket.IO
- Comprehensive tests and CI

### Development Guidelines

- Write TypeScript with `strict` mode enabled.  
- Keep routes thin – push logic into services/use-cases.  
- Validate all incoming requests (Zod) and use the central error handler.  
- Prefer small, focused React components with clear props and hooks.