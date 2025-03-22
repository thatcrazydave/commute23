import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
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
  FaCalendarAlt
} from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Fetch user profile data
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }
          
          // Fetch notifications (simplified - in a real app, you'd use a query)
          setNotifications([
            { id: 1, content: 'Someone liked your post', read: false, time: '2 hours ago' },
            { id: 2, content: 'New connection request', read: false, time: '1 day ago' },
            { id: 3, content: 'Upcoming event reminder', read: true, time: '3 days ago' }
          ]);
          
          // Count unread notifications
          setUnreadNotifications(2); // Simplified - in a real app, calculate this
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserProfile(null);
        setNotifications([]);
        setUnreadNotifications(0);
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
      setShowUserMenu(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const closeMenus = () => {
    setIsMenuOpen(false);
    setShowUserMenu(false);
    setShowNotifications(false);
  };

  // Animation variants
  const navVariants = {
    hidden: { y: -100 },
    visible: { 
      y: 0,
      transition: { 
        type: 'spring',
        stiffness: 120,
        damping: 20
      }
    }
  };

  const menuItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.2 }
    },
    exit: { 
      opacity: 0, 
      y: 20,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.nav 
      className={`navbar ${scrolled ? 'scrolled' : ''}`}
      initial="hidden"
      animate="visible"
      variants={navVariants}
    >
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenus}>
          <motion.div 
            className="logo-container"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            TechNexus
          </motion.div>
        </Link>
        
        {!loading && user && (
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="search-input"
            />
          </div>
        )}
        
        <div className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </div>
        
        <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link 
            to="/" 
            className={`menu-item ${location.pathname === '/' ? 'active' : ''}`}
            onClick={closeMenus}
          >
            <FaHome />
            <span>Home</span>
          </Link>
          
          {!loading && user ? (
            // Logged in menu items
            <>
              <Link 
                to="/dashboard" 
                className={`menu-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
                onClick={closeMenus}
              >
                <FaUserCircle />
                <span>Dashboard</span>
              </Link>
              
              <Link 
                to="/connections" 
                className={`menu-item ${location.pathname === '/connections' ? 'active' : ''}`}
                onClick={closeMenus}
              >
                <FaUserFriends />
                <span>Network</span>
              </Link>
              
              <Link 
                to="/events" 
                className={`menu-item ${location.pathname === '/events' ? 'active' : ''}`}
                onClick={closeMenus}
              >
                <FaCalendarAlt />
                <span>Events</span>
              </Link>
              
              <div className="navbar-actions">
                {/* Notifications dropdown */}
                <div className="dropdown-container">
                  <motion.button 
                    className="icon-button"
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      setShowUserMenu(false);
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <FaBell />
                    {unreadNotifications > 0 && (
                      <span className="notification-badge">{unreadNotifications}</span>
                    )}
                  </motion.button>
                  
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div 
                        className="dropdown-menu notifications-menu"
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={menuItemVariants}
                      >
                        <h3>Notifications</h3>
                        {notifications.length > 0 ? (
                          <ul className="notifications-list">
                            {notifications.map(notification => (
                              <li 
                                key={notification.id} 
                                className={notification.read ? '' : 'unread'}
                              >
                                <div className="notification-content">
                                  <p>{notification.content}</p>
                                  <span className="notification-time">{notification.time}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="no-notifications">No notifications</p>
                        )}
                        <div className="dropdown-footer">
                          <Link to="/notifications" onClick={closeMenus}>
                            View All
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Messages button */}
                <motion.button 
                  className="icon-button"
                  onClick={() => navigate('/messages')}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FaEnvelope />
                </motion.button>
                
                {/* User profile dropdown */}
                <div className="dropdown-container">
                  <motion.button 
                    className="user-button"
                    onClick={() => {
                      setShowUserMenu(!showUserMenu);
                      setShowNotifications(false);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img 
                      src={userProfile?.photoURL || '/images/default-avatar.png'} 
                      alt="Profile" 
                      className="user-avatar"
                    />
                    <span className="user-name">
                      {userProfile?.firstName || user.email?.split('@')[0]}
                    </span>
                    <FaChevronDown className="dropdown-icon" />
                  </motion.button>
                  
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div 
                        className="dropdown-menu user-menu"
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={menuItemVariants}
                      >
                        <div className="user-info">
                          <img 
                            src={userProfile?.photoURL || '/images/default-avatar.png'} 
                            alt="Profile" 
                            className="user-avatar-large"
                          />
                          <div>
                            <h3>{userProfile?.firstName} {userProfile?.lastName}</h3>
                            <p>{user.email}</p>
                          </div>
                        </div>
                        
                        <ul className="user-menu-items">
                          <li>
                            <Link to="/profile" onClick={closeMenus}>
                              <FaUserCircle /> View Profile
                            </Link>
                          </li>
                          <li>
                            <Link to="/settings" onClick={closeMenus}>
                              <FaCog /> Settings
                            </Link>
                          </li>
                          <li>
                            <button onClick={handleLogout}>
                              <FaSignOutAlt /> Sign Out
                            </button>
                          </li>
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </>
          ) : (
            // Logged out menu items
            <>
              <Link 
                to="/about" 
                className={`menu-item ${location.pathname === '/about' ? 'active' : ''}`}
                onClick={closeMenus}
              >
                <span>About</span>
              </Link>
              
              <Link 
                to="/features" 
                className={`menu-item ${location.pathname === '/features' ? 'active' : ''}`}
                onClick={closeMenus}
              >
                <span>Features</span>
              </Link>
              
              <Link 
                to="/pricing" 
                className={`menu-item ${location.pathname === '/pricing' ? 'active' : ''}`}
                onClick={closeMenus}
              >
                <span>Pricing</span>
              </Link>
              
              <Link 
                to="/contact" 
                className={`menu-item ${location.pathname === '/contact' ? 'active' : ''}`}
                onClick={closeMenus}
              >
                <span>Contact</span>
              </Link>
              
              <div className="auth-buttons">
                <motion.button 
                  className="login-button"
                  onClick={() => {
                    navigate('/login');
                    closeMenus();
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaSignInAlt />
                  <span>Login</span>
                </motion.button>
                
                <motion.button 
                  className="signup-button"
                  onClick={() => {
                    navigate('/signup');
                    closeMenus();
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaUserPlus />
                  <span>Sign Up</span>
                </motion.button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
