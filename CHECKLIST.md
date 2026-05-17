## CollabBoards - Implementation Checklist

### 1. Project Infrastructure
- [x] Confirm Node 20+ and npm workspaces installation works (`npm install` at repo root).
- [x] Add shared ESLint config for backend and frontend.
- [x] Keep backend and frontend env examples committed.

### 2. Data and Multi-Tenancy
- [x] Prisma chosen and wired to PostgreSQL.
- [x] Users, workspaces, memberships, boards, lists, cards, comments, attachments, activity logs modeled.
- [x] Card metadata in schema: assignee, labels, due date.
- [x] Seed script exists and matches current schema.
- [x] Prisma migrations committed.
- [x] Parent → child cascade deletes enforced at the database layer.
- [x] Attachment metadata columns: `mimeType`, `size`, `uploadedById`.

### 3. Auth and RBAC
- [x] `/api/auth/register`
- [x] `/api/auth/login`
- [x] `/api/auth/refresh`
- [x] `/api/auth/logout`
- [x] `isAuthenticated`
- [x] workspace membership checks
- [x] workspace role checks for workspace update/delete
- [x] member management endpoints and UI

### 4. REST API Contract
- [x] `/api/workspaces*` routes mounted and tested
- [x] `/api/workspaces/:workspaceId/boards` routes mounted and tested
- [x] `/api/boards/:id` routes mounted and tested
- [x] `/api/boards/:boardId/lists` route mounted and tested
- [x] `/api/lists/:id` routes mounted and tested
- [x] `/api/lists/:listId/cards` route mounted and tested
- [x] `/api/cards/:id` routes mounted and tested
- [x] `/api/cards/:cardId/comments` routes mounted and tested
- [x] `/api/comments/:id` route mounted and tested
- [x] `/api/cards/:cardId/attachments` routes mounted and tested
- [x] `/api/attachments/:id` (download + delete) routes mounted and tested

### 5. Validation and Errors
- [x] Zod request validation on core write paths
- [x] central error handler
- [x] API 404 fallback

### 6. Real-Time
- [x] socket auth
- [x] workspace and board rooms
- [x] list/card/comment broadcasts on core mutations
- [x] attachment broadcasts on upload/delete
- [x] frontend board refresh on socket events
- [x] dedicated socket smoke test

### 7. Frontend Core Flow
- [x] login/register screen
- [x] auth persistence in local storage
- [x] workspace selection
- [x] board selection
- [x] board view with real lists and cards
- [x] create workspace
- [x] create board
- [x] create list
- [x] create card
- [x] comment view and create
- [x] drag-and-drop card movement (within and across lists)
- [x] rich-text card description editor with sanitized rendering
- [x] attachment upload, download, delete UI

### 8. Tests and CI
- [x] backend Jest + ts-jest config
- [x] backend route mount regression tests
- [x] backend service behavior tests
- [x] frontend Vitest render flow tests
- [x] CI runs install, lint, tests, backend build, frontend build
- [x] DB-backed integration tests for auth, workspace, board, card, comment, reorder, cascade-delete flow

### 9. Deployment and Ops
- [x] backend build works for Railway-style start
- [x] Railway backend deploy path applies committed Prisma migrations before startup
- [x] frontend production build works
- [x] local DB runbook documented
- [x] production-style auth and socket verification command
- [x] `UPLOAD_DIR` env var documented for attachment storage location
