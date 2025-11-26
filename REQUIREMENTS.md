## CollabBoards – Requirements

### 1. Functional Requirements

1.1 Workspaces & Boards  
- The system SHALL support multiple workspaces.  
- Each workspace SHALL have one or more boards.  
- Each board SHALL contain ordered lists; each list SHALL contain ordered cards.

1.2 Cards & Content  
- Each card SHALL have a title, description (rich-text), and metadata (assignee, labels, due date).  
- Each card SHALL support comments with author, timestamp, and text.  
- The system SHOULD support an activity log per card (creation, updates, moves, comments).  
- The system SHOULD support file attachments per card (link or uploaded files).

1.3 Users & Roles  
- Users SHALL authenticate with email and password.  
- Users SHALL belong to one or more workspaces.  
- Users SHALL have a role within each workspace: OWNER, ADMIN, or MEMBER.  
- Permissions SHALL be enforced per workspace based on role.

1.4 Permissions (RBAC)  
- OWNERs SHALL be able to manage workspace settings and members.  
- ADMINs SHALL be able to manage boards and lists within a workspace.  
- MEMBERs SHALL be able to create and edit cards, and comment, within permitted boards.  
- The system SHALL prevent access to workspaces and boards a user is not a member of.

1.5 Real-Time Collaboration  
- The system SHALL update all connected clients in real time when:
  - A card is created, updated, or moved.
  - A comment is added to a card.
- The system SHALL group connections into rooms by workspace and board (e.g., `workspace:{id}`, `board:{id}`).

1.6 API  
- The backend SHALL expose a REST API for workspaces, boards, lists, cards, and comments.  
- The API SHALL support pagination for boards and cards.  
- The API SHALL validate inputs and return standardized error responses.

### 2. Non-Functional Requirements

2.1 Security  
- Passwords SHALL be hashed using a strong one-way hash (e.g., bcrypt).  
- JWT secrets SHALL NOT be committed to version control and SHALL be provided via env vars.  
- All workspace and board access SHALL be scoped by the authenticated user and workspace membership.  

2.2 Performance & Scalability  
- Typical board operations (create/move card, add comment) SHOULD complete within 300 ms under normal load.  
- The system SHOULD handle multiple concurrent users on the same board without inconsistent state.

2.3 Reliability  
- The system SHOULD handle transient DB and network errors gracefully.  
- Critical domain logic (auth, role checks, card movement) SHALL be covered by automated tests.

2.4 Usability  
- The UI SHOULD feel responsive and real-time (no manual refresh needed for board updates).  
- Drag-and-drop within a board SHOULD be intuitive and keyboard-accessible where possible.

2.5 Deployability  
- The frontend SHALL be deployable as a static site (e.g. Vercel) using `npm run build`.  
- The backend SHALL be deployable as a Node/Express service with WebSocket support.  

### 3. Technical Constraints

- Backend MUST use Node.js + Express, PostgreSQL, and JWT for auth.  
- Real-time communication MUST use Socket.IO or WebSockets.  
- Frontend MUST use React + TypeScript.  
- All new code SHOULD pass linting and tests via GitHub Actions CI.