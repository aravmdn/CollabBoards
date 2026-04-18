# CLAUDE.md — CollabBoards

Guidance for Claude Code when working in this repo alongside Arav.

## What This Project Is

CollabBoards is a Trello-style collaboration platform. Users belong to workspaces, create boards with lists and cards, add comments, and see changes reflected live via Socket.IO. The codebase is a Node.js + React monorepo on npm workspaces, deployed to Railway.

## Tech Stack

| Layer | Stack |
|---|---|
| Backend | Node.js 20, Express 4, TypeScript, Prisma 5, PostgreSQL |
| Auth | JWT — 15m access token + 7d refresh token, bcryptjs hashing |
| Real-time | Socket.IO 4 (server + client) |
| Frontend | React 18, Vite 5, TypeScript, Axios |
| Testing | Backend: Jest + ts-jest · Frontend: Vitest + RTL |
| CI | GitHub Actions (install → lint → test → build both) |
| Deploy | Railway via Nixpacks; `start:railway` applies migrations then starts server |

## Repo Layout

```
CollabBoards/
├── backend/src/
│   ├── routes/         # Express route handlers (thin — delegate to services)
│   ├── services/       # Business logic lives here, not in routes
│   ├── middleware/     # auth.ts (JWT), rbac.ts (roles), errorHandler.ts
│   ├── lib/            # prisma.ts, socket.ts, socketEvents.ts
│   └── config/jwt.ts
├── backend/prisma/
│   ├── schema.prisma   # Single source of truth for the data model
│   └── migrations/     # Committed; never edit manually
├── frontend/src/
│   ├── App.tsx         # All UI flows (large file; refactor carefully)
│   ├── lib/api.ts      # Axios instance + refresh-token interceptor
│   ├── lib/socket.ts   # Socket.IO singleton
│   └── hooks/          # useAuth.ts, useSocket.ts
├── scripts/            # production-smoke.mjs, local-smoke-runner.mjs
├── .github/workflows/ci.yml
├── AGENTS.md           # Global dev rules (read this too)
├── CHECKLIST.md        # Implementation status ledger — keep updated
├── REQUIREMENTS.md     # Product scope + deferred items
└── README.md           # User-facing API contract
```

## Key Conventions

**Backend**
- Business logic belongs in `services/`, not routes.
- Every data-access query must be tenant-scoped. `accessControl.ts` enforces this — do not bypass it.
- Zod validation on all write paths. Add a schema before adding a new route.
- When you add a route, add a corresponding mount test in `routes/mounts.test.ts`.
- Socket broadcasts happen in services after DB writes, via `broadcastToBoard()` / `broadcastToWorkspace()` in `socketEvents.ts`.
- Schema changes require a new migration (`npx prisma migrate dev --name <description> --schema backend/prisma/schema.prisma`). Never edit migration files after they're committed.

**Frontend**
- All API calls go through `frontend/src/lib/api.ts` (the Axios instance with auth headers and refresh logic). Never call `fetch` or a raw `axios` directly.
- Socket events trigger a full refetch, not optimistic updates — keep it simple unless Arav explicitly asks to change this.
- `App.tsx` is large. When adding UI, try to extract components rather than growing the file.
- No hardcoded/mock data. Everything comes from the API.

**General**
- `README.md` is the user-facing API contract. If code diverges from it, fix code or update docs deliberately — never silently.
- Update `CHECKLIST.md` when an item's status changes.
- Run `npm run lint` and `npm test` before calling any code task done.
- Do not introduce drag-and-drop, rich-text editing, or attachment upload UI — these are explicitly deferred per `REQUIREMENTS.md`.

## Environment Variables

**Backend** (`backend/.env`, see `backend.env.example`)
```
PORT=4000
DATABASE_URL=postgresql://...
JWT_ACCESS_TOKEN_SECRET=...
JWT_REFRESH_TOKEN_SECRET=...
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`, see `frontend.env.example`)
```
VITE_BACKEND_URL=http://localhost:4000
```

## Local Dev

```bash
npm install                    # install all workspaces
# set up backend/.env and frontend/.env
npx prisma migrate deploy --schema backend/prisma/schema.prisma
npm run prisma:seed --workspace backend   # optional demo data
npm run dev:backend            # port 4000
npm run dev:frontend           # port 5173
```

## Verification Before Shipping

```bash
npm run lint
npm test
npm run build --workspace backend
npm run build --workspace frontend
npm run smoke:local            # smoke test with embedded DB
```

## What's Not Done Yet

From `CHECKLIST.md` — open items:
- Member management endpoints and UI
- Drag-and-drop card movement
- Rich-text card editor
- Attachment upload UI

Don't implement these unless Arav explicitly asks.

## Data Model Quick Reference

`User` → `WorkspaceMember` (role: OWNER | ADMIN | MEMBER) → `Workspace` → `Board` → `List` → `Card` → `Comment`

Cards also have: `assigneeId`, `labels` (string[]), `dueDate`.

## RBAC Summary

- `MEMBER`: read boards/cards/comments, create cards/comments
- `ADMIN`: + update/delete boards, lists, cards
- `OWNER`: + delete workspace, manage members

Enforced in `middleware/rbac.ts` via `requireWorkspaceRole`, `requireBoardRole`, etc.

## Socket.IO Rooms & Events

Rooms: `workspace:{id}`, `board:{id}`

Backend emits: `board:created/updated/deleted`, `list:created/updated/deleted`, `card:created/updated/moved/deleted`, `comment:added/deleted`

Frontend joins rooms on navigation and refetches on any event.
