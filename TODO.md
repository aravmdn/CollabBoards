# CollabBoards — Remaining Tasks

Check off each item as it is completed. When all items in a section are done, the section is complete.

---

## Frontend — Core UX gaps

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
- [ ] **Workspace member management UI** — invite members, change roles, remove members; all backend endpoints already exist under `/api/workspaces/:workspaceId/members`

---

## Backend — API gaps

- [x] **Pagination on workspace list** — `page` and `limit` query params on `GET /api/workspaces`
- [x] **Pagination on board list** — `page` and `limit` query params on `GET /api/workspaces/:workspaceId/boards`

---

## Deferred features (implement only when explicitly asked)

- [ ] Drag-and-drop card movement
- [ ] Rich-text card editor
- [ ] Attachment upload and management

---

## Ops

- [ ] **Production smoke test** — run `npm run smoke:local` and the production smoke script against a live Railway/Render deployment to confirm end-to-end health
