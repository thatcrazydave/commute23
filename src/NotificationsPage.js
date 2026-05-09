import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FaBell,
  FaHeart,
  FaComment,
  FaUserPlus,
  FaUserCheck,
  FaFileAlt,
  FaCalendarAlt,
  FaBullhorn,
  FaStar,
  FaCheckDouble,
  FaTrash,
  FaTimes,
} from 'react-icons/fa';
import API from './services/api';
import { useAuth } from './contexts/AuthContext';
import './css/NotificationsPage.css';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Map a notification type to an icon component and CSS modifier class.
 */
function getTypeConfig(type) {
  switch (type) {
    case 'like':               return { icon: <FaHeart />,       cls: 'type-like' };
    case 'comment':            return { icon: <FaComment />,     cls: 'type-comment' };
    case 'connection_request': return { icon: <FaUserPlus />,   cls: 'type-connection_request' };
    case 'connection_accepted':return { icon: <FaUserCheck />,  cls: 'type-connection_accepted' };
    case 'new_post':           return { icon: <FaFileAlt />,     cls: 'type-new_post' };
    case 'event':              return { icon: <FaCalendarAlt />, cls: 'type-event' };
    case 'system':             return { icon: <FaBullhorn />,    cls: 'type-system' };
    case 'welcome':            return { icon: <FaStar />,        cls: 'type-welcome' };
    default:                   return { icon: <FaBell />,        cls: 'type-system' };
  }
}

/**
 * Map a notification type to the Settings preference key.
 * Returns null for types that are always shown (welcome, system-critical).
 */
const TYPE_TO_PREF_KEY = {
  like:                'newLike',
  comment:             'newComment',
  connection_request:  'connectionRequest',
  connection_accepted: 'newConnection',
  new_post:            'newPost',
  event:               'eventReminder',
  system:              'systemAnnouncements',
  welcome:             null, // always shown
};

/**
 * Load notification preferences from localStorage.
 */
function loadPrefs() {
  try {
    const saved = localStorage.getItem('commute_notif_prefs');
    return saved
      ? JSON.parse(saved)
      : {
          newConnection: true,
          connectionRequest: true,
          newComment: true,
          newLike: false,
          newPost: true,
          eventReminder: true,
          systemAnnouncements: true,
        };
  } catch {
    return {};
  }
}

/**
 * Group notifications into Today / This Week / Older buckets.
 */
function groupByDate(notifications) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart  = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const groups = { today: [], week: [], older: [] };

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    if (d >= todayStart) groups.today.push(n);
    else if (d >= weekStart) groups.week.push(n);
    else groups.older.push(n);
  }

  return groups;
}

/**
 * Human-readable relative time (e.g. "3 hours ago").
 */
function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24)return `${hours}h ago`;
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Filter tabs ────────────────────────────────────────────────────────────
const FILTERS = [
  { id: 'all',         label: 'All' },
  { id: 'unread',      label: 'Unread' },
  { id: 'social',      label: 'Social',   types: ['like', 'comment', 'new_post'] },
  { id: 'connections', label: 'Connections', types: ['connection_request', 'connection_accepted'] },
  { id: 'events',      label: 'Events',   types: ['event'] },
  { id: 'system',      label: 'System',   types: ['system', 'welcome'] },
];

// ── Notification card ──────────────────────────────────────────────────────
const NotifCard = ({ notif, onRead, onDelete }) => {
  const { icon, cls } = getTypeConfig(notif.type);

  const handleClick = () => {
    if (!notif.read) onRead(notif._id);
  };

  return (
    <motion.div
      className={`notif-card ${!notif.read ? 'unread' : ''}`}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      onClick={handleClick}
    >
      <div className={`notif-icon-wrap ${cls}`}>{icon}</div>

      <div className="notif-body">
        <p className="notif-content-text">{notif.content}</p>
        <span className="notif-time">{relativeTime(notif.createdAt)}</span>
      </div>

      <div className="notif-card-actions">
        {!notif.read && <div className="notif-unread-dot" />}
        <button
          className="notif-delete-btn"
          title="Dismiss"
          onClick={e => { e.stopPropagation(); onDelete(notif._id); }}
        >
          <FaTimes />
        </button>
      </div>
    </motion.div>
  );
};

// ── Group section ──────────────────────────────────────────────────────────
const NotifGroup = ({ label, items, onRead, onDelete }) => {
  if (!items.length) return null;
  return (
    <div>
      <div className="notif-group-label">{label}</div>
      <AnimatePresence initial={false}>
        {items.map(n => (
          <NotifCard key={n._id} notif={n} onRead={onRead} onDelete={onDelete} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────
const NotificationsPage = () => {
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const [prefs, setPrefs] = useState(loadPrefs);

  // Reload prefs whenever the page mounts (user may have changed them in Settings)
  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await API.get('/notifications?limit=50');
      if (data.success) setNotifications(data.data.notifications);
    } catch {
      // silently fail — page still renders
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Filter + pref-based visibility ────────────────────────────────────
  const visible = notifications.filter(n => {
    // Respect notification preferences
    const prefKey = TYPE_TO_PREF_KEY[n.type];
    if (prefKey && prefs[prefKey] === false) return false;

    // Apply filter tab
    const tab = FILTERS.find(f => f.id === filter);
    if (!tab || tab.id === 'all') return true;
    if (tab.id === 'unread') return !n.read;
    return tab.types?.includes(n.type) ?? true;
  });

  const groups   = groupByDate(visible);
  const unreadCount = notifications.filter(n => {
    const prefKey = TYPE_TO_PREF_KEY[n.type];
    if (prefKey && prefs[prefKey] === false) return false;
    return !n.read;
  }).length;

  // Which preference keys are disabled (so we can show the banner)?
  const disabledTypes = Object.entries(TYPE_TO_PREF_KEY)
    .filter(([, k]) => k && prefs[k] === false)
    .map(([type]) => type);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleRead = async (id) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    try { await API.patch(`/notifications/${id}/read`); } catch {}
  };

  const handleDelete = async (id) => {
    setNotifications(prev => prev.filter(n => n._id !== id));
    try { await API.delete(`/notifications/${id}`); } catch {}
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await API.patch('/notifications/read-all');
      showToast('All notifications marked as read');
    } catch {}
  };

  const handleClearAll = async () => {
    setNotifications([]);
    try {
      await API.delete('/notifications');
      showToast('All notifications cleared');
    } catch {}
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="notifications-page">
      <div className="notifications-inner">
        {/* Header */}
        <div className="notif-header">
          <div className="notif-header-left">
            <h1>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 10,
                  fontSize: '0.85rem',
                  background: 'linear-gradient(135deg,#4a6cf7,#7c3aed)',
                  color: '#fff',
                  borderRadius: 20,
                  padding: '2px 10px',
                  verticalAlign: 'middle',
                  fontWeight: 700,
                }}>
                  {unreadCount}
                </span>
              )}
            </h1>
            <p>Stay up to date with your community</p>
          </div>

          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button className="notif-btn notif-btn--outline" onClick={handleMarkAllRead}>
                <FaCheckDouble /> Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button className="notif-btn notif-btn--danger" onClick={handleClearAll}>
                <FaTrash /> Clear all
              </button>
            )}
          </div>
        </div>

        {/* Preference banner */}
        {disabledTypes.length > 0 && (
          <div className="notif-pref-banner">
            <FaBell />
            <span>
              Some notification types are hidden by your preferences.
            </span>
            <Link to="/settings">Manage in Settings →</Link>
          </div>
        )}

        {/* Filter tabs */}
        <div className="notif-filter-bar">
          {FILTERS.map(f => (
            <button
              key={f.id}
              className={`notif-filter-tab ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {f.id === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="notif-loading">
            <div className="notif-spinner" />
            <p>Loading notifications…</p>
          </div>
        ) : visible.length === 0 ? (
          <motion.div
            className="notif-empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="notif-empty-icon"><FaBell /></div>
            <h3>
              {filter === 'all' ? 'All caught up!' : `No ${filter} notifications`}
            </h3>
            <p>
              {filter === 'all'
                ? 'When people like your posts, comment, or connect with you, you\'ll see it here.'
                : 'Nothing here right now. Check back later!'}
            </p>
          </motion.div>
        ) : (
          <>
            <NotifGroup label="Today"     items={groups.today} onRead={handleRead} onDelete={handleDelete} />
            <NotifGroup label="This week" items={groups.week}  onRead={handleRead} onDelete={handleDelete} />
            <NotifGroup label="Older"     items={groups.older} onRead={handleRead} onDelete={handleDelete} />
          </>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="notif-toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsPage;
