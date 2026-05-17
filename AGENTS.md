# AGENTS.md

## Scope

Applies to the whole repo unless a nested `AGENTS.md` overrides.

## Repo Map

- `backend/`: Express + TypeScript + Prisma + Socket.IO API
- `frontend/`: React + TypeScript + Vite SPA
- `.github/workflows/`: CI definitions
- `README.md`: shipped contract
- `CHECKLIST.md`: implementation ledger
- `REQUIREMENTS.md`: product scope

See nested guidance:

- [backend/AGENTS.md](backend/AGENTS.md)
- [frontend/AGENTS.md](frontend/AGENTS.md)

## Current Reality

- Backend, frontend, lint, and unit tests all green; DB-backed integration tests run in CI on Linux.
- Auth, workspaces, boards, lists, cards, comments, attachments, member management, and live socket updates are all shipped.
- Card descriptions are rich-text (TipTap, sanitized on render).
- Card movement uses drag-and-drop via @dnd-kit; backend reorders positions atomically.
- Prisma migrations committed; parent → child deletes cascade at the DB level.

## Global Rules

- Treat `README.md` as user-facing contract. If code disagrees, fix code or update docs deliberately — never silently.
- Treat `CHECKLIST.md` as status ledger. Update it when implementation status changes.
- Prefer minimal stack churn.
- Keep backend and frontend contracts explicit. If API changes, update docs and client together.
- Before shipping work, run install, lint, tests, backend build, and frontend build.

## Cross-Domain Workflows

- Frontend talks to backend at `VITE_BACKEND_URL`, then `/api/*`.
- Auth uses JWT access + refresh tokens in local storage.
- Real-time uses Socket.IO; the frontend joins workspace and board rooms and refetches on core events.
- Attachment files are stored under `UPLOAD_DIR` (defaults to `backend/uploads/`, gitignored). Production deploys should mount a volume there.
- Prisma schema, migrations, seed data, and route behavior must stay aligned with `README.md` and `CHECKLIST.md`.

## Verification

- Root: `npm install`, `npm run lint`, `npm test`
- Backend: `npm run build --workspace backend`
- Frontend: `npm run build --workspace frontend`
- Smoke with DB: `/api/health`, auth routes, workspace/board flow, frontend comment flow
