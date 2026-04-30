# Auth System Comparison: Kampala vs Tester (Vayrex)

> Snapshot taken 2026-04-29. Comparison of the current Kampala (commute23) auth system against the Vayrex/tester reference implementation, prepared as input to the Kampala auth overhaul.

---

## Architecture Overview

| Dimension | Kampala (commute23) | Tester (Vayrex) |
|---|---|---|
| Stack | React-only (no backend) | React frontend + Express.js backend |
| Auth provider | Firebase Auth only | Firebase Auth (OAuth) + Custom JWT |
| Database | Firestore (NoSQL, cloud) | MongoDB + Redis cache |
| File storage | Firebase Storage | AWS S3 |
| Build tool | Create React App | Vite |
| Auth files | 3 files, ~1,200 lines | 15+ middleware files, ~8,000 lines |

---

## Speed

| Operation | Kampala (Firebase) | Tester (JWT + MongoDB + Redis) |
|---|---|---|
| Login | ~300–600ms (Firebase SDK round-trip) | ~80–150ms (Redis cache hit + JWT verify) |
| Token verify | ~100–200ms (Firebase ID token check, network) | ~5–20ms (JWT local verify, no network) |
| Session check | `onAuthStateChanged` — async, ~200ms | sessionStorage read — instant (~0ms) |
| Route guard | Waits on Firebase listener every mount | Reads sessionStorage, no network |
| Signup | ~400–800ms | ~200–400ms (local bcrypt + MongoDB write) |
| Auth state init | Slow on cold start (Firebase SDK boot) | Fast (token in sessionStorage) |

**Winner: Tester** — JWT + Redis + sessionStorage is significantly faster, especially for route guards and token validation. Firebase has network round-trips baked in.

---

## Security Strength

| Feature | Kampala | Tester |
|---|---|---|
| Password hashing | Firebase handles it (bcrypt under the hood) | bcryptjs explicitly, salt rounds 10 |
| Rate limiting | Client-side only (localStorage, bypassable) | Server-side Redis (IP + user-based, can't bypass) |
| Account lockout | Client-side (localStorage, bypassable) | Server-side DB + Redis (real enforcement) |
| CSRF protection | None | HMAC-signed stateless tokens |
| Token revocation | No — Firebase tokens can't be revoked instantly | Yes — Redis blacklist, instant revocation |
| JWT token version | N/A | Yes — `tokenVersion` invalidates all old tokens on role change |
| XSS protection | None | Frontend + backend XSS sanitizers |
| Input sanitization | Basic regex | Dedicated sanitizer middleware (15KB) |
| RBAC | None | 3 roles: user / admin / superadmin |
| Tab isolation | No — shared localStorage | Yes — tab-scoped sessionStorage keys |
| Request fingerprinting | No | Yes — user-agent + headers hashed |
| Audit logging | No | Yes — AuditLog collection |
| 9-layer auth middleware | No | Yes |
| Email verification enforcement | Soft (user signed out, but not enforced) | Full token + 6-digit code, hard enforced |

**Winner: Tester** — 3–4 levels above Kampala in every measurable category.

---

## Complexity

| | Kampala | Tester |
|---|---|---|
| Auth files | 3 | 15+ |
| Backend required | No | Yes (Express, Node) |
| Services to run | 1 (React app) | 3 (React + Express + MongoDB + Redis) |
| Dependencies | Firebase only | Firebase + JWT + bcrypt + Mongoose + Redis |
| Lines of auth code | ~1,200 | ~8,000+ |
| Mental model | Simple — Firebase does everything | Complex — you own the whole auth stack |

---

## Tester's Auth Architecture (Reference Pattern)

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite)                                    │
├─────────────────────────────────────────────────────────────┤
│  AuthContext (React Context)                                │
│  - sessionStorage with tab isolation                        │
│  - JWT in `authToken`, refresh in `refreshToken`            │
│  - User in `user`, CSRF in `csrfToken`                      │
│  - Periodic refresh, queue pattern for concurrent 401s      │
│                                                             │
│  Firebase SDK    │    Axios API service                     │
│  (Google OAuth)  │    (CSRF, auto-refresh, retry queue)     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (Express)                                          │
├─────────────────────────────────────────────────────────────┤
│  /auth/signup      /auth/login        /auth/logout          │
│  /auth/refresh     /auth/verify       /auth/firebase-login  │
│  /auth/forgot-password  /auth/reset-password/{token}        │
│                                                             │
│  Middleware stack:                                          │
│  - CSRF protection (stateless HMAC)                         │
│  - Input validation & sanitization                          │
│  - Rate limiting (Redis, IP + user-based)                   │
│  - Account lockout (5 attempts, 15min)                      │
│  - 9-layer JWT auth middleware                              │
│  - Admin role verification                                  │
│  - Request fingerprinting                                   │
│  - Audit logging                                            │
│                                                             │
│  Services: TokenService, EmailService, PasswordValidator    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PERSISTENCE                                                │
├─────────────────────────────────────────────────────────────┤
│  MongoDB              │  Redis                              │
│  - User docs          │  - Rate limit counters              │
│  - Verification       │  - Token revocation list            │
│  - Subscriptions      │  - Lockout state                    │
│  - Usage tracking     │  - Session cache                    │
│  - Audit logs         │  - CSRF token cache                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Tester's User Schema (MongoDB) — Auth Fields

```
- email              (unique, lowercase, indexed)
- username           (unique, lowercase, indexed)
- password           (select: false, bcryptjs hashed)
- firebaseUid        (unique, sparse — for Firebase users)
- provider           (enum: ["email", "firebase", "google"])
- emailVerified      (boolean)
- emailVerificationToken    (SHA256 hashed)
- emailVerificationCode     (6-digit)
- emailVerificationExpires  (24-hour expiry)
- isActive           (account status)
- isDeleted          (soft delete)
- role               (enum: ["user", "admin", "superadmin"])
- tokenVersion       (number — invalidates old JWTs on role change)
- accountLockout     ({ lockUntil, loginAttempts })
- passwordResetToken     (SHA256 hashed)
- passwordResetExpires   (1-hour expiry)
```

---

## Kampala's Current State

### Auth files
- `src/firebase.js` — Firebase init (auth, db, storage)
- `src/login.js` — Email/password + Google/GitHub OAuth + lockout
- `src/signup.js` — Email signup + email verification
- `src/components/ProtectedRoute.js` — Route guard
- `src/App.js` (lines 794–830) — App-level auth state + logout

### Firestore collections
- `users` — `{ email, firstName, lastName, photoURL, headline, bio, createdAt, lastLogin, isProfileComplete, emailVerified, accountStatus, authProvider, updatedAt }`
- `posts`, `connections`, `events`, `notifications`

### State persistence
- Firebase SDK (auto)
- React state: `user`, `isLoggedIn`, `userProfile`
- localStorage: `loginAttempts`, `loginLockoutTime`, `rememberMe`, dashboard cache keys

### Known issues
1. No RBAC
2. Client-side rate limiting only
3. No audit logging
4. Email verification not strictly enforced
5. Username/profile data does not load reliably across nav, posts, settings (root cause of overhaul)
6. `authProvider` field stored but never used
7. Profile setup can be skipped, breaking recommendations
8. Dummy data hardcoded in Dashboard for events/notifications

---

## Plan: Kampala Overhaul (Tester-Pattern, MVP Level)

### Goals
- Strong auth, RBAC matching tester strength
- Firebase used only for OAuth identity
- MongoDB for user data and app data
- Custom JWT-based session managed via sessionStorage with tab isolation
- Mirror tester's file/folder structure for auth

### Stack After Migration
```
Frontend:   React + Firebase OAuth (Google/GitHub) + sessionStorage JWT
Backend:    Express + JWT (jsonwebtoken) + bcryptjs + Mongoose
Database:   MongoDB (replaces Firestore)
Cache:      Redis (optional MVP, can skip initially)
Auth state: AuthContext (replaces scattered onAuthStateChanged)
```

### Roles (RBAC)
- `user` — default, normal access
- `moderator` — content moderation (delete posts, manage reports)
- `admin` — user management, full content control
- `superadmin` — system-level access, role management

### Files to Create / Refactor
```
backend/
  server.js
  config/
    db.js                  (MongoDB connection)
    firebase-admin.js      (verify Firebase OAuth tokens)
  models/
    User.js                (Mongoose, mirrors tester schema)
    AuditLog.js            (optional MVP)
  routes/
    auth.js                (signup, login, logout, refresh, firebase-login, forgot/reset)
  middleware/
    auth.js                (JWT verify, role guard)
    accountLockout.js
    inputValidator.js
    rateLimiter.js         (basic, can use express-rate-limit for MVP)
  services/
    tokenService.js        (JWT generation/verification, tokenVersion)
    passwordValidator.js
    emailService.js
  security/
    sanitizer.js
  .env

src/ (frontend changes)
  contexts/AuthContext.js  (replaces scattered auth state)
  services/api.js          (axios instance with interceptors, refresh queue)
  utils/storageKeys.js     (tab-isolated sessionStorage keys)
  firebase.js              (auth only — drop Firestore + Storage usage)
  login.js                 (rewrite — call /auth/login or /auth/firebase-login)
  signup.js                (rewrite — call /auth/signup)
  components/
    ProtectedRoute.js      (use AuthContext, sessionStorage check)
    AdminRoute.js          (new — role-gated)
```

### Phased Plan
1. **Phase 1 — Backend skeleton**: Express server, MongoDB connection, User model, /auth routes (signup/login/logout/refresh)
2. **Phase 2 — Frontend integration**: AuthContext, axios service, sessionStorage with tab isolation, rewrite login/signup
3. **Phase 3 — Firebase OAuth bridge**: Keep Firebase for Google/GitHub sign-in, send Firebase ID token to backend `/auth/firebase-login` to mint our own JWT
4. **Phase 4 — RBAC**: role field, role-gated middleware, AdminRoute component, admin endpoints
5. **Phase 5 — Hardening**: account lockout, rate limiting, password validation, input sanitization, email verification flow
6. **Phase 6 — Migration**: drop Firestore reads/writes, migrate existing data structures (users, posts, connections) to MongoDB

### What We Drop / Simplify From Tester
- Redis (defer to post-MVP — can use in-memory rate limiting initially)
- CSRF stateless tokens (defer — JWT in Authorization header is sufficient for MVP if SameSite cookies/headers are clean)
- Subscription tier system (not needed)
- Usage tracking and limits (not needed)
- Request fingerprinting (defer)
- 9-layer middleware stack (collapse to 4–5 essential layers for MVP)
- Audit logging (optional, recommend keeping for admin actions only)

### What We Keep at Tester Strength
- Tab-isolated sessionStorage
- bcryptjs password hashing (10+ rounds)
- Account lockout (5 attempts, 15min)
- Token versioning (`tokenVersion` invalidates old JWTs on role change)
- RBAC roles enforced server-side via middleware
- Refresh token + access token pattern with queue for concurrent 401s
- XSS sanitization
- Strong password validation (length, case, number, special, common-password blacklist)
