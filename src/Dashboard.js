import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FaUserFriends,
  FaSearch,
  FaEdit,
  FaCheckCircle,
  FaWifi,
  FaBan,
  FaExclamationCircle,
  FaSyncAlt,
} from 'react-icons/fa';
import DashboardSidebar from './DashboardSidebar';
import ConnectionCard from './ConnectionCard';
import PostCard from './PostCard';
import CreatePostModal from './CreatePostModal';
import LoadingSpinner from './components/LoadingSpinner';
import Avatar from './components/Avatar';

import API from './services/api';
import clientLogger from './utils/clientLogger';
import { useAuth } from './contexts/AuthContext';
import './css/Dashboard.css';

// Error boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { clientLogger.error('Dashboard render error', { error: error?.message, info }); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <div className="error-content">
            <div className="error-icon"><FaExclamationCircle /></div>
            <h2>Something went wrong</h2>
            <p>We're sorry, there was an error loading this page.</p>
            <button className="retry-button" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Profile setup modal — calls /api/users/me PATCH
const ProfileSetupModal = ({ onComplete }) => {
  const { user: authUser, updateUser } = useAuth();
  const [firstName, setFirstName] = useState(authUser?.firstName || '');
  const [lastName, setLastName] = useState(authUser?.lastName || '');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim()) { setError('First name is required'); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      const { data } = await API.patch('/users/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        headline: headline.trim(),
        bio: bio.trim(),
        isProfileComplete: true,
      });
      if (data.success) {
        updateUser(data.data.user);
        onComplete(data.data.user);
      }
    } catch (err) {
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="profile-setup-modal" initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
        <div className="modal-header profile-modal-header">
          <h2>Complete Your Profile</h2>
          <p>Welcome to the community! Let's set up your profile.</p>
        </div>
        <div className="modal-body profile-modal-body">
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="firstName">First Name *</label>
            <input type="text" id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Enter your first name" required />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input type="text" id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Enter your last name" />
          </div>
          <div className="form-group">
            <label htmlFor="headline">Headline</label>
            <input type="text" id="headline" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g., Frontend Developer at Company" />
          </div>
          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us a bit about yourself" rows={4} />
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Complete Profile'}
            </button>
            <button type="button" className="skip-button" onClick={() => onComplete(null)} disabled={isSubmitting}>
              Skip for Now
            </button>
          </div>
        </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

const WelcomeBanner = ({ user, onDismiss }) => (
  <motion.div className="welcome-banner" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
    <div className="welcome-content">
      <div className="welcome-icon"><FaCheckCircle /></div>
      <div className="welcome-text">
        <h3>Welcome to the community, {user.firstName}!</h3>
        <p>Your profile has been created. Explore events, connect with others, and join the conversation.</p>
      </div>
    </div>
    <button className="dismiss-button" onClick={onDismiss}>Got it</button>
  </motion.div>
);

const NetworkStatusBanner = ({ isOnline, onRetry }) => (
  <motion.div className={`network-status-banner ${isOnline ? 'online' : 'offline'}`} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
    <div className="status-icon">{isOnline ? <FaWifi /> : <FaBan />}</div>
    <div className="status-text">
      {isOnline ? "You're back online! Dashboard is now up to date." : "You're currently offline. Some features may be limited."}
    </div>
    {!isOnline && <button className="retry-button" onClick={onRetry}>Retry</button>}
  </motion.div>
);

const ConnectionRecommendation = ({ recommendation, onConnect, isOffline }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const handleConnect = async () => {
    if (isOffline) { onConnect(recommendation._id || recommendation.id, true); return; }
    setIsConnecting(true);
    try { await onConnect(recommendation._id || recommendation.id); }
    finally { setIsConnecting(false); }
  };
  return (
    <div className="connection-recommendation">
      <div className="connection-avatar">
        <Avatar user={recommendation} size={48} />
      </div>
      <div className="connection-info">
        <h3>{recommendation.firstName} {recommendation.lastName}</h3>
        <p className="connection-headline">{recommendation.headline || 'Community Member'}</p>
      </div>
      <button className={`connect-button ${isConnecting ? 'connecting' : ''}`} onClick={handleConnect} disabled={isConnecting}>
        {isConnecting ? <FaSyncAlt className="spinning" /> : <FaUserFriends />}
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
    </div>
  );
};

// Main Dashboard
const Dashboard = () => {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, isInitialized } = useAuth();

  const [userProfile, setUserProfile] = useState(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [connections, setConnections] = useState([]);
  const [recommendedConnections, setRecommendedConnections] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [, setIsOfflineMode] = useState(false);
  const [showNetworkBanner, setShowNetworkBanner] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (isInitialized && !isAuthenticated) navigate('/login');
  }, [isInitialized, isAuthenticated, navigate]);

  // Network status
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setShowNetworkBanner(true); setIsOfflineMode(false); setTimeout(() => setShowNetworkBanner(false), 3000); };
    const handleOffline = () => { setIsOnline(false); setShowNetworkBanner(true); setIsOfflineMode(true); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  // Guard: load profile exactly once per mount, regardless of authUser reference changes.
  // Without this, updateUser(profile) inside loadProfile mutates authUser → the effect
  // re-fires → infinite loop → 429 Too Many Requests.
  const hasFetchedProfile = useRef(false);
  const pollRef = useRef(null);

  // Clean up polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  useEffect(() => {
    if (!isAuthenticated || !authUser) return;
    if (hasFetchedProfile.current) return;   // already in-flight or done
    hasFetchedProfile.current = true;
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loadProfile = async () => {
    try {
      const { data } = await API.get('/users/me');
      if (data.success) {
        const profile = data.data.user;
        setUserProfile(profile);
        // NOTE: Do NOT call updateUser(profile) here — that would change the authUser
        // reference and re-trigger the useEffect above, creating an infinite loop.
        if (!profile.isProfileComplete) setShowProfileSetup(true);
        setIsLoading(false);
        loadDashboardData();
      }
    } catch (err) {
      clientLogger.error('Error loading profile', { error: err.message });
      setIsLoading(false);
    }
  };

  const loadDashboardData = async () => {
    await Promise.allSettled([fetchPosts(), fetchConnections(), fetchRecommendations(), fetchNotifications()]);
    // Poll unread count every 60 s — keeps the sidebar badge live
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchNotifications, 60_000);
  };

  const fetchPosts = async () => {
    try {
      const { data } = await API.get('/posts?limit=20');
      if (data.success) {
        // Deduplicate by _id to prevent React's duplicate-key warning
        const seen = new Set();
        const unique = (data.data.posts || []).filter(p => {
          const id = (p._id || p.id || '').toString();
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setPosts(unique);
        setFilteredPosts(unique);
      }
    } catch (err) {
      clientLogger.error('Error fetching posts', { error: err.message });
    }
  };

  const fetchConnections = async () => {
    try {
      const { data } = await API.get('/connections');
      if (data.success) setConnections(data.data.connections);
    } catch (err) {
      clientLogger.error('Error fetching connections', { error: err.message });
    }
  };

  const fetchRecommendations = async () => {
    try {
      const { data } = await API.get('/connections/recommendations');
      if (data.success) setRecommendedConnections(data.data.recommendations);
    } catch (err) {
      clientLogger.error('Error fetching recommendations', { error: err.message });
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await API.get('/notifications');
      if (data.success) setUnreadNotifications(data.data.unread);
    } catch (err) {
      clientLogger.error('Error fetching notifications', { error: err.message });
    }
  };

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredPosts(posts); return; }
    const q = searchQuery.toLowerCase();
    setFilteredPosts(posts.filter(p =>
      p.content?.toLowerCase().includes(q) ||
      p.author?.firstName?.toLowerCase().includes(q) ||
      p.author?.lastName?.toLowerCase().includes(q)
    ));
  }, [searchQuery, posts]);

  const handleProfileSetupComplete = async (profileData) => {
    if (profileData) setUserProfile(profileData);
    setShowProfileSetup(false);
    setShowWelcomeBanner(true);
    setTimeout(() => setShowWelcomeBanner(false), 5000);
    loadDashboardData();
  };

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
    setFilteredPosts(prev => [newPost, ...prev]);
    setShowCreatePost(false);
  };

  const handlePostLike = async (postId) => {
    // Optimistic update
    const toggle = (list) => list.map(p =>
      p.id === postId || p._id === postId
        ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1 }
        : p
    );
    setPosts(toggle);
    setFilteredPosts(toggle);

    if (!isOnline) return;
    try {
      await API.post(`/posts/${postId}/like`);
    } catch (err) {
      // Revert on error
      setPosts(toggle);
      setFilteredPosts(toggle);
    }
  };


  const handlePostUpdate = (postId, updates) => {
    const apply = (list) => list.map(p => (p._id || p.id) === postId ? { ...p, ...updates } : p);
    setPosts(apply);
    setFilteredPosts(apply);
  };

  const handlePostDelete = async (postId) => {
    setPosts(prev => prev.filter(p => (p.id || p._id) !== postId));
    setFilteredPosts(prev => prev.filter(p => (p.id || p._id) !== postId));
    if (!isOnline) return;
    try {
      await API.delete(`/posts/${postId}`);
    } catch (err) {
      clientLogger.error('Error deleting post', { postId, error: err.message });
      fetchPosts(); // Re-fetch to restore if delete failed
    }
  };

  const handleArchivePost = async (postId) => {
    try {
      await API.post(`/posts/${postId}/archive`);
      setPosts(prev => prev.filter(p => (p._id || p.id) !== postId));
      setFilteredPosts(prev => prev.filter(p => (p._id || p.id) !== postId));
    } catch (err) {
      clientLogger.error('Error archiving post', { postId, error: err.message });
    }
  };

  const handleConnect = async (userId, isOptimistic = false) => {
    if (!isAuthenticated) return;
    const rec = recommendedConnections.find(r => (r._id || r.id) === userId);
    if (!rec) return;

    // Optimistic — add to connections, remove from recommendations
    const newConn = {
      id: `conn-${Date.now()}`,
      status: 'connected',
      createdAt: new Date(),
      user: { firstName: rec.firstName, lastName: rec.lastName, headline: rec.headline, photoURL: rec.photoURL },
    };
    setConnections(prev => [newConn, ...prev]);
    setRecommendedConnections(prev => prev.filter(r => (r._id || r.id) !== userId));

    if (isOptimistic || !isOnline) return;
    try {
      await API.post('/connections', { recipientId: userId });
    } catch (err) {
      clientLogger.error('Error creating connection', { userId, error: err.message });
      // Revert
      setConnections(prev => prev.filter(c => c.id !== newConn.id));
      setRecommendedConnections(prev => [rec, ...prev]);
    }
  };



  const displayUser = userProfile || authUser;

  const renderPosts = () => {
    if (isLoading) return <LoadingSpinner />;
    return (
      <div className="content-feed">
        <div className="create-post">
          <div className="create-post-input">
            <button onClick={() => setShowCreatePost(true)} style={{ cursor: 'pointer' }}>
              What's on your mind, {displayUser?.firstName || 'User'}?
            </button>
          </div>
        </div>
        <div className="post-list">
          {filteredPosts.length > 0 ? (
            filteredPosts.map(post => (
              <PostCard
                key={post._id || post.id}
                post={post}
                currentUser={authUser}
                userProfile={displayUser}
                onLike={() => handlePostLike(post._id || post.id)}
                onDelete={post.authorId === (authUser?._id || authUser?.id) || post.authorId === authUser?.uid
                  ? () => handlePostDelete(post._id || post.id)
                  : null}
                onArchive={post.authorId === (authUser?._id || authUser?.id) || post.authorId === authUser?.uid
                  ? handleArchivePost
                  : null}
                onUpdate={(updates) => handlePostUpdate(post._id || post.id, updates)}
                isOffline={!isOnline}
              />
            ))
          ) : (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
                {searchQuery ? (
                  <>
                    <FaExclamationCircle size={32} style={{ color: '#6c757d', marginBottom: '15px' }} />
                    <h3>No posts found</h3>
                    <p>No posts matching "{searchQuery}".</p>
                    <button className="secondary-button" onClick={() => setSearchQuery('')} style={{ marginTop: '10px' }}>Clear search</button>
                  </>
                ) : (
                  <>
                    <FaEdit size={32} style={{ color: '#6c757d', marginBottom: '15px' }} />
                    <h3>No posts yet</h3>
                    <p>Be the first to share something with the community!</p>
                    <button className="primary-button" onClick={() => setShowCreatePost(true)} style={{ marginTop: '10px' }}>Create a post</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderConnections = () => (
    <div className="connections-section card">
      <div className="card-header">
        <h2>Your Connections</h2>
        <button className="secondary-button" onClick={() => setActiveTab('connections')}>View All</button>
      </div>
      <div className="card-body">
        {connections.length > 0 ? (
          <div className="connections-list">
            {connections.slice(0, 3).map(conn => (
              <ConnectionCard
                key={conn.id || conn._id}
                connection={conn}
                isOffline={!isOnline}
                onRemoved={(id) => setConnections(prev => prev.filter(c => (c.id || c._id) !== id))}
              />
            ))}
          </div>
        ) : (
          <div className="empty-connections" style={{ textAlign: 'center', padding: '20px' }}>
            <FaUserFriends size={24} style={{ color: '#6c757d', marginBottom: '10px' }} />
            <p>No connections yet</p>
            <button className="primary-button" onClick={() => setActiveTab('discover')} style={{ marginTop: '10px' }}>Discover people</button>
          </div>
        )}
      </div>
    </div>
  );

  const renderRecommendations = () => (
    <div className="recommendations-section card">
      <div className="card-header"><h2>People You May Know</h2></div>
      <div className="card-body">
        {recommendedConnections.length > 0 ? (
          <div className="recommendations-list">
            {recommendedConnections.slice(0, 3).map(rec => (
              <ConnectionRecommendation
                key={rec._id || rec.id}
                recommendation={rec}
                onConnect={handleConnect}
                isOffline={!isOnline}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <FaUserFriends size={24} style={{ color: '#6c757d', marginBottom: '10px' }} />
            <p>No recommendations available</p>
          </div>
        )}
      </div>
    </div>
  );

  if (!isInitialized || (isLoading && !userProfile)) return <LoadingSpinner />;

  return (
    <ErrorBoundary>
      <div className="dashboard-container">
        <DashboardSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          notificationsCount={unreadNotifications}
        />

        <main className="dashboard-main">
          {showNetworkBanner && <NetworkStatusBanner isOnline={isOnline} onRetry={loadProfile} />}
          {showWelcomeBanner && displayUser && (
            <WelcomeBanner user={displayUser} onDismiss={() => setShowWelcomeBanner(false)} />
          )}

          <div className="dashboard-header">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="dashboard-content">
            {activeTab === 'feed' && (
              <>
                {renderPosts()}
                <div className="content-sidebar">
                  <div className="events-section card" />
                  {renderConnections()}
                  {renderRecommendations()}
                </div>
              </>
            )}
          </div>
        </main>

        <AnimatePresence>
          {showCreatePost && authUser && (
            <CreatePostModal
              user={{
                uid: authUser._id || authUser.id,
                id: authUser._id || authUser.id,
                firstName: displayUser?.firstName || authUser.firstName || 'User',
                lastName: displayUser?.lastName || authUser.lastName || '',
                photoURL: displayUser?.photoURL || authUser.photoURL || '/images/default-avatar.png',
              }}
              onClose={() => setShowCreatePost(false)}
              onSubmit={handlePostCreated}
              isOffline={!isOnline}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showProfileSetup && (
            <ProfileSetupModal onComplete={handleProfileSetupComplete} />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;
