## CollabBoards – Implementation Checklist

### 1. Project Infrastructure
- [x] Confirm Node 20+ and npm workspaces installation works (`npm install` at repo root).
- [x] Add shared ESLint + Prettier configs for backend and frontend.
- [x] Add `.env.example` files for root, backend, and frontend (document required env vars).

### 2. Data & Multi-Tenancy (PostgreSQL + Prisma/Knex)
- [x] Choose ORM/Query builder (Prisma or Knex) and install it in `backend` (Prisma).
- [x] Configure PostgreSQL connection (connection pool, env vars) via Prisma `DATABASE_URL`.
- [x] Model users, workspaces, workspace memberships (with role), boards, lists, cards, comments, attachments, activity logs (Prisma schema).
- [x] Implement a seed script with sample data (`npm run prisma:seed`).
- [ ] Ensure all entities are scoped by workspace (no cross-tenant data leakage).

### 3. Auth & RBAC
- [x] Implement `/auth/register` and `/auth/login` (email + password).
- [x] Hash passwords with bcrypt, store in DB.
- [x] Generate access + refresh tokens (JWT) with secure secrets and expiry.
- [x] Implement `/auth/refresh` and `/auth/logout` endpoints.
- [x] Implement `isAuthenticated` + `isWorkspaceMember` middleware.
- [x] Implement role-aware middleware `hasRole('OWNER'|'ADMIN'|'MEMBER')`.
- [x] Protect workspace/board/card routes with appropriate auth + role checks.

### 4. REST API Design
- [x] Implement workspace endpoints:
  - [x] `GET /api/workspaces` (paginated list for current user).
  - [x] `POST /api/workspaces` (create).
  - [x] `GET /api/workspaces/:id` (details).
- [x] Implement board endpoints:
  - [x] `GET /api/workspaces/:id/boards` (paginated).
  - [x] `POST /api/workspaces/:id/boards`.
  - [x] `GET /api/boards/:id`.
  - [x] `PATCH /api/boards/:id`.
- [x] Implement list/card endpoints:
  - [x] `POST /api/boards/:id/lists`.
  - [x] `PATCH /api/lists/:id`.
  - [x] `POST /api/lists/:id/cards`.
  - [x] `PATCH /api/cards/:id` (move between lists, update fields).
- [x] Implement card comments, attachments, and activity log:
  - [x] `POST /api/cards/:id/comments`.
  - [x] `GET /api/cards/:id/comments`.
  - [x] Activity log automatically created for card operations (create, update, move, comment).
- [x] Add pagination & filtering (query params) to list and card endpoints.

### 5. Validation & Error Handling
- [x] Define Zod schemas for all request bodies and parameters.
- [x] Add validation middleware to each route.
- [x] Normalize error responses (shape, error codes) via central `errorHandler`.
- [x] Add 404 handler for unknown routes.

### 6. Real-Time (Socket.IO)
- [ ] Define room naming conventions (`workspace:{id}`, `board:{id}`) clearly.
- [ ] Authenticate socket connections (JWT on connection or via auth event).
- [ ] On card move / title change / new comment:
  - [ ] Broadcast events to relevant `board:{id}` room.
  - [ ] Optionally broadcast high-level updates to `workspace:{id}` room.
- [ ] Ensure real-time events respect RBAC and workspace membership.

### 7. Frontend – UX & State Management
- [ ] Configure API client with base URL + auth headers.
- [ ] Implement login/register pages and auth state.
- [ ] Implement workspace selection and board list view.
- [ ] Implement board view with columns/lists and draggable cards (Trello-style).
- [ ] Implement card details pane: mini rich-text doc, comments, activity feed.
- [ ] Wire Socket.IO client to live-update board when events are received.

### 8. Testing & CI
- [ ] Configure Jest + ts-jest for backend unit tests.
- [ ] Add unit tests for services (e.g., createBoard, moveCard).
- [ ] Add integration tests (Supertest) for critical endpoints.
- [ ] Configure Vitest for basic frontend tests.
- [ ] Ensure GitHub Actions CI runs tests and lints for both workspaces.

### 9. Deployment
- [x] Deploy backend to a host that supports WebSockets (e.g. Railway/Render/Fly).
- [x] Configure environment variables in the backend host (DB, JWT secrets, CORS).
- [ ] Deploy frontend to Vercel with project root `frontend/`.
- [ ] Set `VITE_BACKEND_URL` on Vercel to point to the backend.
- [ ] Verify real-time updates and auth in production.