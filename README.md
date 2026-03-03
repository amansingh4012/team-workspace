# TeamWork — Real-Time Team Collaboration Platform

A full-stack **Kanban-style project management** application built with React, Node.js, PostgreSQL, and WebSockets. Create projects, manage tasks with drag-and-drop, collaborate in real time, and track progress with built-in analytics.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-live-blueviolet)

---

## Features

### Core

- **JWT Authentication** — Register, login, and role-based access (admin/member)
- **Project Management** — CRUD projects, invite members, remove members
- **Kanban Board** — Drag-and-drop task management across To Do / In Progress / Done columns
- **Task Details** — Title, description, priority, assignee, due date, file attachments
- **Activity Log** — Automatic audit trail for every task change

### Real-Time

- **WebSocket Collaboration** — See task changes from other team members instantly
- **Live Activity Timeline** — Slide-in panel showing real-time project activity
- **Toast Notifications** — Immediate feedback when teammates create, update, or delete tasks
- **Exponential Backoff Reconnection** — Auto-reconnect with 1 s → 30 s back-off

### Analytics & Filters

- **Project Analytics Panel** — Circular progress ring, priority pie chart, tasks-per-member bar chart (powered by Recharts)
- **Persistent URL Filters** — Search, priority, and assignee filters are synced to the URL via `useSearchParams`

### Offline Support

- **IndexedDB Caching** — GET responses are transparently cached via `idb-keyval`; stale data is served when offline
- **Mutation Queue** — Failed POST/PUT/DELETE requests are queued in IndexedDB and replayed when the connection returns
- **Offline Banner** — Visual indicator with pending-changes count

### UI / UX

- **Dark / Light Theme** — Toggle with localStorage persistence; CSS cascade overrides for light mode
- **Page Transitions** — Subtle fade-in animation on route changes
- **Skeleton Loaders** — Pulse placeholders while data loads (Dashboard + Board)
- **Confirm Dialog** — Reusable `ConfirmDialog` component for destructive actions
- **Mobile Responsive** — Snap-scroll Kanban columns on small screens, responsive sidebar, hamburger menu
- **Empty States** — Friendly illustrations when there are no projects or tasks

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| **Frontend** | React 19, Vite 7, TailwindCSS v4, Zustand, React Router 7, Recharts, Lucide Icons |
| **Backend** | Node.js, Express 5, Sequelize 6 (ORM), JSON Web Tokens, Multer (uploads) |
| **Database** | PostgreSQL 15+ |
| **Real-Time** | WebSocket (`ws` library), project-room-based broadcasting |
| **Offline** | idb-keyval (IndexedDB), custom mutation queue |
| **Tooling** | Concurrently (monorepo dev), Nodemon, ESLint |

---

## Project Structure

```
team-workspace/
├── package.json              # Root — concurrently dev script
├── backend/
│   ├── .env                  # Environment variables
│   ├── package.json
│   └── src/
│       ├── app.js            # Express app setup
│       ├── server.js         # HTTP + WebSocket server
│       ├── config/           # Sequelize DB config & sync
│       ├── models/           # User, Project, ProjectMember, Task, Activity, …
│       ├── controllers/      # Auth, Project, Task, Analytics controllers
│       ├── routes/           # Express routes (auth, projects, tasks)
│       ├── middlewares/       # JWT auth, role check, error handler
│       └── utils/            # WebSocket broadcast helper
│           └── websocket.js
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx           # Router + OfflineBanner + page transitions
│       ├── index.css          # Tailwind + custom animations + light-mode CSS
│       ├── api/
│       │   ├── axios.js      # Axios instance + offline interceptors
│       │   └── index.js      # All API functions
│       ├── store/
│       │   ├── authStore.js  # Zustand auth state
│       │   └── themeStore.js # Dark / light toggle
│       ├── hooks/
│       │   └── useProjectSocket.js  # WebSocket hook with reconnect
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx        # Sidebar + stats + project grid
│       │   └── ProjectBoardPage.jsx # Kanban board + filters + panels
│       ├── components/
│       │   ├── Layout.jsx
│       │   ├── Navbar.jsx           # Theme toggle
│       │   ├── ProtectedRoute.jsx
│       │   ├── TaskCard.jsx
│       │   ├── AddTaskModal.jsx
│       │   ├── TaskDetailModal.jsx  # Full task editor + ConfirmDialog
│       │   ├── ActivityTimeline.jsx # Slide-in activity panel
│       │   ├── AnalyticsPanel.jsx   # Recharts analytics panel
│       │   ├── ConfirmDialog.jsx    # Reusable confirmation dialog
│       │   └── OfflineBanner.jsx    # Offline indicator + sync status
│       └── utils/
│           ├── helpers.js           # classNames, getInitials, priorityColors
│           └── offlineCache.js      # IndexedDB cache + mutation queue
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 15 (running locally or via Docker)
- **npm** ≥ 9

### 1. Clone & Install

```bash
git clone <repo-url> team-workspace
cd team-workspace
npm run install:all
```

### 2. Configure Environment

Create / edit `backend/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=team_workspace
JWT_SECRET=change_me_to_a_long_random_string
```

### 3. Create the Database

```bash
# In psql or pgAdmin:
CREATE DATABASE team_workspace;
```

### 4. Sync Schema

```bash
cd backend
npm run db:sync
```

### 5. Run Development Servers

From the **root**:

```bash
npm run dev
```

This starts both servers concurrently:

| Service | URL |
|---------|-----|
| Frontend (Vite) | `http://localhost:5173` |
| Backend (Express) | `http://localhost:5000` |
| API proxy | Frontend `/api/*` → Backend |

### 6. Production Build

```bash
npm run build:frontend   # outputs to frontend/dist
cd backend && npm start   # serves API on PORT
```

---

## API Reference

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login → JWT token |
| GET | `/api/auth/me` | Get current user (requires token) |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project details + members |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/members` | Add member |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |
| GET | `/api/projects/:id/analytics` | Project analytics (status, priority, per-member) |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/mine` | My assigned tasks |
| GET | `/api/projects/:id/tasks` | List tasks (filterable) |
| POST | `/api/projects/:id/tasks` | Create task |
| GET | `/api/projects/:id/tasks/:taskId` | Get single task |
| PUT | `/api/projects/:id/tasks/:taskId` | Update task |
| DELETE | `/api/projects/:id/tasks/:taskId` | Delete task |
| PUT | `/api/projects/:id/tasks/reorder` | Bulk reorder (drag & drop) |
| POST | `/api/projects/:id/tasks/:taskId/attachment` | Upload attachment |

### Activities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/activities` | Paginated activity log |

All protected endpoints require `Authorization: Bearer <token>`.

---

## WebSocket Protocol

The server upgrades HTTP connections on the same port (`ws://localhost:5000`).

| Event | Direction | Payload |
|-------|-----------|---------|
| `join` | Client → Server | `{ projectId, token }` |
| `task_update` | Server → Client | `{ action, task, userId, userName }` |
| `activity` | Server → Client | `{ id, action, user, createdAt, … }` |

Clients join a **project room** after authenticating. The server broadcasts task mutations to all room members except the originator.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Backend HTTP + WS port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | — | Database password |
| `DB_NAME` | `team_workspace` | Database name |
| `JWT_SECRET` | — | Secret for signing JWTs |
| `VITE_API_URL` | `/api` | Frontend API base URL (optional) |

---

## Scripts

| Script | Location | Description |
|--------|----------|-------------|
| `npm run dev` | Root | Start both servers concurrently |
| `npm run dev:backend` | Root | Start backend only |
| `npm run dev:frontend` | Root | Start frontend only |
| `npm run install:all` | Root | Install deps for root + backend + frontend |
| `npm run build:frontend` | Root | Production build of frontend |
| `npm run db:sync` | Backend | Sync Sequelize models → PostgreSQL |
| `npm start` | Backend | Start backend in production mode |

---

## License

MIT
