# AGENTS.md

## Scope

Applies to `frontend/`.

## Stack

- React
- TypeScript
- Vite
- Axios
- Socket.IO client

## Important Paths

- `src/App.tsx`: recovered core flow UI
- `src/lib/api.ts`: backend base URL and auth header wiring
- `src/lib/socket.ts`: singleton socket client
- `src/hooks/useAuth.ts`: token lifecycle
- `src/hooks/useSocket.ts`: socket wrapper
- `src/App.test.tsx`: current UI regression tests

## Frontend Rules

- No fake data in shipped path.
- Keep API paths aligned with backend contract.
- Keep socket refresh simple and explicit.
- Prefer accessible labels on forms and card actions.
- Keep UI scope honest. Do not imply rich-text, attachments, or drag-drop if not present.

## Recovery Status

- Login/register flow present.
- Workspace and board selection present.
- Lists, cards, comments render from live API.
- Simple move-card action present.
- Socket events trigger board refresh.
- UI tests present for auth screen and logged-in board flow.

## Verification

- `npm run lint --workspace frontend`
- `npm test --workspace frontend`
- `npm run build --workspace frontend`
- Browser smoke against local backend
