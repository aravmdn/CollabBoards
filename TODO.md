# CollabBoards — Remaining Tasks

Check off each item as it is completed. When all items in a section are done, the section is complete.

---

## Frontend — Core UX gaps

- [ ] **Logout button** — add a visible logout action in the UI; the JWT/refresh logic already works, there is just no UX trigger
- [ ] **Card metadata UI** — display and edit `assigneeId`, `labels`, and `dueDate` on the card detail view (fields exist in the DB and API)
- [ ] **Activity feed UI** — render the activity log on the card detail view; the API already returns `CARD_CREATED`, `CARD_MOVED`, and `COMMENT_ADDED` entries in `card.activities`
- [ ] **Edit card** — title and description inline edit from the card detail view (PATCH `/api/cards/:id` exists)
- [ ] **Delete card** — delete action from the card detail view (DELETE `/api/cards/:id` exists)
- [ ] **Edit list title** — inline rename for list titles (PATCH `/api/lists/:id` exists)
- [ ] **Delete list** — delete action per list (DELETE `/api/lists/:id` exists)
- [ ] **Edit board title/description** — rename from the board view (PATCH `/api/boards/:id` exists)
- [ ] **Delete board** — delete action from the board view (DELETE `/api/boards/:id` exists)
- [ ] **Edit/delete workspace** — rename and delete workspace from the workspace view (PATCH/DELETE `/api/workspaces/:id` exists)
- [ ] **Workspace member management UI** — invite members, change roles, remove members; all backend endpoints already exist under `/api/workspaces/:workspaceId/members`

---

## Backend — API gaps

- [ ] **Pagination on workspace list** — add `page` and `limit` query params to `GET /api/workspaces`; required by §1.6 of REQUIREMENTS.md
- [ ] **Pagination on board list** — add `page` and `limit` query params to `GET /api/workspaces/:workspaceId/boards`

---

## Deferred features (implement only when explicitly asked)

- [ ] Drag-and-drop card movement
- [ ] Rich-text card editor
- [ ] Attachment upload and management

---

## Ops

- [ ] **Production smoke test** — run `npm run smoke:local` and the production smoke script against a live Railway/Render deployment to confirm end-to-end health
