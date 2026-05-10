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
