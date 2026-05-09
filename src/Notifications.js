import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FaBell,
  FaHeart,
  FaComment,
  FaUserFriends,
  FaCalendarAlt,
  FaCog,
  FaCheckCircle,
} from 'react-icons/fa';
import LoadingSpinner from './components/LoadingSpinner';
import API from './services/api';
import { useAuth } from './contexts/AuthContext';
import './css/Dashboard.css';
import './css/Notifications.css';

const TYPE_ICON = {
  like: <FaHeart />,
  comment: <FaComment />,
  connection_request: <FaUserFriends />,
  connection_accepted: <FaUserFriends />,
  event: <FaCalendarAlt />,
  system: <FaCog />,
  welcome: <FaCheckCircle />,
};

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'social', label: 'Social' },
  { id: 'connections', label: 'Connections' },
  { id: 'events', label: 'Events' },
  { id: 'system', label: 'System' },
];

const TAB_FILTER = {
  all: () => true,
  unread: (n) => !n.read,
  social: (n) => ['like', 'comment'].includes(n.type),
  connections: (n) => ['connection_request', 'connection_accepted'].includes(n.type),
  events: (n) => n.type === 'event',
  system: (n) => ['system', 'welcome'].includes(n.type),
};

const timeAgo = (date) => {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60) return 'Just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
};

const groupByDate = (notifications) => {
  const groups = {};
  notifications.forEach((n) => {
    const d = new Date(n.createdAt);
    const now = new Date();
    let label;
    if (d.toDateString() === now.toDateString()) {
      label = 'Today';
    } else {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      label = d.toDateString() === yesterday.toDateString()
        ? 'Yesterday'
        : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });
  return groups;
};

const Notifications = () => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [clearing, setClearing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const { data } = await API.get('/notifications?limit=50');
      if (data.success) setNotifications(data.data.notifications || []);
    } catch {
      // silent — show empty state
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    try {
      await API.patch(`/notifications/${id}/read`);
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: false } : n))
      );
    }
  };

  const clearAll = async () => {
    setClearing(true);
    const prev = notifications;
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
    try {
      await API.patch('/notifications/read-all');
    } catch {
      setNotifications(prev);
    } finally {
      setClearing(false);
    }
  };

  const filtered = notifications.filter(TAB_FILTER[activeTab]);
  const groups = groupByDate(filtered);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div>
          <h1 className="notifications-title">Notifications</h1>
          <p className="notifications-subtitle">Stay up to date with your Community</p>
        </div>
        {unreadCount > 0 && (
          <button
            className="notifications-clear-btn"
            onClick={clearAll}
            disabled={clearing}
          >
            {clearing ? 'Clearing...' : 'Clear all'}
          </button>
        )}
      </div>

      <div className="notifications-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`notifications-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="notifications-empty">
          <FaBell className="notifications-empty-icon" />
          <p>No notifications here</p>
        </div>
      ) : (
        Object.entries(groups).map(([label, items]) => (
          <div key={label} className="notifications-group">
            <p className="notifications-group-label">{label}</p>
            <div className="notifications-list">
              {items.map((n) => (
                <motion.div
                  key={n._id}
                  className={`notification-item ${n.read ? '' : 'unread'}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => !n.read && markRead(n._id)}
                >
                  <div className="notification-icon">
                    {TYPE_ICON[n.type] || <FaBell />}
                  </div>
                  <div className="notification-body">
                    <p className="notification-content">{n.content}</p>
                    <span className="notification-time">{timeAgo(n.createdAt)}</span>
                  </div>
                  {!n.read && <span className="notification-dot" />}
                </motion.div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Notifications;
