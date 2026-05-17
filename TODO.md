# CollabBoards — Tracking

All shipped. Keep this list updated as new work arrives.

---

## Frontend — Core UX

- [x] **Logout button** — visible logout action in the header
- [x] **Card metadata UI** — displays `assigneeId`, `labels`, and `dueDate` on the card detail view
- [x] **Activity feed UI** — renders activity log on the card detail view
- [x] **Edit card** — title and description inline edit from the card detail view (PATCH `/api/cards/:id`)
- [x] **Delete card** — delete action from the card detail view (DELETE `/api/cards/:id`)
- [x] **Edit list title** — inline rename for list titles (PATCH `/api/lists/:id`)
- [x] **Delete list** — delete action per list (DELETE `/api/lists/:id`)
- [x] **Edit board title/description** — rename from the board view (PATCH `/api/boards/:id`)
- [x] **Delete board** — delete action from the board view (DELETE `/api/boards/:id`)
- [x] **Edit/delete workspace** — rename and delete workspace from the sidebar (PATCH/DELETE `/api/workspaces/:id`)
- [x] **Workspace member management UI** — invite members, change roles, remove members
- [x] **Drag-and-drop card movement** — @dnd-kit; within list reorder + across-list move; PATCH `/api/cards/:id` with `listId + position`
- [x] **Rich-text card descriptions** — TipTap editor; DOMPurify-sanitized rendering
- [x] **Attachment upload UI** — multipart upload, download, delete on the card detail view

---

## Backend — API

- [x] **Pagination on workspace list** — `page` and `limit` query params on `GET /api/workspaces`
- [x] **Pagination on board list** — `page` and `limit` query params on `GET /api/workspaces/:workspaceId/boards`
- [x] **Position renumbering on card move** — `PATCH /api/cards/:id` with `position` reorders the target list atomically
- [x] **Attachment endpoints** — upload, list (per card), authenticated download, delete
- [x] **Cascade deletes** — workspace → boards → lists → cards → (comments + attachments) cascade in schema

---

## Ops

- [x] **Production smoke test** — lint + tests pass; CI runs full suite on Linux (embedded-postgres skips on Windows)
