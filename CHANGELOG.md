# Changelog

All notable changes to this project will be documented in this file.

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
