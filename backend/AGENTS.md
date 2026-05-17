# AGENTS.md

## Scope

Applies to `backend/`.

## Stack

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- Socket.IO
- multer (file uploads)

## Important Paths

- `src/index.ts`: env validation, HTTP + socket startup
- `src/app.ts`: Express wiring
- `src/routes/`: mounted `/api/*` surface
- `src/services/`: domain logic and query shape (incl. `attachmentService.ts`)
- `src/lib/socketEvents.ts`: broadcast helpers and event-name constants
- `prisma/schema.prisma`: source of truth for data model
- `prisma/migrations/`: committed SQL history
- `prisma/seed.cjs`: local seed data
- `package.json`: `postinstall` and `prisma:generate` own Prisma client generation; build is TS compile only

## Backend Rules

- Keep route comments aligned with real mounted path.
- Keep auth and workspace scoping explicit.
- Add a test before changing route contract or mutation behavior.
- Put business rules in services, not routes.
- When schema changes, update migration and seed in the same pass.
- Real-time events must match REST mutations and `README.md`.
- `cardService.updateCard` renumbers positions atomically when `position` or `listId` is in the input — don't bypass that path for reordering.
- Uploaded files live under `UPLOAD_DIR` (default `backend/uploads/`). Always serve via the authenticated download endpoint; never expose the directory directly.

## Verification

- `npm run build --workspace backend`
- `npm test --workspace backend` (DB-backed integration suite runs on Linux; skipped on Windows due to embedded-postgres)
- Manual smoke with valid env and PostgreSQL
