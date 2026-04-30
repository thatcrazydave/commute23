/**
 * Tab-isolated, hostname-scoped storage keys.
 * Pattern: "${hostname}:${tabId}:${key}"
 *
 * Why: sessionStorage is tab-scoped, BUT cloned tabs (Ctrl+click,
 * target="_blank") inherit the parent's sessionStorage. Without a per-tab
 * id embedded in keys, a clone would silently appear logged in as the parent.
 *
 * This module:
 *   - Generates a fresh tabId for newly opened tabs
 *   - Preserves the tabId across reloads and back/forward navigation
 *   - Generates a NEW tabId for cloned tabs so inherited keys are never read
 */

const TAB_ID_KEY = '__commute_tab_id';
const STORAGE_NAMESPACE = typeof window !== 'undefined' ? window.location.hostname : 'commute';

const generateTabId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

const getOrCreateTabId = () => {
  if (typeof window === 'undefined') return 'ssr';

  const existing = sessionStorage.getItem(TAB_ID_KEY);
  if (!existing) {
    const id = generateTabId();
    sessionStorage.setItem(TAB_ID_KEY, id);
    return id;
  }

  const navEntries = performance.getEntriesByType?.('navigation') ?? [];
  const navType = navEntries[0]?.type;

  // Reload or back/forward — preserve session
  if (navType === 'reload' || navType === 'back_forward') return existing;

  // Cloned tab — assign a fresh id so inherited keys are unreachable
  const newId = generateTabId();
  sessionStorage.setItem(TAB_ID_KEY, newId);
  return newId;
};

const TAB_ID = getOrCreateTabId();

export const sk = (key) => `${STORAGE_NAMESPACE}:${TAB_ID}:${key}`;
