## CollabBoards - Requirements

### Scope

Shipped:

- email/password authentication
- workspace list, create, rename, delete
- board list, create, open, rename, delete
- list create, rename, delete
- card create, edit, delete, move (drag-and-drop and across-list)
- rich-text card descriptions (TipTap; sanitized on render)
- card metadata: `assigneeId`, `labels`, `dueDate`
- comments view and create
- per-card file attachments (upload, download, delete)
- per-card activity feed
- workspace member management UI (invite, change role, remove)
- real-time refresh through Socket.IO events

### 1. Functional Requirements

1.1 Workspaces and Boards
- system SHALL support multiple workspaces
- each workspace SHALL have one or more boards
- each board SHALL contain ordered lists; each list SHALL contain ordered cards

1.2 Cards and Content
- each card SHALL have title, description, and metadata (`assigneeId`, `labels`, `dueDate`)
- each card SHALL support comments with author, timestamp, and text
- each card SHALL support an activity log
- each card SHALL support file attachments (upload, download, delete)
- card descriptions SHALL accept rich text (HTML) and SHALL be sanitized before rendering

1.3 Users and Roles
- users SHALL authenticate with email and password
- users SHALL belong to one or more workspaces
- users SHALL have a role within each workspace: OWNER, ADMIN, MEMBER
- permissions SHALL be enforced per workspace

1.4 Permissions
- OWNERs SHALL manage workspace settings and members
- ADMINs SHALL manage boards and lists
- MEMBERs SHALL create and edit cards, comment, and upload attachments
- system SHALL prevent access to workspaces and boards outside membership

1.5 Real-Time Collaboration
- system SHALL update connected clients when a card is created, updated, moved, or deleted
- system SHALL update connected clients when a comment is added or deleted
- system SHALL update connected clients when an attachment is added or deleted
- system SHALL group connections into `workspace:{id}` and `board:{id}` rooms

1.6 API
- backend SHALL expose REST API for workspaces, boards, lists, cards, comments, attachments
- API SHALL support pagination for workspaces and boards
- API SHALL validate inputs and return standardized error responses

### 2. Non-Functional Requirements

2.1 Security
- passwords SHALL be hashed
- JWT secrets SHALL live in env vars
- workspace and board access SHALL be scoped by authenticated membership
- uploaded files SHALL be served only via authenticated download endpoint, never directly

2.2 Reliability
- critical domain logic SHALL be covered by automated tests
- route mount regressions SHALL have automated coverage
- destructive parent deletes (workspace/board/list/card) SHALL cascade cleanly to children

2.3 Usability
- UI SHALL feel responsive and real-time
- drag-and-drop card movement SHALL be supported

2.4 Deployability
- frontend SHALL build with `npm run build --workspace frontend`
- backend SHALL build with `npm run build --workspace backend`
- CI SHALL enforce lint, tests, and both builds

### 3. Technical Constraints

- backend MUST stay Node.js + Express + PostgreSQL + Prisma + JWT
- real-time MUST stay Socket.IO or WebSockets
- frontend MUST stay React + TypeScript
