import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import {
  FaHome,
  FaUserCircle,
  FaSignInAlt,
  FaUserPlus,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaBell,
  FaEnvelope,
  FaChevronDown,
  FaSearch,
  FaCog,
  FaUserFriends,
  FaCalendarAlt,
  FaHeart,
  FaComment,
  FaUserCheck,
  FaFileAlt,
  FaBullhorn,
  FaStar,
} from 'react-icons/fa';
import Avatar from './Avatar';
import API from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import '../css/Navbar.css';

// ── Helpers ────────────────────────────────────────────────────────────────

function getNotifIcon(type) {
  switch (type) {
    case 'like':               return <FaHeart style={{ color: '#ef4444' }} />;
    case 'comment':            return <FaComment style={{ color: '#3b82f6' }} />;
    case 'connection_request': return <FaUserFriends style={{ color: '#22c55e' }} />;
    case 'connection_accepted':return <FaUserCheck style={{ color: '#16a34a' }} />;
    case 'new_post':           return <FaFileAlt style={{ color: '#9333ea' }} />;
    case 'welcome':            return <FaStar style={{ color: '#eab308' }} />;
    default:                   return <FaBullhorn style={{ color: '#64748b' }} />;
  }
}

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function loadPrefs() {
  try {
    const saved = localStorage.getItem('commute_notif_prefs');
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

const TYPE_TO_PREF = {
  like:                'newLike',
  comment:             'newComment',
  connection_request:  'connectionRequest',
  connection_accepted: 'newConnection',
  new_post:            'newPost',
  event:               'eventReminder',
  system:              'systemAnnouncements',
  welcome:             null,
};

// ── Component ──────────────────────────────────────────────────────────────

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, isAuthenticated } = useAuth();

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [globalToast, setGlobalToast] = useState(null);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const pollRef = useRef(null);
  const prevLatestRef = useRef(null);

  // ── Firebase auth (for Navbar's own auth awareness) ──────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Scroll shadow ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // ── Close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── Fetch notifications ───────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await API.get('/notifications?limit=10');
      if (!data.success) return;

      const prefs = loadPrefs();
      const filtered = data.data.notifications.filter(n => {
        const key = TYPE_TO_PREF[n.type];
        return !key || prefs[key] !== false;
      });

      setNotifications(filtered);
      setUnreadCount(filtered.filter(n => !n.read).length);

      if (filtered.length > 0) {
        const latest = filtered[0];
        if (prevLatestRef.current && prevLatestRef.current !== latest._id && !latest.read) {
          setGlobalToast('You have a new notification 🔔');
          setTimeout(() => setGlobalToast(null), 3000);
        }
        prevLatestRef.current = latest._id;
      }
    } catch { /* silently ignore */ }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      pollRef.current = setInterval(fetchNotifications, 60_000);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isAuthenticated, fetchNotifications]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try { await API.patch('/notifications/read-all'); } catch {}
  };

  const handleMarkOneRead = async (id) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try { await API.patch(`/notifications/${id}/read`); } catch {}
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch {}
    navigate('/');
    setShowUserMenu(false);
  };

  const closeMenus = () => {
    setIsMenuOpen(false);
    setShowUserMenu(false);
    setShowNotifications(false);
  };

  // Composite user for avatar (AuthContext user takes precedence)
  const displayUser = authUser || firebaseUser;
  const isLoggedIn  = !loading && (!!firebaseUser || isAuthenticated);

  // ── Animation variants ────────────────────────────────────────────────────
  const navVariants = {
    hidden: { y: -100 },
    visible: { y: 0, transition: { type: 'spring', stiffness: 120, damping: 20 } },
  };
  const dropVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.18 } },
    exit: { opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.15 } },
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.nav
      className={`navbar ${scrolled ? 'scrolled' : ''}`}
      initial="hidden"
      animate="visible"
      variants={navVariants}
    >
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenus}>
          <motion.div className="logo-container" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            TechNexus
          </motion.div>
        </Link>

        {isLoggedIn && (
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input type="text" placeholder="Search..." className="search-input" />
          </div>
        )}

        <div className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </div>

        <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" className={`menu-item ${location.pathname === '/' ? 'active' : ''}`} onClick={closeMenus}>
            <FaHome /><span>Home</span>
          </Link>

          {isLoggedIn ? (
            <>
              <Link to="/dashboard" className={`menu-item ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={closeMenus}>
                <FaUserCircle /><span>Dashboard</span>
              </Link>
              <Link to="/connections" className={`menu-item ${location.pathname === '/connections' ? 'active' : ''}`} onClick={closeMenus}>
                <FaUserFriends /><span>Network</span>
              </Link>
              <Link to="/events" className={`menu-item ${location.pathname === '/events' ? 'active' : ''}`} onClick={closeMenus}>
                <FaCalendarAlt /><span>Events</span>
              </Link>

              <div className="navbar-actions">
                {/* ── Notifications dropdown ─────────────────────────── */}
                <div className="dropdown-container" ref={notifRef}>
                  <motion.button
                    className="icon-button"
                    onClick={() => { setShowNotifications(p => !p); setShowUserMenu(false); }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Notifications"
                  >
                    <FaBell />
                    {unreadCount > 0 && (
                      <motion.span
                        className="notification-badge"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        key={unreadCount}
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </motion.span>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        className="dropdown-menu notifications-menu"
                        initial="hidden" animate="visible" exit="exit"
                        variants={dropVariants}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <h3 style={{ margin: 0 }}>Notifications</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllRead}
                              style={{ fontSize: '0.75rem', color: '#4a6cf7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Mark all read
                            </button>
                          )}
                        </div>

                        {notifications.length > 0 ? (
                          <ul className="notifications-list">
                            {notifications.slice(0, 8).map(n => (
                              <li
                                key={n._id}
                                className={!n.read ? 'unread' : ''}
                                onClick={() => {
                                  if (!n.read) handleMarkOneRead(n._id);
                                  closeMenus();
                                  if (n.refType === 'Post' && n.refId) navigate(`/post/${n.refId}`);
                                  else if (n.type.includes('connection')) navigate('/connections');
                                  else navigate('/notifications');
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                <span style={{ fontSize: '0.85rem', marginRight: 8, flexShrink: 0 }}>
                                  {getNotifIcon(n.type)}
                                </span>
                                <div className="notification-content">
                                  <p>{n.content}</p>
                                  <span className="notification-time">{relativeTime(n.createdAt)}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="no-notifications">You're all caught up! 🎉</p>
                        )}

                        <div className="dropdown-footer">
                          <Link to="/notifications" onClick={closeMenus}>
                            View all notifications
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Messages button ───────────────────────────────── */}
                <motion.button
                  className="icon-button"
                  onClick={() => navigate('/messages')}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FaEnvelope />
                </motion.button>

                {/* ── User profile dropdown ─────────────────────────── */}
                <div className="dropdown-container" ref={dropdownRef}>
                  <motion.button
                    className="user-button"
                    onClick={() => { setShowUserMenu(p => !p); setShowNotifications(false); }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Avatar user={displayUser} size={32} className="user-avatar" />
                    <span className="user-name">
                      {authUser?.firstName || firebaseUser?.displayName?.split(' ')[0] || firebaseUser?.email?.split('@')[0]}
                    </span>
                    <FaChevronDown className="dropdown-icon" />
                  </motion.button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        className="dropdown-menu user-menu"
                        initial="hidden" animate="visible" exit="exit"
                        variants={dropVariants}
                      >
                        <div className="user-info">
                          <Avatar user={displayUser} size={48} />
                          <div>
                            <h3>{authUser?.firstName} {authUser?.lastName}</h3>
                            <p>{authUser?.email || firebaseUser?.email}</p>
                          </div>
                        </div>

                        <ul className="user-menu-items">
                          <li><Link to="/profile" onClick={closeMenus}><FaUserCircle /> View Profile</Link></li>
                          <li><Link to="/settings" onClick={closeMenus}><FaCog /> Settings</Link></li>
                          <li>
                            <Link to="/notifications" onClick={closeMenus}>
                              <FaBell /> Notifications
                              {unreadCount > 0 && (
                                <span style={{
                                  marginLeft: 'auto', background: '#4a6cf7', color: '#fff',
                                  borderRadius: 10, padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700,
                                }}>
                                  {unreadCount}
                                </span>
                              )}
                            </Link>
                          </li>
                          <li>
                            <button onClick={handleLogout}><FaSignOutAlt /> Sign Out</button>
                          </li>
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </>
          ) : (
            /* Logged-out links */
            <>
              <Link to="/about"    className={`menu-item ${location.pathname === '/about'    ? 'active' : ''}`} onClick={closeMenus}><span>About</span></Link>
              <Link to="/features" className={`menu-item ${location.pathname === '/features' ? 'active' : ''}`} onClick={closeMenus}><span>Features</span></Link>
              <Link to="/pricing"  className={`menu-item ${location.pathname === '/pricing'  ? 'active' : ''}`} onClick={closeMenus}><span>Pricing</span></Link>
              <Link to="/contact"  className={`menu-item ${location.pathname === '/contact'  ? 'active' : ''}`} onClick={closeMenus}><span>Contact</span></Link>

              <div className="auth-buttons">
                <motion.button className="login-button" onClick={() => { navigate('/login'); closeMenus(); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <FaSignInAlt /><span>Login</span>
                </motion.button>
                <motion.button className="signup-button" onClick={() => { navigate('/signup'); closeMenus(); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <FaUserPlus /><span>Sign Up</span>
                </motion.button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Global Toast Notification */}
      <AnimatePresence>
        {globalToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{
              position: 'fixed',
              top: 80,
              left: '50%',
              background: '#111827',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 30,
              fontSize: '0.9rem',
              fontWeight: 500,
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              zIndex: 9999,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >
            {globalToast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
