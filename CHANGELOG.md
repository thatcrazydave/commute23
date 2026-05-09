# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0.1] - 2026-05-09

### Added
- **Notifications page** — `/notifications` now renders a real, styled page matching the site's color scheme (primary blue `#4a6cf7`, card backgrounds, border tokens) instead of the placeholder; includes filter tabs (All, Unread, Social, Connections, Events, System), date-grouped notification items, click-to-mark-read, and a "Clear all" button that marks all as read

## [0.2.0.0] - 2026-05-09

### Added
- **Post Archive** — users can now archive any post from the three-dot menu; archived posts disappear from the public feed and live in a private `/archive` view
- **Post Restore** — one-tap restore from either Archive or Recently Deleted brings a post back to the feed with all original likes, comments, and timestamps intact
- **Recently Deleted** — deleting a post now moves it to a 30-day trash bin at `/trash`; a countdown shows how many days remain before permanent deletion
- **Automatic Supabase cleanup** — BullMQ archive queue purges Supabase Storage files after the 30-day window, stopping the storage leak that existed on every deleted post
- **Copy Link** — new option in the three-dot post menu to copy a post's direct link (visible to all viewers)

### Changed
- Post deletion now moves posts to a 30-day `recently_deleted` state instead of disappearing permanently; admin/mod deletes bypass restore path
- `Post.isDeleted` (boolean) replaced with `Post.status` enum: `active | archived | recently_deleted | deleted`
- Feed query now filters on `status: 'active'`; archive and trash are user-private views

### Infrastructure
- New `archiveQueue` (BullMQ) + `archiveWorker` for deferred Supabase file purge
- New compound index `{ authorId, status, createdAt }` on Post for archive/trash query performance
- Migration script `scripts/migrate-post-status.js` with `--dry-run` support for safe backfilling

## [0.1.0.2] - 2026-05-05

### Added
- Added `CLAUDE.md` with full project architecture context: stack overview, local dev setup, key file references, auth flow, API base, and skill routing rules
- Added GBrain configuration to `CLAUDE.md`: PGLite brain engine, MCP registration, and brain sync settings
- Updated `.gitignore` to whitelist `.context/` directory attachments while keeping other context directories ignored

## [0.1.0.1] - 2026-04-29

### Changed
- Upgraded Firebase to v12 with new persistent cache API (`persistentLocalCache` + `persistentMultipleTabManager`), replacing the deprecated `enableIndexedDbPersistence`
- Upgraded web-vitals to v5, migrating to `onCLS`, `onINP`, `onFCP`, `onLCP`, `onTTFB` (INP replaces FID as the new responsiveness metric)
- Updated dependencies: firebase, framer-motion, react, react-dom, react-icons, react-router-dom, emoji-picker-react, testing libraries, and @firebase/storage to latest versions
- Removed Windows-only `set NODE_OPTIONS=--openssl-legacy-provider` prefix from start/build scripts for cross-platform compatibility
- Added `<ScrollToTop />` component so the page scrolls to the top on every route change

### Removed
- Removed several unused Dashboard components: `OfflineBanner`, `OfflineActionQueue`, `FeatureAvailability`, `ReconnectionIndicator`
- Removed unused state variables (`events`, `notifications`, `error`, `dataLoadingState`, `lastSyncTime`, `isReconnecting`, `nextReconnectionTime`, `containerVariants`, `itemVariants`) from Dashboard
- Removed unused icon imports across `Dashboard.js`, `PostCard.js`, `eventDetail.js`, `events.js`, `login.js`, and `signup.js`
- Removed verbose diagnostic `console.log` statements and over-engineered try/catch blocks from `firebase.js`
- Removed unused `useNavigate` binding from `Navbar` component

## [0.1.0] - Initial release
