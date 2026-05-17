## CollabBoards

CollabBoards is a Trello-style collaboration app with workspaces, boards, lists, cards, comments, and file attachments. Updates broadcast in real time over Socket.IO.

Shipped:

- email/password auth (JWT access + refresh tokens)
- workspaces with role-based members (OWNER / ADMIN / MEMBER)
- boards, lists, cards with inline edit + delete
- card metadata: assignee, labels, due date
- rich-text card descriptions (TipTap, sanitized on render)
- drag-and-drop card movement within and across lists
- file attachments per card (upload, download, delete)
- card comments and activity feed
- live updates over Socket.IO

### Stack

- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL, Socket.IO, multer
- Frontend: React, TypeScript, Vite, Axios, Socket.IO client, @dnd-kit, TipTap, DOMPurify
- CI: install, lint, tests, backend build, frontend build

### Repo Layout

- `backend/`: API, Prisma schema, seed, route + service + integration tests
- `frontend/`: SPA — auth, workspaces, boards, DnD card moves, rich-text editor, attachments
- `.github/workflows/ci.yml`: repository CI gates
- `CHECKLIST.md`: implementation ledger
- `REQUIREMENTS.md`: product requirements

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

### Backend Environment

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | required |
| `JWT_ACCESS_TOKEN_SECRET` | Access token signing secret | required |
| `JWT_REFRESH_TOKEN_SECRET` | Refresh token signing secret | required |
| `FRONTEND_URL` | CORS allowlist (optional) | `http://localhost:5173` |
| `UPLOAD_DIR` | Where attachments are stored on disk | `backend/uploads/` |
| `MAX_UPLOAD_BYTES` | Per-file upload limit | `10485760` (10 MB) |

On Railway, mount a volume at `UPLOAD_DIR` to persist attachments across deploys.

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

Members:

- `GET /api/workspaces/:workspaceId/members`
- `POST /api/workspaces/:workspaceId/members`
- `PATCH /api/workspaces/:workspaceId/members/:memberId`
- `DELETE /api/workspaces/:workspaceId/members/:memberId`

Attachments:

- `GET /api/cards/:cardId/attachments`
- `POST /api/cards/:cardId/attachments` (multipart, field name `file`)
- `GET /api/attachments/:id/download`
- `DELETE /api/attachments/:id`

Card metadata in the contract:

- `assigneeId`
- `labels`
- `dueDate`
- `description` (HTML; sanitized at render time)
- `position` (used for ordering; PATCH with `listId + position` reorders the target list)

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
- `attachment:added`
- `attachment:deleted`

Frontend joins relevant rooms on navigation and refetches board/card state on any event.

### Verification

Repository:

```bash
npm install
npm run lint
npm test
npm run build --workspace backend
npm run build --workspace frontend
```

`npm test --workspace backend` includes a DB-backed integration suite that boots an embedded PostgreSQL instance, applies the committed Prisma migrations, and exercises the auth, workspace, board, list, card, comment, reorder, and cascade-delete flow end-to-end. Embedded PostgreSQL does not run on Windows; on Windows the integration suite is skipped and full coverage runs in CI on Linux.

Manual smoke with configured DB:

- backend `GET /api/health`
- auth register/login/refresh/logout
- workspace create/list
- board create/list/open
- list create
- card create/move
- comment create/list

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
