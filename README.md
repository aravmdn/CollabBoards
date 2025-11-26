## CollabBoards

A Trello + Notion style real-time collaboration tool. Teams create **workspaces → boards → lists → cards**, and each card can have a mini rich-text doc and comments. All updates are pushed in real time to everyone on the board.

### Tech Stack

- **Backend**: Node.js, Express, TypeScript  
- **Database**: PostgreSQL + Prisma ORM  
- **Auth**: JWT access + refresh tokens (email/password)  
- **Real-time**: Socket.IO with rooms for `workspace:{id}` and `board:{id}`  
- **Frontend**: React, TypeScript, Vite  
- **CI**: GitHub Actions (tests and lint on push/PR)

### Project Structure

- `backend/` – Express API, auth, RBAC, Socket.IO, database layer  
- `frontend/` – React + Vite SPA for boards and card docs  
- `.github/workflows/ci.yml` – CI pipeline (Node setup, tests)

### Getting Started (Local)

```bash
# Install dependencies (root, using npm workspaces)
npm install

# Backend (Node/Express + Socket.IO)
npm run dev:backend

# Frontend (React + Vite)
npm run dev:frontend
```

By default:
- Backend listens on `http://localhost:4000`
- Frontend listens on `http://localhost:5173`

You can override the backend URL in the frontend via:

```bash
VITE_BACKEND_URL="http://localhost:4000"
```

### Deployment

#### Frontend (Vercel)

- Project root: `frontend/`  
- Build command: `npm install && npm run build`  
- Output directory: `dist`  
- Env vars:
  - `VITE_BACKEND_URL` – URL of the deployed backend (with HTTPS).

#### Backend (Node host with WebSockets)

- Deploy the `backend/` app to a service that supports long-lived Node processes and WebSockets.  
- Required env vars (draft):
  - `PORT` – HTTP port.
  - `DATABASE_URL` – PostgreSQL connection string.
  - `JWT_ACCESS_TOKEN_SECRET`
  - `JWT_REFRESH_TOKEN_SECRET`

### Roadmap

See `REQUIREMENTS.md` and `CHECKLIST.md` (or your project board) for the implementation roadmap:

- Multi-tenant workspaces and RBAC
- Boards, lists, cards, comments, attachments, activity log
- Real-time board updates via Socket.IO
- Comprehensive tests and CI

### Development Guidelines

- Write TypeScript with `strict` mode enabled.  
- Keep routes thin – push logic into services/use-cases.  
- Validate all incoming requests (Zod) and use the central error handler.  
- Prefer small, focused React components with clear props and hooks.