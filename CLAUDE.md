# commute23 — Project Context

## Architecture

This is a **full-stack app** with two completely separate parts:

| Layer | Location | Stack |
|-------|----------|-------|
| Frontend | `src/` | React (CRA), React Router, Axios, Framer Motion |
| Backend | `backend/` | Node.js, Express, MongoDB (Mongoose), Supabase Storage, JWT auth |

**Firebase is NOT used for data or auth.** Firebase Admin SDK is used only for Firebase Auth token verification as a secondary auth path. All primary auth is JWT via the Express backend. All data is in MongoDB. All media is in Supabase Storage.

## Running locally

```bash
# Backend (port 5001)
cd backend && npm install && npm run dev

# Frontend (port 3000)
npm install && npm start
```

## Key backend files

- `backend/server.js` — Express app entry point
- `backend/routes/` — All API routes (auth, posts, comments, connections, events, upload, media, logs)
- `backend/models/` — Mongoose schemas (User, Post, Comment, CommentLike, Like, Media, Connection, Event, Notification)
- `backend/middleware/auth.js` — 7-layer JWT authentication middleware
- `backend/config/` — DB connection, Supabase client, Redis client

## Key frontend files

- `src/services/api.js` — Axios instance with 401 refresh + 429 backoff interceptors
- `src/contexts/AuthContext.js` — Global auth state (JWT, not Firebase)
- `src/Dashboard.js` — Main authenticated view
- `src/PostCard.js` — Post component with full comment system (fetch, like, reply, delete)
- `src/utils/clientLogger.js` — Frontend error logging (POSTs to `/api/logs/client`)

## API base

Frontend calls `REACT_APP_API_URL` (default `http://localhost:5001/api`). All routes are prefixed `/api/`.

## Auth flow

1. Login → POST `/api/auth/login` → returns `accessToken` + `refreshToken` (stored in sessionStorage)
2. All protected API requests → `Authorization: Bearer <accessToken>`
3. 401 → auto-refresh via POST `/api/auth/refresh`

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Bugs/errors → invoke /investigate
- QA/testing → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
