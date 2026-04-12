## CollabBoards

CollabBoards is a recovery-stage collaboration app. Current shipped flow covers:

- email/password auth with JWT access + refresh tokens
- workspace list and board list
- board view with real lists and cards
- card comments and activity feed
- board refresh through Socket.IO events

Current non-goals for this recovery pass:

- rich-text card editor UI
- attachment upload UI
- member management UI
- drag-and-drop card movement
- automated deploy execution

Current deployment behavior:

- Railway backend start applies committed Prisma migrations before launching the API server.

### Stack

- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL, Socket.IO
- Frontend: React, TypeScript, Vite, Axios, Socket.IO client
- CI: install, lint, tests, backend build, frontend build

### Repo Layout

- `backend/`: API, Prisma schema, seed, route tests, service tests
- `frontend/`: SPA for auth, workspace, board, card comments
- `.github/workflows/ci.yml`: repository CI gates
- `CHECKLIST.md`: implementation ledger
- `REQUIREMENTS.md`: product requirements plus deferred items

### Local Setup

1. Install packages:

```bash
npm install
```

2. Copy env examples:

```bash
copy backend.env.example backend\.env
copy frontend.env.example frontend\.env
```

3. Provide PostgreSQL in `backend/.env` via `DATABASE_URL`.

Optional Docker path if Docker exists on your machine:

```bash
docker run --name collabboards-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=collabboards -p 5432:5432 -d postgres:16
```

Then use:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/collabboards
```

4. Apply committed migrations and seed demo data:

```bash
npx prisma migrate deploy --schema backend/prisma/schema.prisma
npm run prisma:seed --workspace backend
```

Seed login after this step:

- email: `demo@collabboards.local`
- password: `demo12345`

5. Run backend and frontend:

```bash
npm run dev:backend
npm run dev:frontend
```

Defaults:

- backend: `http://localhost:4000`
- frontend: `http://localhost:5173`
- frontend backend origin override: `VITE_BACKEND_URL=http://localhost:4000`

### API Contract

All routes live under `/api`.

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Workspaces:

- `GET /api/workspaces`
- `POST /api/workspaces`
- `GET /api/workspaces/:workspaceId`
- `PATCH /api/workspaces/:workspaceId`
- `DELETE /api/workspaces/:workspaceId`

Boards:

- `GET /api/workspaces/:workspaceId/boards`
- `POST /api/workspaces/:workspaceId/boards`
- `GET /api/boards/:id`
- `PATCH /api/boards/:id`
- `DELETE /api/boards/:id`

Lists:

- `POST /api/boards/:boardId/lists`
- `GET /api/lists/:id`
- `PATCH /api/lists/:id`
- `DELETE /api/lists/:id`

Cards:

- `POST /api/lists/:listId/cards`
- `GET /api/cards/:id`
- `PATCH /api/cards/:id`
- `DELETE /api/cards/:id`

Comments:

- `POST /api/cards/:cardId/comments`
- `GET /api/cards/:cardId/comments`
- `DELETE /api/comments/:id`

Card metadata now supported in backend and frontend display:

- `assigneeId`
- `labels`
- `dueDate`

### Real-Time Contract

Socket.IO rooms:

- `workspace:{id}`
- `board:{id}`

Client events:

- `join-workspace`
- `leave-workspace`
- `join-board`
- `leave-board`

Server events:

- `board:created`
- `board:updated`
- `board:deleted`
- `list:created`
- `list:updated`
- `list:deleted`
- `card:created`
- `card:updated`
- `card:moved`
- `card:deleted`
- `comment:added`
- `comment:deleted`

Frontend currently reacts by refetching workspace board data and selected card data.

### Verification

Repository:

```bash
npm install
npm run lint
npm test
npm run build --workspace backend
npm run build --workspace frontend
```

`npm test --workspace backend` now includes a DB-backed integration suite for the auth, workspace, board, card, and comment flow by booting an embedded PostgreSQL instance and applying the committed Prisma migrations.

Manual smoke with configured DB:

- backend `GET /api/health`
- auth register/login/refresh/logout
- workspace create/list
- board create/list/open
- list create
- card create/move
- comment create/list
- frontend login, workspace select, board open, comment post

Automated production-style smoke:

```bash
npm run smoke -- --backend-url https://your-backend.example.com --frontend-url https://your-frontend.example.com
```

This command:

- checks `GET /api/health`
- registers a disposable user, then exercises login, refresh, and logout
- creates and refetches workspace, board, list, card, and comment data over REST
- joins `workspace:{id}` and `board:{id}` Socket.IO rooms
- verifies board/card refresh after `board:created`, `list:created`, `card:created`, `card:moved`, and `comment:added`
- cleans up the disposable board, list, card, and comment data it created

Local production-style proof:

```bash
npm run build --workspace backend
npm run build --workspace frontend
npm run smoke:local
```

`smoke:local` starts a temporary embedded PostgreSQL instance, applies committed Prisma migrations, boots the backend from `dist/`, serves the built frontend with `vite preview`, and runs the same smoke flow against those local URLs.

Deployment note:

- Railway uses `npm run start:railway --workspace backend`, which runs `prisma migrate deploy` before `node dist/index.js`.

### Known Gaps

- No attachment upload route or UI recovery.
- No rich-text editor recovery.
- Card move UI is simple button-based step, not drag-and-drop.
- No deployment job runs the smoke command automatically yet.
