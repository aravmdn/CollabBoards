## CollabBoards – Implementation Checklist

### 1. Project Infrastructure
- [ ] Confirm Node 20+ and npm workspaces installation works (`npm install` at repo root).
- [ ] Add shared ESLint + Prettier configs for backend and frontend.
- [ ] Add `.env.example` files for root, backend, and frontend (document required env vars).

### 2. Data & Multi-Tenancy (PostgreSQL + Prisma/Knex)
- [ ] Choose ORM/Query builder (Prisma or Knex) and install it in `backend`.
- [ ] Configure PostgreSQL connection (connection pool, env vars).
- [ ] Model users, workspaces, workspace memberships (with role), boards, lists, cards, comments, attachments, activity logs.
- [ ] Implement migrations and a seed script with sample data.
- [ ] Ensure all entities are scoped by workspace (no cross-tenant data leakage).

### 3. Auth & RBAC
- [ ] Implement `/auth/register` and `/auth/login` (email + password).
- [ ] Hash passwords with bcrypt, store in DB.
- [ ] Generate access + refresh tokens (JWT) with secure secrets and expiry.
- [ ] Implement `/auth/refresh` and `/auth/logout` endpoints.
- [ ] Implement `isAuthenticated` + `isWorkspaceMember` middleware.
- [ ] Implement role-aware middleware `hasRole('OWNER'|'ADMIN'|'MEMBER')`.
- [ ] Protect workspace/board/card routes with appropriate auth + role checks.

### 4. REST API Design
- [ ] Implement workspace endpoints:
  - [ ] `GET /api/workspaces` (paginated list for current user).
  - [ ] `POST /api/workspaces` (create).
  - [ ] `GET /api/workspaces/:id` (details).
- [ ] Implement board endpoints:
  - [ ] `GET /api/workspaces/:id/boards` (paginated).
  - [ ] `POST /api/workspaces/:id/boards`.
  - [ ] `GET /api/boards/:id`.
  - [ ] `PATCH /api/boards/:id`.
- [ ] Implement list/card endpoints:
  - [ ] `POST /api/boards/:id/lists`.
  - [ ] `PATCH /api/lists/:id`.
  - [ ] `POST /api/lists/:id/cards`.
  - [ ] `PATCH /api/cards/:id` (move between lists, update fields).
- [ ] Implement card comments, attachments, and activity log:
  - [ ] `POST /api/cards/:id/comments`.
  - [ ] `GET /api/cards/:id/comments`.
  - [ ] Stub endpoints for attachments and activities.
- [ ] Add pagination & filtering (query params) to list and card endpoints.

### 5. Validation & Error Handling
- [ ] Define Zod schemas for all request bodies and parameters.
- [ ] Add validation middleware to each route.
- [ ] Normalize error responses (shape, error codes) via central `errorHandler`.
- [ ] Add 404 handler for unknown routes.

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
- [ ] Deploy backend to a host that supports WebSockets (e.g. Railway/Render/Fly).
- [ ] Configure environment variables in the backend host (DB, JWT secrets, CORS).
- [ ] Deploy frontend to Vercel with project root `frontend/`.
- [ ] Set `VITE_BACKEND_URL` on Vercel to point to the backend.
- [ ] Verify real-time updates and auth in production.