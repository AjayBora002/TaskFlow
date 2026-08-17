# TaskFlow

A focused project & task management tool for small teams. Built with React (Vite) + Node.js/Express + MongoDB.

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### 1. Set up the server

```bash
cd server
npm install
cp .env.example .env
# Edit .env — set your MONGO_URI and JWT_SECRET
```

### 2. Set up the client

```bash
cd client
npm install
```

### 3. Run in development

**Terminal 1 — Server:**
```bash
cd server
npm run dev   # starts on :5000
```

**Terminal 2 — Client:**
```bash
cd client
npm run dev   # starts on :5173, proxies /api to :5000
```

### 4. Seed demo data (optional)

With the server running and `.env` configured:
```bash
cd server
npm run seed
```

Demo credentials:
- `alex@taskflow.dev` / `password123`
- `jamie@taskflow.dev` / `password123`

---

## Deployment

### Backend → Render
1. Connect your GitHub repo to Render
2. Set build command: `npm install`
3. Set start command: `node server.js`
4. Add env vars: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (your Vercel URL), `PORT=10000`

### Frontend → Vercel
1. Connect your GitHub repo to Vercel
2. Set root directory to `client`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add env var: `VITE_API_URL` (your Render service URL, if not using proxy)

> **Note for production**: Update `client/src/api/axios.js` to use `import.meta.env.VITE_API_URL` as the `baseURL` instead of the `/api` proxy path.

---

## Features

- **Auth** — JWT-based register/login, protected routes
- **Projects** — create, list, add/remove members by email
- **Tasks** — create/edit/delete with title, description, assignee, priority, due date, status
- **Kanban board** — drag-and-drop with enforced status transitions (To Do → In Progress → In Review → Done)
- **Comments** — threaded comments on task detail view
- **Notifications** — in-app bell with 15s polling, mark as read
- **Dashboard** — per-project stats via MongoDB aggregation pipeline

## Status Transition Rules
Tasks must advance through each stage. You cannot jump from **To Do → Done** directly. Allowed transitions:
- To Do → In Progress ✓
- In Progress → In Review ✓  
- In Review → Done ✓
- Any backward step ✓ (regression allowed)

## Design
- Palette: graphite/slate base (`#1C2128`) + teal accent (`#2F9E6F`)
- Fonts: DM Sans (UI) + JetBrains Mono (metadata)
- Signature detail: 3px left status stripe on every task card
