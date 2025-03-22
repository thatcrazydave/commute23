import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc,
  orderBy, 
  limit,
  Timestamp,
  updateDoc,
  addDoc,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  FaBell, 
  FaCalendarAlt, 
  FaUserFriends, 
  FaBookmark, 
  FaCog, 
  FaSignOutAlt,
  FaPlus,
  FaThumbsUp,
  FaComment,
  FaShare,
  FaEllipsisH,
  FaSearch,
  FaUser,
  FaEdit,
  FaCheckCircle,
  FaExclamationTriangle,
  FaWifi,
  FaBan,
  FaExclamationCircle,
  FaTimes,
  FaUserCircle,
  FaCloudDownloadAlt,
  FaCloudUploadAlt,
  FaInfoCircle,
  FaSyncAlt,
  FaImage
} from 'react-icons/fa';
import DashboardSidebar from './DashboardSidebar';
import EventCard from './EventCard';
import ConnectionCard from './ConnectionCard';
import PostCard from './PostCard';
import CreatePostModal from './CreatePostModal';
import LoadingSpinner from './components/LoadingSpinner';
import './Dashboard.css';

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Dashboard error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <div className="error-content">
            <div className="error-icon">
              <FaExclamationCircle />
            </div>
            <h2>Something went wrong</h2>
            <p>We're sorry, but there was an error loading this page.</p>
            <button 
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Profile setup modal component
const ProfileSetupModal = ({ user, onComplete }) => {
  const [firstName, setFirstName] = useState(user?.displayName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.displayName?.split(' ').slice(1).join(' ') || '');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const userProfile = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        headline: headline.trim(),
        bio: bio.trim(),
        email: user.email,
        photoURL: user.photoURL || '/images/default-avatar.png',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isProfileComplete: true
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      onComplete(userProfile);
    } catch (error) {
      console.error("Error creating profile:", error);
      setError("Failed to create profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="profile-setup-modal"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="modal-header">
          <h2>Complete Your Profile</h2>
          <p>Welcome to the community! Let's set up your profile.</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="firstName">First Name *</label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter your last name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="headline">Headline</label>
            <input
              type="text"
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g., Frontend Developer at Company"
            />
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a bit about yourself"
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Profile...' : 'Complete Profile'}
            </button>
            <button 
              type="button" 
              className="skip-button"
              onClick={() => onComplete({
                firstName: firstName || "User",
                lastName,
                email: user.email,
                photoURL: user.photoURL || '/images/default-avatar.png',
                createdAt: Timestamp.now(),
                isProfileComplete: false
              })}
              disabled={isSubmitting}
            >
              Skip for Now
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Welcome banner component
const WelcomeBanner = ({ user, onDismiss }) => {
  return (
    <motion.div 
      className="welcome-banner"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="welcome-content">
        <div className="welcome-icon">
          <FaCheckCircle />
        </div>
        <div className="welcome-text">
          <h3>Welcome to the community, {user.firstName}!</h3>
          <p>Your profile has been created. Explore events, connect with others, and join the conversation.</p>
        </div>
      </div>
      <button className="dismiss-button" onClick={onDismiss}>
        Got it
      </button>
    </motion.div>
  );
};

// Network status banner
const NetworkStatusBanner = ({ isOnline, onRetry }) => {
  return (
    <motion.div 
      className={`network-status-banner ${isOnline ? 'online' : 'offline'}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="status-icon">
        {isOnline ? <FaWifi /> : <FaBan />}
      </div>
      <div className="status-text">
        {isOnline 
          ? "You're back online! Your dashboard is now up to date."
          : "You're currently offline. Some features may be limited."}
      </div>
      {!isOnline && (
        <button className="retry-button" onClick={onRetry}>
          Retry
        </button>
      )}
    </motion.div>
  );
};

// Offline banner component
const OfflineBanner = ({ onRetry }) => {
  return (
    <div className="offline-banner">
      <div className="offline-icon">
        <FaBan />
      </div>
      <div className="offline-message">
        <h3>You're currently offline</h3>
        <p>Limited functionality is available. Some actions will be queued until you're back online.</p>
      </div>
      <button className="retry-connection" onClick={onRetry}>
        <FaSyncAlt /> Retry Connection
      </button>
    </div>
  );
};

// Offline action queue component
const OfflineActionQueue = ({ pendingActions, onClear }) => {
  if (!pendingActions || pendingActions.length === 0) return null;
  
  return (
    <div className="offline-queue-indicator">
      <FaCloudUploadAlt />
      <span>{pendingActions.length} pending {pendingActions.length === 1 ? 'action' : 'actions'}</span>
      <button onClick={onClear} className="clear-queue">Clear</button>
    </div>
  );
};

// Feature availability component
const FeatureAvailability = ({ feature }) => {
  return (
    <div className="feature-availability">
      <FaInfoCircle />
      <span>{feature} is not available offline</span>
    </div>
  );
};

// Reconnection indicator component
const ReconnectionIndicator = ({ attemptCount, nextAttemptTime }) => {
  const [countdown, setCountdown] = useState(0);
  
  useEffect(() => {
    if (!nextAttemptTime) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((nextAttemptTime - now) / 1000));
      setCountdown(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [nextAttemptTime]);
  
  return (
    <div className="reconnection-indicator">
      <div className="reconnection-spinner">
        <FaSyncAlt className={countdown > 0 ? '' : 'spinning'} />
      </div>
      <div className="reconnection-text">
        {countdown > 0 ? (
          <span>Reconnecting in {countdown}s (Attempt {attemptCount})</span>
        ) : (
          <span>Attempting to reconnect... (Attempt {attemptCount})</span>
        )}
      </div>
    </div>
  );
};

// Add this new component for connection recommendations
const ConnectionRecommendation = ({ recommendation, onConnect, isOffline }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  
  const handleConnect = async () => {
    if (isOffline) {
      // Handle offline case
      onConnect(recommendation.id, true);
      return;
    }
    
    setIsConnecting(true);
    try {
      await onConnect(recommendation.id);
    } finally {
      setIsConnecting(false);
    }
  };
  
  return (
    <div className="connection-recommendation">
      <div className="connection-avatar">
        {recommendation.photoURL ? (
          <img src={recommendation.photoURL} alt={`${recommendation.firstName} ${recommendation.lastName}`} />
        ) : (
          <FaUserCircle size={40} />
        )}
      </div>
      <div className="connection-info">
        <h3>{recommendation.firstName} {recommendation.lastName}</h3>
        <p className="connection-headline">{recommendation.headline || 'Community Member'}</p>
        {recommendation.matchReason && (
          <p className="match-reason">{recommendation.matchReason}</p>
        )}
      </div>
      <button 
        className={`connect-button ${isConnecting ? 'connecting' : ''}`}
        onClick={handleConnect}
        disabled={isConnecting}
      >
        {isConnecting ? <FaSyncAlt className="spinning" /> : <FaUserFriends />} 
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
    </div>
  );
};

// Main Dashboard component
const Dashboard = () => {
  const navigate = useNavigate();
  
  // User state
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  
  // UI state
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data state
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [connections, setConnections] = useState([]);
  const [recommendedConnections, setRecommendedConnections] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  // Loading and error state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataLoadingState, setDataLoadingState] = useState({
    profile: 'pending',
    posts: 'pending',
    events: 'pending',
    connections: 'pending',
    recommendations: 'pending',
    notifications: 'pending'
  });
  
  // Network state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showNetworkBanner, setShowNetworkBanner] = useState(false);
  const [pendingActions, setPendingActions] = useState([]);
  const [cachedData, setCachedData] = useState({
    profile: null,
    posts: [],
    events: [],
    connections: [],
    recommendations: []
  });
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  // Reconnection state
  const [reconnectionAttempt, setReconnectionAttempt] = useState(0);
  const [nextReconnectionTime, setNextReconnectionTime] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectionTimerRef = useRef(null);
  
  // Debug mode
  const [debugMode, setDebugMode] = useState(false);
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };
  
  // Function to cache data for offline use
  const cacheDataForOffline = (dataType, data) => {
    setCachedData(prev => ({
      ...prev,
      [dataType]: data
    }));
    
    // Store in localStorage as backup
    try {
      localStorage.setItem(`dashboard_${dataType}`, JSON.stringify(data));
      localStorage.setItem('dashboard_lastSync', new Date().toISOString());
    } catch (error) {
      console.warn('Failed to cache data in localStorage:', error);
    }
  };
  
  // Function to load cached data from localStorage
  const loadCachedData = () => {
    try {
      const lastSync = localStorage.getItem('dashboard_lastSync');
      if (lastSync) {
        setLastSyncTime(new Date(lastSync));
      }
      
      const profile = localStorage.getItem('dashboard_profile');
      const posts = localStorage.getItem('dashboard_posts');
      const events = localStorage.getItem('dashboard_events');
      const connections = localStorage.getItem('dashboard_connections');
      const recommendations = localStorage.getItem('dashboard_recommendations');
      
      setCachedData({
        profile: profile ? JSON.parse(profile) : null,
        posts: posts ? JSON.parse(posts) : [],
        events: events ? JSON.parse(events) : [],
        connections: connections ? JSON.parse(connections) : [],
        recommendations: recommendations ? JSON.parse(recommendations) : []
      });
    } catch (error) {
      console.warn('Failed to load cached data from localStorage:', error);
    }
  };
  
  // Function to schedule reconnection attempts with exponential backoff
  const scheduleReconnection = useCallback(() => {
    if (isOnline || !isOfflineMode) return;
    
    // Clear any existing timer
    if (reconnectionTimerRef.current) {
      clearTimeout(reconnectionTimerRef.current);
    }
    
    // Calculate delay with exponential backoff (1s, 2s, 4s, 8s, 16s, 32s, max 60s)
    const nextAttempt = reconnectionAttempt + 1;
    const baseDelay = Math.min(Math.pow(2, nextAttempt - 1) * 1000, 60000);
    // Add some randomness to prevent all clients from reconnecting simultaneously
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;
    
    // Set the next reconnection time for UI countdown
    setNextReconnectionTime(Date.now() + delay);
    
    // Schedule the reconnection attempt
    reconnectionTimerRef.current = setTimeout(() => {
      setReconnectionAttempt(nextAttempt);
      attemptReconnection();
    }, delay);
    
  }, [isOnline, isOfflineMode, reconnectionAttempt]);
  
  // Function to attempt reconnection to Firebase
  const attemptReconnection = useCallback(async () => {
    if (isOnline || !isOfflineMode || !user) return;
    
    setIsReconnecting(true);
    
    try {
      // Check if we can connect to Firebase
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        setIsOnline(true);
        setIsOfflineMode(false);
        setShowNetworkBanner(true);
        setTimeout(() => setShowNetworkBanner(false), 3000);
        
        // Process any pending actions
        if (pendingActions.length > 0) {
          processPendingActions();
        }
        
        // Refresh data
        fetchUserProfile(user.uid);
        setIsReconnecting(false);
        setReconnectionAttempt(0);
      } else {
        throw new Error("User document not found");
      }
    } catch (error) {
      setIsReconnecting(false);
      
      // Schedule next reconnection attempt
      scheduleReconnection();
    }
  }, [isOnline, isOfflineMode, user, reconnectionAttempt, pendingActions]);
  
  // Process pending actions when back online
  const processPendingActions = useCallback(async () => {
    if (!user || pendingActions.length === 0) return;
    
    const actionsToProcess = [...pendingActions];
    setPendingActions([]);
    
    for (const action of actionsToProcess) {
      try {
        switch (action.type) {
          case 'create_post':
            // Process pending post creation
            const postData = action.data;
            await addDoc(collection(db, 'posts'), {
              ...postData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              isPending: false
            });
            console.log("Synced pending post creation");
            break;
            
          case 'like_post':
            // Process pending like
            const postRef = doc(db, 'posts', action.data.postId);
            const postSnap = await getDoc(postRef);
            
            if (postSnap.exists()) {
              const post = postSnap.data();
              const likeData = {
                userId: user.uid,
                timestamp: serverTimestamp()
              };
              
              // Check current like status and toggle it
              const isLiked = post.likes?.some(like => like.userId === user.uid);
              
              if (isLiked) {
                await updateDoc(postRef, {
                  likes: arrayRemove(likeData),
                  likesCount: increment(-1)
                });
              } else {
                await updateDoc(postRef, {
                  likes: arrayUnion(likeData),
                  likesCount: increment(1)
                });
              }
              console.log("Synced pending like action");
            }
            break;
            
          case 'attend_event':
            // Process pending event attendance
            const eventRef = doc(db, 'events', action.data.eventId);
            const eventSnap = await getDoc(eventRef);
            
            if (eventSnap.exists()) {
              const event = eventSnap.data();
              const attendanceData = {
                userId: user.uid,
                timestamp: serverTimestamp()
              };
              
              // Check current attendance status and toggle it
              const isAttending = event.attendees?.some(a => a.userId === user.uid);
              
              if (isAttending) {
                await updateDoc(eventRef, {
                  attendees: arrayRemove(attendanceData),
                  attendeesCount: increment(-1)
                });
              } else {
                await updateDoc(eventRef, {
                  attendees: arrayUnion(attendanceData),
                  attendeesCount: increment(1)
                });
              }
              console.log("Synced pending event attendance");
            }
            break;

          case 'add_comment':
            // Process pending comment
            const commentPostRef = doc(db, 'posts', action.data.postId);
            const commentData = {
              userId: user.uid,
              userName: `${userProfile.firstName} ${userProfile.lastName}`,
              userPhoto: userProfile.photoURL,
              content: action.data.commentText,
              timestamp: serverTimestamp()
            };
            
            await updateDoc(commentPostRef, {
              comments: arrayUnion(commentData),
              commentsCount: increment(1)
            });
            console.log("Synced pending comment");
            break;
            
          case 'connect_user':
            // Process pending connection
            const connectionData = action.data.connectionData;
            
            try {
              const connectionRef = collection(db, 'connections');
              await addDoc(connectionRef, {
                userId: user.uid,
                connectedUserId: action.data.userId,
                status: 'connected',
                createdAt: serverTimestamp()
              });
              console.log("Synced pending connection");
            } catch (error) {
              console.error("Error syncing connection:", error);
              // Don't re-queue to avoid duplicates
            }
            break;
            
          default:
            console.warn(`Unknown action type: ${action.type}`);
        }
      } catch (error) {
        console.error(`Error processing action ${action.type}:`, error);
        // Re-queue failed actions
        setPendingActions(prev => [...prev, action]);
      }
    }
  }, [user, userProfile, pendingActions]);
  
  // Manual retry connection function
  const retryConnection = useCallback(() => {
    // Clear any scheduled reconnection
    if (reconnectionTimerRef.current) {
      clearTimeout(reconnectionTimerRef.current);
    }
    
    setReconnectionAttempt(prev => prev + 1);
    attemptReconnection();
  }, [attemptReconnection]);
  
  // Queue actions when offline
  const queueAction = (actionType, actionData) => {
    if (!isOnline) {
      console.log(`Queuing ${actionType} action for later`, actionData);
      setPendingActions(prev => [...prev, { type: actionType, data: actionData, timestamp: new Date() }]);
      return true; // Action was queued
    }
    return false; // Action was not queued (online)
  };
  
  // Start reconnection attempts when going offline
  useEffect(() => {
    if (isOfflineMode && user) {
      scheduleReconnection();
    }
    
    return () => {
      if (reconnectionTimerRef.current) {
        clearTimeout(reconnectionTimerRef.current);
      }
    };
  }, [isOfflineMode, user, scheduleReconnection]);
  
  // Enhanced network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      if (reconnectionTimerRef.current) {
        clearTimeout(reconnectionTimerRef.current);
      }
      
      setIsOnline(true);
      setShowNetworkBanner(true);
      setIsOfflineMode(false);
      setReconnectionAttempt(0);
      setTimeout(() => setShowNetworkBanner(false), 3000);
      
      if (pendingActions.length > 0 && user) {
        processPendingActions();
      }
      
      if (user) {
        fetchUserProfile(user.uid);
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowNetworkBanner(true);
      setIsOfflineMode(true);
      scheduleReconnection();
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (!navigator.onLine) {
      setIsOfflineMode(true);
      loadCachedData();
      scheduleReconnection();
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectionTimerRef.current) {
        clearTimeout(reconnectionTimerRef.current);
      }
    };
  }, [user, pendingActions, processPendingActions, scheduleReconnection]);
  
  // Debug mode keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+D to toggle debug mode
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setDebugMode(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [debugMode]);
  
  // Check authentication state
  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!isMounted) return;
      
      if (currentUser) {
        setUser(currentUser);
        fetchUserProfile(currentUser.uid);
      } else {
        // Redirect to login if not authenticated
        navigate('/login');
      }
    }, (error) => {
      setError("Authentication error. Please try again.");
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigate]);
  
  // Ensure user document exists
  useEffect(() => {
    const ensureUserDocument = async () => {
      if (!user) return;
      
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
          // Create a basic user document
          const basicProfile = {
            email: user.email,
            firstName: user.displayName?.split(' ')[0] || 'User',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            photoURL: user.photoURL || '/images/default-avatar.png',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            isProfileComplete: false
          };
          
          await setDoc(userDocRef, basicProfile);
          
          // Show profile setup for new users
          setUserProfile(basicProfile);
          setShowProfileSetup(true);
          setIsNewUser(true);
        }
      } catch (error) {
        console.error("Error checking/creating user document:", error);
      }
    };
    
    if (user) {
      ensureUserDocument();
    }
  }, [user]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPosts(posts);
    } else {
      const filtered = posts.filter(post => 
        post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author?.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPosts(filtered);
    }
  }, [searchQuery, posts]);

  // Fetch user profile
  const fetchUserProfile = async (userId, retryCount = 0) => {
    try {
      setDataLoadingState(prev => ({ ...prev, profile: 'loading' }));
      
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const profileData = userDocSnap.data();
        setUserProfile(profileData);
        setDataLoadingState(prev => ({ ...prev, profile: 'success' }));
        
        // Cache profile data for offline use
        cacheDataForOffline('profile', profileData);
        
        // Check if this is a returning user who hasn't completed their profile
        if (!profileData.isProfileComplete) {
          setShowProfileSetup(true);
        }
      } else {
        // Create a basic user document for existing accounts
        const basicProfile = {
          uid: userId,
          email: user?.email || "",
          firstName: user?.displayName?.split(' ')[0] || 'User',
          lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
          photoURL: user?.photoURL || '/images/default-avatar.png',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isProfileComplete: false
        };
        
        try {
          await setDoc(userDocRef, basicProfile);
          
          setUserProfile(basicProfile);
          setShowProfileSetup(true);
          setIsNewUser(true);
        } catch (createError) {
          console.error("Error creating basic profile:", createError);
          throw createError;
        }
      }
      
      // Set loading to false after getting the profile
      setIsLoading(false);
      
      // Then load the rest of the data in the background
      loadDashboardData(userId);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setDataLoadingState(prev => ({ ...prev, profile: 'error' }));
      
      // If offline, try to use cached data
      if (!navigator.onLine) {
        if (cachedData.profile) {
          setUserProfile(cachedData.profile);
          setIsLoading(false);
          setIsOfflineMode(true);
        } else {
          loadCachedData();
          if (cachedData.profile) {
            setUserProfile(cachedData.profile);
            setIsLoading(false);
            setIsOfflineMode(true);
          } else {
            setError("No cached profile data available. Please connect to the internet.");
            setIsLoading(false);
          }
        }
        return;
      }
      
      // Retry logic for network errors
      if ((error.code === 'unavailable' || error.code === 'failed-precondition') && retryCount < 3) {
        setTimeout(() => fetchUserProfile(userId, retryCount + 1), (retryCount + 1) * 2000);
        return;
      }
      
      // If we've exhausted retries or it's not a network error
      setError("Failed to load user profile. Please check your connection and refresh the page.");
      setIsLoading(false);
    }
  };
  
  // Load dashboard data sequentially
  const loadDashboardData = async (userId) => {
    try {
      await fetchPosts(userId);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
    
    try {
      await fetchEvents(userId);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
    
    try {
      await fetchConnections(userId);
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
    
    try {
      await fetchRecommendedConnections(userId);
    } catch (error) {
      console.error("Error fetching recommended connections:", error);
    }
    
    try {
      await fetchNotifications(userId);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Fetch posts with caching
  const fetchPosts = async (userId) => {
    try {
      setDataLoadingState(prev => ({ ...prev, posts: 'loading' }));
      
      // Try to fetch real posts from Firestore
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      const postsSnapshot = await getDocs(postsQuery);
      
      if (!postsSnapshot.empty) {
        const postsData = postsSnapshot.docs.map(doc => {
          const data = doc.data();
          // Check if the current user has liked this post
          const isLiked = data.likes?.some(like => like.userId === userId);
          
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            comments: data.comments || [],
            likes: data.likes || [],
            isLiked
          };
        });
        
        setPosts(postsData);
        setFilteredPosts(postsData);
        setDataLoadingState(prev => ({ ...prev, posts: 'success' }));
        
        // Cache posts for offline use
        cacheDataForOffline('posts', postsData);
      } else {
        // If no posts found, use dummy data
        const dummyPosts = [
          {
            id: '1',
            content: 'Welcome to the community! This is a sample post.',
            createdAt: new Date(),
            authorId: userId,
            author: {
              firstName: userProfile?.firstName || 'User',
              lastName: userProfile?.lastName || '',
              photoURL: userProfile?.photoURL || '/images/default-avatar.png'
            },
            likesCount: 5,
            commentsCount: 2,
            isLiked: false,
            comments: [
              {
                userId: 'admin',
                userName: 'Community Admin',
                userPhoto: '/images/default-avatar.png',
                content: 'Welcome aboard! Feel free to ask any questions.',
                timestamp: new Date(Date.now() - 3600000)
              }
            ],
            likes: []
          },
          {
            id: '2',
            content: 'Check out our upcoming events and connect with other members!',
            createdAt: new Date(Date.now() - 86400000), // 1 day ago
            authorId: 'admin',
            author: {
              firstName: 'Community',
              lastName: 'Admin',
              photoURL: '/images/default-avatar.png'
            },
            likesCount: 10,
            commentsCount: 3,
            isLiked: true,
            comments: [
              {
                userId: 'user1',
                userName: 'Sarah Johnson',
                userPhoto: '/images/avatar1.jpg',
                content: 'Looking forward to the next workshop!',
                timestamp: new Date(Date.now() - 72000000)
              },
              {
                userId: 'user2',
                userName: 'Michael Chen',
                userPhoto: '/images/avatar2.jpg',
                content: 'Great initiative! Count me in.',
                timestamp: new Date(Date.now() - 43200000)
              }
            ],
            likes: [
              {
                userId: userId,
                timestamp: new Date(Date.now() - 32400000)
              }
            ]
          }
        ];
        
        setPosts(dummyPosts);
        setFilteredPosts(dummyPosts);
        setDataLoadingState(prev => ({ ...prev, posts: 'success' }));
        
        // Cache posts for offline use
        cacheDataForOffline('posts', dummyPosts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setDataLoadingState(prev => ({ ...prev, posts: 'error' }));
      
      // If offline, try to use cached data
      if (!navigator.onLine && cachedData.posts.length > 0) {
        setPosts(cachedData.posts);
        setFilteredPosts(cachedData.posts);
        setDataLoadingState(prev => ({ ...prev, posts: 'success' }));
      } else {
        setPosts([]);
        setFilteredPosts([]);
      }
    }
  };

  // Fetch events with error handling
  const fetchEvents = async (userId) => {
    try {
      setDataLoadingState(prev => ({ ...prev, events: 'loading' }));
      
      // Create dummy events
      const dummyEvents = [
        {
          id: '1',
          title: 'Web Development Workshop',
          eventDate: Timestamp.fromDate(new Date(Date.now() + 7 * 86400000)), // 7 days from now
          location: 'Virtual',
          organizerId: 'admin',
          organizer: {
            firstName: 'Community',
            lastName: 'Admin'
          },
          attendeesCount: 15,
          isAttending: false,
          imageUrl: '/images/webdev.jpg'
        },
        {
          id: '2',
          title: 'Networking Mixer',
          eventDate: Timestamp.fromDate(new Date(Date.now() + 14 * 86400000)), // 14 days from now
          location: 'Tech Hub Downtown',
          organizerId: 'admin',
          organizer: {
            firstName: 'Community',
            lastName: 'Admin'
          },
          attendeesCount: 28,
          isAttending: false,
          imageUrl: '/images/networking.jpg'
        }
      ];
      
      setEvents(dummyEvents);
      setDataLoadingState(prev => ({ ...prev, events: 'success' }));
      
      // Cache events for offline use
      cacheDataForOffline('events', dummyEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      setDataLoadingState(prev => ({ ...prev, events: 'error' }));
      
      // If offline, try to use cached data
      if (!navigator.onLine && cachedData.events.length > 0) {
        setEvents(cachedData.events);
        setDataLoadingState(prev => ({ ...prev, events: 'success' }));
      } else {
        setEvents([]);
      }
    }
  };

  // Fetch connections with error handling
  const fetchConnections = async (userId) => {
    try {
      setDataLoadingState(prev => ({ ...prev, connections: 'loading' }));
      
      // Create dummy connections
      const dummyConnections = [
        {
          id: '1',
          userId: userId,
          connectedUserId: 'user1',
          status: 'connected',
          user: {
            firstName: 'Sarah',
            lastName: 'Johnson',
            headline: 'Frontend Developer',
            photoURL: '/images/avatar1.jpg'
          }
        },
        {
          id: '2',
          userId: userId,
          connectedUserId: 'user2',
          status: 'connected',
          user: {
            firstName: 'Michael',
            lastName: 'Chen',
            headline: 'Data Scientist',
            photoURL: '/images/avatar2.jpg'
          }
        }
      ];
      
      setConnections(dummyConnections);
      setDataLoadingState(prev => ({ ...prev, connections: 'success' }));
      
      // Cache connections for offline use
      cacheDataForOffline('connections', dummyConnections);
    } catch (error) {
      console.error('Error fetching connections:', error);
      setDataLoadingState(prev => ({ ...prev, connections: 'error' }));
      
      // If offline, try to use cached data
      if (!navigator.onLine && cachedData.connections.length > 0) {
        setConnections(cachedData.connections);
        setDataLoadingState(prev => ({ ...prev, connections: 'success' }));
      } else {
        setConnections([]);
      }
    }
  };

  // Fetch recommended connections with error handling
  const fetchRecommendedConnections = async (userId) => {
    try {
      setDataLoadingState(prev => ({ ...prev, recommendations: 'loading' }));
      
      let dummyRecommendations = [];
      
      // Check if we should use profile-based recommendations
      if (userProfile && userProfile.isProfileComplete) {
        // Try to fetch real recommendations from Firestore based on profile
        // For now, create dummy recommendations based on profile info
        
        const interests = [];
        
        // Extract potential interests from headline and bio
        if (userProfile.headline) {
          const headlineWords = userProfile.headline.toLowerCase().split(/\s+/);
          // Look for job titles or skills
          ['developer', 'designer', 'manager', 'engineer', 'data', 'marketing', 'sales']
            .forEach(keyword => {
              if (headlineWords.includes(keyword)) {
                interests.push(keyword);
              }
            });
        }
        
        if (userProfile.bio) {
          const bioLower = userProfile.bio.toLowerCase();
          // Look for interests in bio
          ['technology', 'design', 'business', 'science', 'art', 'music', 'travel']
            .forEach(keyword => {
              if (bioLower.includes(keyword)) {
                interests.push(keyword);
              }
            });
        }
        
        // Create personalized recommendations based on interests
        dummyRecommendations = [
          {
            id: 'rec1',
            firstName: 'Jessica',
            lastName: 'Williams',
            headline: interests.includes('design') ? 'UX Designer at DesignCo' : 'UX Designer',
            photoURL: '/images/avatar3.jpg',
            matchReason: interests.length > 0 
              ? `Similar interest in ${interests[0]}` 
              : 'Based on your profile'
          },
          {
            id: 'rec2',
            firstName: 'David',
            lastName: 'Kim',
            headline: interests.includes('developer') ? 'Backend Developer at TechCorp' : 'Backend Developer',
            photoURL: '/images/avatar4.jpg',
            matchReason: interests.includes('developer') 
              ? 'Both of you are developers' 
              : 'You might know them'
          },
          {
            id: 'rec3',
            firstName: 'Emily',
            lastName: 'Garcia',
            headline: interests.includes('manager') ? 'Product Manager at InnovateCo' : 'Product Manager',
            photoURL: '/images/avatar5.jpg',
            matchReason: 'Similar professional background'
          },
          {
            id: 'rec4',
            firstName: 'Alex',
            lastName: 'Johnson',
            headline: interests.includes('data') ? 'Data Scientist at AnalyticsCo' : 'Data Scientist',
            photoURL: '/images/avatar6.jpg',
            matchReason: interests.includes('data') 
              ? 'Both interested in data' 
              : 'Recommended for you'
          },
          {
            id: 'rec5',
            firstName: 'Taylor',
            lastName: 'Martinez',
            headline: 'Marketing Specialist',
            photoURL: '/images/avatar7.jpg',
            matchReason: 'New member of the community'
          }
        ];
      } else {
        // Use general recommendations for users who skipped profile setup
        dummyRecommendations = [
          {
            id: 'rec1',
            firstName: 'Jessica',
            lastName: 'Williams',
            headline: 'UX Designer',
            photoURL: '/images/avatar3.jpg',
            matchReason: 'Popular community member'
          },
          {
            id: 'rec2',
            firstName: 'David',
            lastName: 'Kim',
            headline: 'Backend Developer',
            photoURL: '/images/avatar4.jpg',
            matchReason: 'Active in discussions'
          },
          {
            id: 'rec3',
            firstName: 'Emily',
            lastName: 'Garcia',
            headline: 'Product Manager',
            photoURL: '/images/avatar5.jpg',
            matchReason: 'New member'
          },
          {
            id: 'rec4',
            firstName: 'Alex',
            lastName: 'Johnson',
            headline: 'Data Scientist',
            photoURL: '/images/avatar6.jpg',
            matchReason: 'Community contributor'
          },
          {
            id: 'rec5',
            firstName: 'Taylor',
            lastName: 'Martinez',
            headline: 'Marketing Specialist',
            photoURL: '/images/avatar7.jpg',
            matchReason: 'You might know them'
          }
        ];
      }
      
      // Filter out users that are already connected
      const connectedUserIds = connections.map(conn => conn.connectedUserId);
      const filteredRecommendations = dummyRecommendations.filter(
        rec => !connectedUserIds.includes(rec.id)
      );
      
      // Shuffle the recommendations for variety
      const shuffled = [...filteredRecommendations].sort(() => 0.5 - Math.random());
      
      setRecommendedConnections(shuffled);
      setDataLoadingState(prev => ({ ...prev, recommendations: 'success' }));
      
      // Cache recommendations for offline use
      cacheDataForOffline('recommendations', shuffled);
      
    } catch (error) {
      console.error('Error fetching recommended connections:', error);
      setDataLoadingState(prev => ({ ...prev, recommendations: 'error' }));
      
      // If offline, try to use cached data
      if (!navigator.onLine && cachedData.recommendations.length > 0) {
        setRecommendedConnections(cachedData.recommendations);
        setDataLoadingState(prev => ({ ...prev, recommendations: 'success' }));
      } else {
        setRecommendedConnections([]);
      }
    }
  };

  // Fetch notifications with error handling
  const fetchNotifications = async (userId) => {
    try {
      setDataLoadingState(prev => ({ ...prev, notifications: 'loading' }));
      
      // Create dummy notifications
      const dummyNotifications = [
        {
          id: '1',
          userId: userId,
          content: 'Welcome to the community! Complete your profile to get started.',
          createdAt: Timestamp.fromDate(new Date()),
          read: false
        },
        {
          id: '2',
          userId: userId,
          content: 'New event: Web Development Workshop is happening next week.',
          createdAt: Timestamp.fromDate(new Date(Date.now() - 86400000)), // 1 day ago
          read: true
        }
      ];
      
      setNotifications(dummyNotifications);
      setUnreadNotifications(dummyNotifications.filter(n => !n.read).length);
      setDataLoadingState(prev => ({ ...prev, notifications: 'success' }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setDataLoadingState(prev => ({ ...prev, notifications: 'error' }));
      setNotifications([]);
      setUnreadNotifications(0);
    }
  };

  // Handle profile setup completion
  const handleProfileSetupComplete = async (profileData) => {
    setUserProfile(profileData);
    setShowProfileSetup(false);
    
    if (isNewUser) {
      setShowWelcomeBanner(true);
      setTimeout(() => setShowWelcomeBanner(false), 5000);
    }
    
    // Refresh data with the new profile
    loadDashboardData(user.uid);
  };

  // Handle post creation with offline support
  const handlePostCreated = async (newPost) => {
    if (!isOnline) {
      queueAction('create_post', newPost);
      setPosts(prevPosts => [
        { ...newPost, isPending: true },
        ...prevPosts
      ]);
      setFilteredPosts(prevPosts => [
        { ...newPost, isPending: true },
        ...prevPosts
      ]);
    } else {
      // Create post directly in Firestore
      try {
        const postRef = await addDoc(collection(db, 'posts'), {
          ...newPost,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          comments: [],
          likes: [],
          likesCount: 0,
          commentsCount: 0
        });
        
        // Update UI with new post
        const createdPost = {
          ...newPost,
          id: postRef.id,
          createdAt: new Date(),
          comments: [],
          likes: [],
          likesCount: 0,
          commentsCount: 0,
          isLiked: false
        };
        
        setPosts(prevPosts => [createdPost, ...prevPosts]);
        setFilteredPosts(prevPosts => [createdPost, ...prevPosts]);
      } catch (error) {
        console.error("Error creating post:", error);
        // Fallback to optimistic update if creation fails
        const fallbackPost = {
          ...newPost,
          id: `temp-${Date.now()}`,
          createdAt: new Date(),
          comments: [],
          likes: [],
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
          isPending: true
        };
        
        setPosts(prevPosts => [fallbackPost, ...prevPosts]);
        setFilteredPosts(prevPosts => [fallbackPost, ...prevPosts]);
      }
    }
    setShowCreatePost(false);
  };

  // Handle post like
  const handlePostLike = async (postId, isOptimistic = false) => {
    // Update UI optimistically
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1
            }
          : post
      )
    );

    setFilteredPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1
            }
          : post
      )
    );

    if (!isOnline) {
      // Queue for when back online
      queueAction('like_post', { postId });
      return;
    }

    // If online, update Firestore directly
    try {
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (postDoc.exists()) {
        const post = postDoc.data();
        const isLiked = post.likes?.some(like => like.userId === user.uid);
        
        if (isLiked) {
          // Remove like
          await updateDoc(postRef, {
            likes: arrayRemove({ userId: user.uid }),
            likesCount: increment(-1)
          });
        } else {
          // Add like
          await updateDoc(postRef, {
            likes: arrayUnion({ 
              userId: user.uid,
              timestamp: serverTimestamp()
            }),
            likesCount: increment(1)
          });
        }
      }
    } catch (error) {
      console.error("Error updating like:", error);
      // Revert UI change on error
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                isLiked: !post.isLiked,
                likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1
              }
            : post
        )
      );
      
      setFilteredPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                isLiked: !post.isLiked,
                likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1
              }
            : post
        )
      );
    }
  };

  // Handle post comment
  const handlePostComment = async (postId, commentText) => {
    if (!userProfile) return;
    
    // Create comment object
    const newComment = {
      userId: user.uid,
      userName: `${userProfile.firstName} ${userProfile.lastName}`,
      userPhoto: userProfile.photoURL,
      content: commentText,
      timestamp: new Date()
    };
    
    // Update UI optimistically
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? {
              ...post,
              comments: [...(post.comments || []), newComment],
              commentsCount: (post.commentsCount || 0) + 1
            }
          : post
      )
    );
    
    setFilteredPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? {
              ...post,
              comments: [...(post.comments || []), newComment],
              commentsCount: (post.commentsCount || 0) + 1
            }
          : post
      )
    );
    
    if (!isOnline) {
      // Queue for when back online
      queueAction('add_comment', { postId, commentText });
      return;
    }
    
    // If online, update Firestore directly
    try {
      const postRef = doc(db, 'posts', postId);
      
      await updateDoc(postRef, {
        comments: arrayUnion({
          userId: user.uid,
          userName: `${userProfile.firstName} ${userProfile.lastName}`,
          userPhoto: userProfile.photoURL || '/images/default-avatar.png',
          content: commentText,
          timestamp: serverTimestamp()
        }),
        commentsCount: increment(1)
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      // We could revert the optimistic update here, but for UX we'll leave it
      // and let the sync happen when back online
    }
  };

  // Handle post delete
  const handlePostDelete = async (postId) => {
    // Only allow users to delete their own posts
    const postToDelete = posts.find(post => post.id === postId);
    if (!postToDelete || postToDelete.authorId !== user.uid) {
      console.warn("Cannot delete post: not authorized");
      return;
    }
    
    // Remove from UI immediately
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    setFilteredPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    
    if (!isOnline) {
      // For pending posts, just remove from UI (they haven't been saved to Firestore yet)
      if (postToDelete.isPending) {
        // Filter out any pending actions for this post
        setPendingActions(prev => prev.filter(action => 
          action.type !== 'create_post' || action.data.id !== postId
        ));
      } else {
        // Queue delete for when back online
        queueAction('delete_post', { postId });
      }
      return;
    }
    
    // If online, delete from Firestore
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      // Add the post back to the UI
      setPosts(prevPosts => [postToDelete, ...prevPosts]);
      setFilteredPosts(prevPosts => 
        searchQuery.trim() === '' || 
        postToDelete.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        postToDelete.author?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        postToDelete.author?.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
          ? [postToDelete, ...prevPosts]
          : prevPosts
      );
    }
  };

  // Add this section to handle post display
  const renderPosts = () => {
    if (isLoading) return <LoadingSpinner />;
    
    return (
      <div className="content-feed">
        <div className="create-post">
          <div className="create-post-avatar">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt={userProfile?.firstName || 'User'} />
            ) : (
              <FaUserCircle size={40} />
            )}
          </div>
          <div className="create-post-input">
            <button 
              onClick={() => {
                console.log("Create post button clicked");
                setShowCreatePost(true);
              }}
              style={{ cursor: 'pointer' }}
            >
              What's on your mind, {userProfile?.firstName || 'User'}?
            </button>
          </div>
        </div>

        <div className="post-list">
          {filteredPosts.length > 0 ? (
            filteredPosts.map(post => (
              <PostCard 
                key={post.id}
                post={post}
                currentUser={user}
                userProfile={userProfile}
                onLike={() => handlePostLike(post.id)}
                onComment={handlePostComment}
                onDelete={post.authorId === user?.uid ? () => handlePostDelete(post.id) : null}
                isOffline={!isOnline}
              />
            ))
          ) : (
            <div className="card">
              <div className="card-body" style={{textAlign: 'center', padding: '40px 20px'}}>
                {searchQuery ? (
                  <>
                    <FaExclamationCircle size={32} style={{color: '#6c757d', marginBottom: '15px'}} />
                    <h3>No posts found</h3>
                    <p>No posts matching "{searchQuery}" were found.</p>
                    <button 
                      className="secondary-button" 
                      onClick={() => setSearchQuery('')}
                      style={{marginTop: '10px'}}
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <FaEdit size={32} style={{color: '#6c757d', marginBottom: '15px'}} />
                    <h3>No posts yet</h3>
                    <p>Be the first to share something with the community!</p>
                    <button 
                      className="primary-button" 
                      onClick={() => setShowCreatePost(true)}
                      style={{marginTop: '10px'}}
                    >
                      Create a post
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Update the renderConnections function in Dashboard component
  const renderConnections = () => {
    return (
      <div className="connections-section card">
        <div className="card-header">
          <h2>Your Connections</h2>
          <button 
            className="secondary-button"
            onClick={() => setActiveTab('connections')}
          >
            View All
          </button>
        </div>
        <div className="card-body">
          {connections.length > 0 ? (
            <div className="connections-list">
              {connections.slice(0, 3).map(connection => (
                <ConnectionCard 
                  key={connection.id}
                  connection={connection}
                  isOffline={!isOnline}
                />
              ))}
            </div>
          ) : (
            <div className="empty-connections" style={{textAlign: 'center', padding: '20px'}}>
              <FaUserFriends size={24} style={{color: '#6c757d', marginBottom: '10px'}} />
              <p>No connections yet</p>
              <button 
                className="primary-button" 
                onClick={() => setActiveTab('discover')}
                style={{marginTop: '10px'}}
              >
                Discover people
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add a new function to render connection recommendations
  const renderRecommendations = () => {
    return (
      <div className="recommendations-section card">
        <div className="card-header">
          <h2>People You May Know</h2>
        </div>
        <div className="card-body">
          {recommendedConnections.length > 0 ? (
            <div className="recommendations-list">
              {recommendedConnections.slice(0, 3).map(recommendation => (
                <ConnectionRecommendation
                  key={recommendation.id}
                  recommendation={recommendation}
                  onConnect={handleConnect}
                  isOffline={!isOnline}
                />
              ))}
            </div>
          ) : (
            <div style={{textAlign: 'center', padding: '20px'}}>
              <FaUserFriends size={24} style={{color: '#6c757d', marginBottom: '10px'}} />
              <p>No recommendations available</p>
              <p className="small-text">Complete your profile to get personalized recommendations</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add this connection handler to the Dashboard component
  const handleConnect = async (userId, isOptimistic = false) => {
    if (!user) return;
    
    // Find the recommendation
    const recommendation = recommendedConnections.find(rec => rec.id === userId);
    if (!recommendation) return;
    
    // Create connection object
    const newConnection = {
      id: `connection-${Date.now()}`,
      userId: user.uid,
      connectedUserId: userId,
      status: 'connected',
      createdAt: new Date(),
      user: {
        firstName: recommendation.firstName,
        lastName: recommendation.lastName,
        headline: recommendation.headline || 'Community Member',
        photoURL: recommendation.photoURL
      }
    };
    
    // Update UI optimistically
    setConnections(prev => [newConnection, ...prev]);
    
    // Remove from recommendations
    setRecommendedConnections(prev => 
      prev.filter(rec => rec.id !== userId)
    );
    
    if (!isOnline) {
      // Queue for when back online
      queueAction('connect_user', { userId, connectionData: newConnection });
      return;
    }
    
    try {
      // Create connection in Firestore
      const connectionRef = collection(db, 'connections');
      await addDoc(connectionRef, {
        userId: user.uid,
        connectedUserId: userId,
        status: 'connected',
        createdAt: serverTimestamp()
      });
      
      // Could also add notifications for the other user here
      // or handle this with a cloud function
    } catch (error) {
      console.error("Error creating connection:", error);
      // Revert optimistic update
      setConnections(prev => prev.filter(conn => conn.id !== newConnection.id));
      setRecommendedConnections(prev => [recommendation, ...prev]);
    }
  };

  // Update the return statement to include the new components
  return (
    <ErrorBoundary>
      <div className="dashboard-container">
        <DashboardSidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          notificationsCount={unreadNotifications}
          isOffline={!isOnline}
        />
        
        <main className="dashboard-main">
          {showNetworkBanner && (
            <NetworkStatusBanner 
              isOnline={isOnline} 
              onRetry={retryConnection} 
            />
          )}
          
          {showWelcomeBanner && userProfile && (
            <WelcomeBanner 
              user={userProfile} 
              onDismiss={() => setShowWelcomeBanner(false)} 
            />
          )}
          
          <div className="dashboard-header">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="header-actions">
              <div className="user-profile-dropdown">
                <button 
                  className="user-avatar"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  aria-label="User menu"
                >
                  {userProfile?.photoURL ? (
                    <img 
                      src={userProfile.photoURL} 
                      alt={userProfile?.firstName || 'User'} 
                    />
                  ) : (
                    <FaUserCircle />
                  )}
                </button>
                
                {showUserDropdown && userProfile && (
                  <div className="user-menu">
                    <div className="user-info">
                      <h3>{userProfile.firstName} {userProfile.lastName}</h3>
                      <p>{userProfile.email}</p>
                    </div>
                    <ul>
                      <li onClick={() => setActiveTab('profile')}>
                        <button>
                          View Profile
                        </button>
                      </li>
                      <li onClick={() => auth.signOut()}>
                        <button>
                          <FaSignOutAlt /> Sign Out
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-content">
            {activeTab === 'feed' && (
              <>
                {renderPosts()}
                <div className="content-sidebar">
                  {/* Events section */}
                  <div className="events-section card">
                    {/* ... existing events code ... */}
                  </div>
                  
                  {renderConnections()}
                  
                  {/* Add the recommendations section */}
                  {renderRecommendations()}
                </div>
              </>
            )}
          </div>
        </main>

        {/* CreatePostModal */}
        <AnimatePresence>
          {showCreatePost && user && (
            <CreatePostModal
              user={{
                uid: user.uid,
                firstName: userProfile?.firstName || 'User',
                lastName: userProfile?.lastName || '',
                photoURL: userProfile?.photoURL || '/images/default-avatar.png',
              }}
              onClose={() => {
                console.log("Closing create post modal");
                setShowCreatePost(false);
              }}
              onSubmit={handlePostCreated}
              isOffline={!isOnline}
            />
          )}
        </AnimatePresence>

        {/* ProfileSetupModal */}
        <AnimatePresence>
          {showProfileSetup && (
            <ProfileSetupModal
              user={user}
              onComplete={handleProfileSetupComplete}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;