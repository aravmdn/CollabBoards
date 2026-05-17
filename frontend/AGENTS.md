# AGENTS.md

## Scope

Applies to `frontend/`.

## Stack

- React
- TypeScript
- Vite
- Axios
- Socket.IO client
- @dnd-kit (sortable cards)
- TipTap + DOMPurify (rich-text card descriptions)

## Important Paths

- `src/App.tsx`: top-level shell, layout, board + card-detail wiring
- `src/components/BoardView.tsx`: drag-and-drop lists/cards
- `src/components/RichTextEditor.tsx`: TipTap editor + sanitized read view
- `src/components/CardAttachments.tsx`: upload, download, delete UI
- `src/components/WorkspaceMembers.tsx`: invite / role-change / remove
- `src/lib/api.ts`: backend base URL and auth header wiring (use this — never raw `axios` or `fetch`)
- `src/lib/socket.ts`: singleton socket client, event-name constants
- `src/hooks/useAuth.ts`: token lifecycle
- `src/hooks/useSocket.ts`: socket wrapper
- `src/App.test.tsx`: UI regression tests

## Frontend Rules

- Route every API call through `src/lib/api.ts` so auth headers and refresh logic apply.
- No fake or hard-coded data in shipped components — everything comes from the API.
- Socket events trigger refetches, not optimistic in-place mutations (the one exception: `BoardView` optimistically reorders cards locally and rolls back on API failure).
- Keep socket event names aligned with `backend/src/lib/socketEvents.ts`.
- Card descriptions are HTML. Always render via `RichTextView` so DOMPurify sanitizes them.
- Attachments must be served through `/api/attachments/:id/download` (auth-scoped blob fetch), not direct file URLs.

## Verification

- `npm run lint --workspace frontend`
- `npm test --workspace frontend`
- `npm run build --workspace frontend`
- Browser smoke against local backend
