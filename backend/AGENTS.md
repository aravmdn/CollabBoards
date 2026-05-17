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

## Important Paths

- `src/index.ts`: env validation, HTTP + socket startup
- `src/app.ts`: Express wiring
- `src/routes/`: mounted `/api/*` surface
- `src/services/`: domain logic and query shape
- `src/lib/socketEvents.ts`: broadcast helpers
- `prisma/schema.prisma`: source of truth for data model
- `prisma/migrations/`: committed SQL history
- `prisma/seed.cjs`: local seed data
- `package.json`: `postinstall` and `prisma:generate` own Prisma client generation; build is TS compile only

## Backend Rules

- Keep route comments aligned with real mounted path.
- Keep auth and workspace scoping explicit.
- Add test before changing route contract or mutation behavior.
- Put business rules in services, not routes.
- When schema changes, update migration and seed in same pass.
- Real-time events must match REST mutations and README.

## Recovery Status

- Route prefix drift fixed for documented core REST paths.
- Card metadata fields present in schema and route validation.
- Jest route/service tests present.
- DB-backed integration tests still missing.

## Verification

- `npm run build --workspace backend`
- `npm test --workspace backend`
- Manual smoke with valid env and PostgreSQL
