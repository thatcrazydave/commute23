# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Full-stack app with two completely separate parts:

| Layer | Location | Stack |
|-------|----------|-------|
| Frontend | `src/` | React 19 (CRA), React Router v7, Axios, Framer Motion |
| Backend | `backend/` | Node.js, Express, MongoDB (Mongoose), Supabase Storage, JWT auth |

**Firebase is NOT used for data or auth.** Firebase Admin SDK is used only to verify Firebase OAuth ID tokens as a secondary auth path. All primary auth is JWT via the Express backend. All data is in MongoDB. All media is in Supabase Storage.

## Commands

```bash
# Backend (port 5001)
cd backend && npm install && npm run dev   # nodemon, hot-reload
cd backend && npm start                    # production, no reload

# Frontend (port 3000)
npm install && npm start

# Run frontend tests
npm test

# Build frontend for production
npm run build
```

There is no linter script configured — ESLint is available via `react-scripts` (CRA built-in).

## Environment setup

Backend requires `backend/.env`. Reference: `backend/.env.example`. Required vars:
- `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_STORAGE_BUCKET`, `SUPABASE_CDN_URL`
- `REDIS_URL` (BullMQ + rate limiting)
- `CORS_ORIGINS` — comma-separated allowed origins

**Set `NODE_ENV=production` on any deployed server** — dev mode leaks password-reset tokens in API responses.

Frontend uses `REACT_APP_API_URL` (default `http://localhost:5001/api`).

## Key backend files

- `backend/server.js` — Express entry, mounts all routes with rate limiters
- `backend/routes/` — auth, posts, connections, events, upload, media, users, notifications, logs
- `backend/models/` — Mongoose schemas: User, Post, Comment, CommentLike, Like, Media, Connection, Event, Notification
- `backend/middleware/auth.js` — 7-layer JWT auth (extract → verify → revocation → user fetch → account status → token version → Firebase fallback)
- `backend/middleware/optionalAuth.js` — same flow but doesn't reject unauthenticated requests
- `backend/middleware/rateLimiter.js` — separate limiters: `authLimiter`, `generalLimiter`, `passwordResetLimiter`
- `backend/middleware/accountLockout.js` — tracks failed login attempts
- `backend/middleware/inputValidator.js` — request body sanitization
- `backend/config/` — db.js (Mongoose), supabase.js, redis.js, firebaseAdmin.js
- `backend/services/tokenService.js` — JWT sign/verify/revoke, token version management
- `backend/services/passwordValidator.js` — password strength rules (zxcvbn-style)
- `backend/services/userCache.js` — Redis user cache (60s TTL for user objects, 300s for stats). Used by both auth middlewares at L4 to avoid a MongoDB query on every request. Call `UserCache.invalidate(userId)` after any write to the user document; call `UserCache.invalidateStats(userId)` after post create/delete.
- `backend/utils/logger.js` — structured server-side logger
- `backend/scripts/createIndexes.js` — run once to create MongoDB indexes

## Media upload pipeline

Upload flow: `POST /api/upload` → multer (memory, 50 MB cap) → sharp resizes images → stores in Supabase Storage. For large files (videos), the response returns a `mediaId` immediately and a BullMQ job (`media-processing` queue) handles the actual Supabase upload asynchronously.

Workers:
- `backend/workers/mediaWorker.js` — processes `media-processing` queue jobs (video/large file upload to Supabase)
- `backend/workers/archiveWorker.js` — processes `archive-posts` queue jobs
- `backend/queues/mediaQueue.js` / `backend/queues/archiveQueue.js` — BullMQ queue definitions (Redis-backed)

Both queues use 3 attempts with exponential backoff (2s base).

## Key frontend files

- `src/services/api.js` — Axios instance; intercepts 401 (auto-refresh with request queue) and 429 (Retry-After backoff)
- `src/utils/storageKeys.js` — tab-isolated sessionStorage key helper (`sk(key)`). All auth tokens must be accessed via `sk()` to prevent cloned-tab session leakage.
- `src/contexts/AuthContext.js` — global auth state (JWT, not Firebase)
- `src/components/ProtectedRoute.js` — wraps authenticated routes
- `src/Dashboard.js` — main authenticated view
- `src/PostCard.js` — post component with full comment system (fetch, like, reply, delete)
- `src/utils/clientLogger.js` — POSTs frontend errors to `/api/logs/client`

## API conventions

All routes are prefixed `/api/`. All responses follow:
```json
{ "success": true,  "data": {...} }
{ "success": false, "error": { "code": "SNAKE_CASE_CODE", "message": "...", "timestamp": "..." } }
```

Auth routes use `authLimiter`; all other app routes use `generalLimiter`.

## Auth flow

1. Login → `POST /api/auth/login` → returns `accessToken` + `refreshToken` (stored in sessionStorage via `sk()`)
2. All protected requests → `Authorization: Bearer <accessToken>`
3. 401 → auto-refresh via `POST /api/auth/refresh`; concurrent 401s are queued and replayed after a single refresh

User RBAC roles: `user`, `moderator`, `admin`, `superadmin` — enforced server-side only. Increment `user.tokenVersion` in MongoDB to invalidate all existing tokens for a user.

## Frontend routing

Public: `/`, `/login`, `/signup`, `/events`, `/events/:eventId`

Protected (require auth, wrapped in `ProtectedRoute`): `/Dashboard`, `/settings`, `/archive`, `/trash`, `/notifications`, `/post/:id`, `/bookmarks`

## GBrain Configuration (configured by /setup-gbrain)
- Engine: pglite
- Config file: ~/.gbrain/config.json (mode 0600)
- Setup date: 2026-05-05
- MCP registered: yes (user scope, /Users/ogheneovosegba/.bun/bin/gbrain serve)
- Memory sync: full → github.com/thatcrazydave/gstack-brain-ogheneovosegba
- Current repo policy: read-write

## GBrain Search Guidance (configured by /sync-gbrain)
<!-- gstack-gbrain-search-guidance:start -->

GBrain is set up and synced on this machine. The agent should prefer gbrain
over Grep when the question is semantic or when you don't know the exact
identifier yet.

**This worktree is pinned to a worktree-scoped code source** via the
`.gbrain-source` file in the repo root (kubectl-style context). Any
`gbrain code-def`, `code-refs`, `code-callers`, `code-callees`, or `query`
call from anywhere under this worktree routes to that source by default —
no `--source` flag needed. Conductor sibling worktrees of the same repo
each have their own pin and their own indexed pages, so semantic results
match the actual code on disk in this worktree.

Two indexed corpora available via the `gbrain` CLI:
- This worktree's code (auto-pinned via `.gbrain-source`).
- `~/.gstack/` curated memory (registered as `gstack-brain-ogheneovosegba` source via
  the existing federation pipeline).

Prefer gbrain when:
- "Where is X handled?" / semantic intent, no exact string yet:
    `gbrain search "<terms>"` or `gbrain query "<question>"`
- "Where is symbol Y defined?" / symbol-based code questions:
    `gbrain code-def <symbol>` or `gbrain code-refs <symbol>`
- "What calls Y?" / "What does Y depend on?":
    `gbrain code-callers <symbol>` / `gbrain code-callees <symbol>`
- "What did we decide last time?" / past plans, retros, learnings:
    `gbrain search "<terms>" --source gstack-brain-ogheneovosegba`

Grep is still right for known exact strings, regex, multiline patterns, and
file globs. Run `/sync-gbrain` after meaningful code changes; for ongoing
auto-sync across all worktrees, run `gbrain autopilot --install` once per
machine — gbrain's daemon handles incremental refresh on a schedule.

<!-- gstack-gbrain-search-guidance:end -->

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Bugs/errors → invoke /investigate
- QA/testing → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
