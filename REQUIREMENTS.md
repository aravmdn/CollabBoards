## CollabBoards - Requirements

### Current Recovery Scope

Recovered and expected now:

- auth with email/password
- workspace list and create
- board list, create, open
- list create
- card create, inspect, simple move
- comments view and create
- board refresh through Socket.IO events
- card metadata fields in backend contract: assignee, labels, due date

Explicitly deferred after this recovery pass:

- rich-text card editor UI
- attachment upload and management
- workspace member management UI
- drag-and-drop movement
- production deployment validation

### 1. Functional Requirements

1.1 Workspaces and Boards
- system SHALL support multiple workspaces
- each workspace SHALL have one or more boards
- each board SHALL contain ordered lists; each list SHALL contain ordered cards

1.2 Cards and Content
- each card SHALL have title, description, and metadata (`assigneeId`, `labels`, `dueDate`)
- each card SHALL support comments with author, timestamp, and text
- system SHOULD support activity log per card
- system SHOULD support file attachments per card
- recovery UI only SHALL display simple description text, not rich-text editor

1.3 Users and Roles
- users SHALL authenticate with email and password
- users SHALL belong to one or more workspaces
- users SHALL have role within each workspace: OWNER, ADMIN, MEMBER
- permissions SHALL be enforced per workspace

1.4 Permissions
- OWNERs SHALL manage workspace settings
- ADMINs SHALL manage boards and lists
- MEMBERs SHALL create and edit cards, and comment
- system SHALL prevent access to workspaces and boards outside membership

1.5 Real-Time Collaboration
- system SHALL update connected clients when card is created, updated, moved
- system SHALL update connected clients when comment is added or deleted
- system SHALL group connections into `workspace:{id}` and `board:{id}` rooms
- recovery frontend MAY refetch board state instead of applying granular optimistic patches

1.6 API
- backend SHALL expose REST API for workspaces, boards, lists, cards, comments
- API SHALL support pagination for workspaces and boards
- API SHALL validate inputs and return standardized error responses

### 2. Non-Functional Requirements

2.1 Security
- passwords SHALL be hashed
- JWT secrets SHALL live in env vars
- workspace and board access SHALL be scoped by authenticated membership

2.2 Reliability
- critical domain logic SHOULD stay covered by automated tests
- route mount regressions SHALL have automated coverage

2.3 Usability
- UI SHOULD feel responsive and real-time for recovered core flow
- drag-and-drop SHOULD be considered backlog, not shipped claim

2.4 Deployability
- frontend SHALL build with `npm run build --workspace frontend`
- backend SHALL build with `npm run build --workspace backend`
- CI SHOULD enforce lint, tests, and both builds

### 3. Technical Constraints

- backend MUST stay Node.js + Express + PostgreSQL + Prisma + JWT
- real-time MUST stay Socket.IO or WebSockets
- frontend MUST stay React + TypeScript
