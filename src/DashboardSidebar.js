import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaHome, 
  FaBell, 
  FaCalendarAlt, 
  FaUserFriends, 
  FaBookmark, 
  FaCog, 
  FaSignOutAlt 
} from 'react-icons/fa';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';
import './DashboardSidebar.css';

const DashboardSidebar = ({ activeTab, setActiveTab, notificationsCount = 0 }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const sidebarItems = [
    { id: 'feed', label: 'Feed', icon: <FaHome /> },
    { 
      id: 'notifications', 
      label: 'Notifications', 
      icon: <FaBell />, 
      badge: notificationsCount > 0 ? notificationsCount : null 
    },
    { id: 'events', label: 'Events', icon: <FaCalendarAlt /> },
    { id: 'connections', label: 'Connections', icon: <FaUserFriends /> },
    { id: 'saved', label: 'Saved Items', icon: <FaBookmark /> },
    { id: 'settings', label: 'Settings', icon: <FaCog /> }
  ];

  return (
    <motion.div 
      className="dashboard-sidebar"
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="sidebar-logo">
        <h2>Commute</h2>
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          {sidebarItems.map(item => (
            <li key={item.id}>
              <button 
                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
                {item.badge && <span className="sidebar-badge">{item.badge}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
      </div>
    </motion.div>
  );
};

export default DashboardSidebar;
