# 🚀 TaskFlow

A modern, full-stack, AI-powered project & task management platform for teams. Built with React (Vite), Node.js, Express, MongoDB, WebSockets, and Google Gemini AI.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-AI-8E75B2?logo=google)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel)

---

## ✨ Features

### 📋 Kanban Board & Task Management
- **Visual Drag & Drop**: Fluid task movement across `To Do`, `In Progress`, `In Review`, and `Done` columns.
- **Enforced Workflow Rules**: Prevents invalid status jumps (e.g. `To Do` directly to `Done`).
- **Rich Task Metadata**: Priorities (`Low`, `Medium`, `High`, `Urgent`), assignees, due dates, and rich descriptions.
- **Celebration Effects**: Confetti animations on task completion.

### ⚡ Real-Time Collaboration
- **WebSockets (Socket.io)**: Live task movements, updates, and creation across connected team members.
- **Active Presence**: Room-based presence indicators showing online colleagues on the project board.

### 🤖 AI-Powered Productivity (Google Gemini)
- **AI Copilot & Command Bar**: Natural language prompt assistant to break down complex goals into actionable tasks.
- **AI Audit Panel**: Automated risk detection, workload imbalance warnings, and bottleneck insights.
- **AI Daily Digest**: Smart project summaries highlighting completed milestones and urgent priorities.

### 👥 Team & Access Control
- **Member Management**: Invite colleagues by email and manage team access.
- **Role-Based Controls**: Project owner vs team member permissions for settings, invitations, and project deletion.

### 🔒 Security & Performance
- **JWT Authentication**: Secure token-based user authentication.
- **Security Headers & Sanitization**: Helmet headers, NoSQL query sanitization (`express-mongo-sanitize`), and rate limiting (`express-rate-limit`).

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, `@hello-pangea/dnd`, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express, Mongoose (MongoDB Atlas), Socket.io, JWT, Helmet.
- **AI Engine**: Google Gemini API (`@google/genai`).
- **Deployment**: Vercel Serverless Function (`api/index.js`) & Static Build (`client/dist`).

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas database URI
- Google Gemini API Key (optional, for AI features)

### 2. Environment Setup

Create `.env` files in both root/server and client:

**`server/.env`**:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Installation

Install dependencies for root, server, and client:

```bash
# Root directory
npm install

# Client directory
cd client && npm install

# Server directory
cd ../server && npm install
```

### 4. Running Locally

**Terminal 1 — Backend Server:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend App:**
```bash
cd client
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🌐 Deployment (Vercel)

TaskFlow is configured for full-stack zero-config deployment on Vercel using [`vercel.json`](file:///d:/TaskFlow/vercel.json).

### Steps to Deploy:
1. Push your repository to GitHub.
2. Import your repository into **Vercel**.
3. Add Environment Variables in Vercel settings:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
4. Deploy! Vercel automatically builds the frontend SPA and exposes the Node.js serverless functions under `/api/*`.

---

## 📄 License
[MIT](LICENSE)
