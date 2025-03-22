import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';

const TestResult = ({ label, status, error, data, duration }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="test-result" style={{ 
      margin: '10px 0',
      padding: '10px',
      borderRadius: '4px',
      backgroundColor: status === 'success' ? '#e6f7e6' : 
                       status === 'pending' ? '#fff9e6' : 
                       status === 'error' ? '#ffebee' : '#f5f5f5'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 'bold' }}>{label}</span>
          {duration && <span style={{ marginLeft: '10px', fontSize: '0.8em', color: '#666' }}>
            ({duration}ms)
          </span>}
        </div>
        <div style={{ 
          padding: '3px 8px', 
          borderRadius: '12px', 
          fontSize: '0.8em',
          backgroundColor: status === 'success' ? '#4caf50' : 
                           status === 'pending' ? '#ff9800' : 
                           status === 'error' ? '#f44336' : '#9e9e9e',
          color: 'white'
        }}>
          {status}
        </div>
      </div>
      
      {error && (
        <div style={{ 
          marginTop: '8px', 
          padding: '8px', 
          backgroundColor: 'rgba(244, 67, 54, 0.1)', 
          borderRadius: '4px',
          fontSize: '0.9em',
          fontFamily: 'monospace'
        }}>
          {error.toString()}
        </div>
      )}
      
      {data && (
        <div style={{ marginTop: '8px' }}>
          <button 
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '0.8em'
            }}
          >
            {expanded ? 'Hide Data' : 'Show Data'}
          </button>
          
          {expanded && (
            <pre style={{ 
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '0.85em',
              fontFamily: 'monospace'
            }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

const DashboardNetworkTest = () => {
  const [tests, setTests] = useState({
    firebaseInit: { status: 'pending', data: null, error: null, duration: null },
    authState: { status: 'pending', data: null, error: null, duration: null },
    userProfile: { status: 'pending', data: null, error: null, duration: null },
    posts: { status: 'pending', data: null, error: null, duration: null },
    events: { status: 'pending', data: null, error: null, duration: null },
    connections: { status: 'pending', data: null, error: null, duration: null },
    recommendations: { status: 'pending', data: null, error: null, duration: null },
    notifications: { status: 'pending', data: null, error: null, duration: null }
  });
  
  const [user, setUser] = useState(null);
  const [overallStatus, setOverallStatus] = useState('pending');
  const [runTests, setRunTests] = useState(false);
  
  // Update a specific test result
  const updateTest = (testName, update) => {
    setTests(prev => ({
      ...prev,
      [testName]: {
        ...prev[testName],
        ...update
      }
    }));
  };
  
  // Check Firebase initialization
  useEffect(() => {
    const startTime = performance.now();
    
    try {
      // Check if Firebase objects exist
      if (auth && db) {
        updateTest('firebaseInit', { 
          status: 'success', 
          data: { 
            authInitialized: !!auth,
            dbInitialized: !!db
          }, 
          duration: Math.round(performance.now() - startTime)
        });
      } else {
        updateTest('firebaseInit', { 
          status: 'error', 
          error: new Error('Firebase not properly initialized'), 
          duration: Math.round(performance.now() - startTime)
        });
      }
    } catch (error) {
      updateTest('firebaseInit', { 
        status: 'error', 
        error, 
        duration: Math.round(performance.now() - startTime)
      });
    }
  }, []);
  
  // Check authentication state
  useEffect(() => {
    if (!runTests) return;
    
    const startTime = performance.now();
    updateTest('authState', { status: 'pending' });
    
    const unsubscribe = onAuthStateChanged(auth, 
      (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          updateTest('authState', { 
            status: 'success', 
            data: {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              emailVerified: currentUser.emailVerified
            }, 
            duration: Math.round(performance.now() - startTime)
          });
        } else {
          updateTest('authState', { 
            status: 'error', 
            error: new Error('No user logged in'), 
            duration: Math.round(performance.now() - startTime)
          });
        }
      }, 
      (error) => {
        updateTest('authState', { 
          status: 'error', 
          error, 
          duration: Math.round(performance.now() - startTime)
        });
      }
    );
    
    return () => unsubscribe();
  }, [runTests]);
  
  // Fetch user profile
  useEffect(() => {
    if (!user || !runTests) return;
    
    const fetchUserProfile = async () => {
      const startTime = performance.now();
      updateTest('userProfile', { status: 'pending' });
      
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const profileData = userDocSnap.data();
          updateTest('userProfile', { 
            status: 'success', 
            data: profileData, 
            duration: Math.round(performance.now() - startTime)
          });
        } else {
          updateTest('userProfile', { 
            status: 'error', 
            error: new Error('User document does not exist'), 
            duration: Math.round(performance.now() - startTime)
          });
        }
      } catch (error) {
        updateTest('userProfile', { 
          status: 'error', 
          error, 
          duration: Math.round(performance.now() - startTime)
        });
      }
    };
    
    fetchUserProfile();
  }, [user, runTests]);
  
  // Fetch posts
  useEffect(() => {
    if (!user || !runTests) return;
    
    const fetchPosts = async () => {
      const startTime = performance.now();
      updateTest('posts', { status: 'pending' });
      
      try {
        // Try to fetch posts from Firestore
        const postsQuery = query(
          collection(db, 'posts'),
          where('visibility', '==', 'public'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const querySnapshot = await getDocs(postsQuery);
        const postsData = [];
        
        querySnapshot.forEach((doc) => {
          postsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        updateTest('posts', { 
          status: 'success', 
          data: postsData, 
          duration: Math.round(performance.now() - startTime)
        });
      } catch (error) {
        updateTest('posts', { 
          status: 'error', 
          error, 
          duration: Math.round(performance.now() - startTime)
        });
      }
    };
    
    fetchPosts();
  }, [user, runTests]);
  
  // Fetch events
  useEffect(() => {
    if (!user || !runTests) return;
    
    const fetchEvents = async () => {
      const startTime = performance.now();
      updateTest('events', { status: 'pending' });
      
      try {
        const now = Timestamp.now();
        
        const eventsQuery = query(
          collection(db, 'events'),
          where('date', '>=', now),
          orderBy('date', 'asc'),
          limit(5)
        );
        
        const querySnapshot = await getDocs(eventsQuery);
        const eventsData = [];
        
        querySnapshot.forEach((doc) => {
          eventsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        updateTest('events', { 
          status: 'success', 
          data: eventsData, 
          duration: Math.round(performance.now() - startTime)
        });
      } catch (error) {
        updateTest('events', { 
          status: 'error', 
          error, 
          duration: Math.round(performance.now() - startTime)
        });
      }
    };
    
    fetchEvents();
  }, [user, runTests]);
  
  // Fetch connections
  useEffect(() => {
    if (!user || !runTests) return;
    
    const fetchConnections = async () => {
      const startTime = performance.now();
      updateTest('connections', { status: 'pending' });
      
      try {
        const connectionsQuery = query(
          collection(db, 'connections'),
          where('userId', '==', user.uid),
          where('status', '==', 'connected'),
          limit(5)
        );
        
        const querySnapshot = await getDocs(connectionsQuery);
        const connectionsData = [];
        
        querySnapshot.forEach((doc) => {
          connectionsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        updateTest('connections', { 
          status: 'success', 
          data: connectionsData, 
          duration: Math.round(performance.now() - startTime)
        });
      } catch (error) {
        updateTest('connections', { 
          status: 'error', 
          error, 
          duration: Math.round(performance.now() - startTime)
        });
      }
    };
    
    fetchConnections();
  }, [user, runTests]);
  
  // Fetch recommended connections
  useEffect(() => {
    if (!user || !runTests) return;
    
    const fetchRecommendedConnections = async () => {
      const startTime = performance.now();
      updateTest('recommendations', { status: 'pending' });
      
      try {
        // This is a simplified version - in reality you might have a more complex query
        const usersQuery = query(
          collection(db, 'users'),
          limit(5)
        );
        
        const querySnapshot = await getDocs(usersQuery);
        const recommendationsData = [];
        
        querySnapshot.forEach((doc) => {
          if (doc.id !== user.uid) {  // Don't recommend the current user
            recommendationsData.push({
              id: doc.id,
              ...doc.data()
            });
          }
        });
        
        updateTest('recommendations', { 
          status: 'success', 
          data: recommendationsData, 
          duration: Math.round(performance.now() - startTime)
        });
      } catch (error) {
        updateTest('recommendations', { 
          status: 'error', 
          error, 
          duration: Math.round(performance.now() - startTime)
        });
      }
    };
    
    fetchRecommendedConnections();
  }, [user, runTests]);
  
  // Fetch notifications
  useEffect(() => {
    if (!user || !runTests) return;
    
    const fetchNotifications = async () => {
      const startTime = performance.now();
      updateTest('notifications', { status: 'pending' });
      
      try {
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const querySnapshot = await getDocs(notificationsQuery);
        const notificationsData = [];
        
        querySnapshot.forEach((doc) => {
          notificationsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        updateTest('notifications', { 
          status: 'success', 
          data: notificationsData, 
          duration: Math.round(performance.now() - startTime)
        });
      } catch (error) {
        updateTest('notifications', { 
          status: 'error', 
          error, 
          duration: Math.round(performance.now() - startTime)
        });
      }
    };
    
    fetchNotifications();
  }, [user, runTests]);
  
  // Calculate overall status
  useEffect(() => {
    const statuses = Object.values(tests).map(test => test.status);
    
    if (statuses.includes('error')) {
      setOverallStatus('error');
    } else if (statuses.includes('pending')) {
      setOverallStatus('pending');
    } else {
      setOverallStatus('success');
    }
  }, [tests]);
  
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>Dashboard Network Test</h1>
      
      <div style={{ 
        padding: '15px', 
        marginBottom: '20px', 
        borderRadius: '4px',
        backgroundColor: overallStatus === 'success' ? '#e6f7e6' : 
                         overallStatus === 'pending' ? '#fff9e6' : 
                         overallStatus === 'error' ? '#ffebee' : '#f5f5f5',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0 }}>Overall Status: {overallStatus.toUpperCase()}</h2>
          <p style={{ margin: '5px 0 0 0' }}>
            {overallStatus === 'success' ? 'All tests passed! Your Dashboard should load correctly.' :
             overallStatus === 'pending' ? 'Tests are still running...' :
             'Some tests failed. Check the details below to identify the issues.'}
          </p>
        </div>
        
        <button 
          onClick={() => setRunTests(true)}
          disabled={runTests}
          style={{
            padding: '10px 20px',
            backgroundColor: runTests ? '#ccc' : '#4285F4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: runTests ? 'default' : 'pointer',
            fontSize: '16px'
          }}
        >
          {runTests ? 'Tests Running...' : 'Run Tests'}
        </button>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Firebase Initialization</h3>
        <TestResult 
          label="Firebase Auth & Firestore" 
          status={tests.firebaseInit.status}
          error={tests.firebaseInit.error}
          data={tests.firebaseInit.data}
          duration={tests.firebaseInit.duration}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Authentication</h3>
        <TestResult 
          label="Auth State" 
          status={tests.authState.status}
          error={tests.authState.error}
          data={tests.authState.data}
          duration={tests.authState.duration}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>User Data</h3>
        <TestResult 
          label="User Profile" 
          status={tests.userProfile.status}
          error={tests.userProfile.error}
          data={tests.userProfile.data}
          duration={tests.userProfile.duration}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Dashboard Content</h3>
        <TestResult 
          label="Posts" 
          status={tests.posts.status}
          error={tests.posts.error}
          data={tests.posts.data}
          duration={tests.posts.duration}
        />
        
        <TestResult 
          label="Events" 
          status={tests.events.status}
          error={tests.events.error}
          data={tests.events.data}
          duration={tests.events.duration}
        />
        
        <TestResult 
          label="Connections" 
          status={tests.connections.status}
          error={tests.connections.error}
          data={tests.connections.data}
          duration={tests.connections.duration}
        />
        
        <TestResult 
          label="Recommended Connections" 
          status={tests.recommendations.status}
          error={tests.recommendations.error}
          data={tests.recommendations.data}
          duration={tests.recommendations.duration}
        />
        
        <TestResult 
          label="Notifications" 
          status={tests.notifications.status}
          error={tests.notifications.error}
          data={tests.notifications.data}
          duration={tests.notifications.duration}
        />
      </div>
      
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3>Troubleshooting Tips</h3>
        <ul style={{ paddingLeft: '20px' }}>
          <li>If <strong>Firebase Initialization</strong> fails, check your Firebase configuration in your project.</li>
          <li>If <strong>Auth State</strong> fails, make sure you're logged in and your Firebase Authentication is set up correctly.</li>
          <li>If <strong>User Profile</strong> fails, check if your user document exists in Firestore.</li>
          <li>If other tests fail, check your Firestore security rules and database structure.</li>
          <li>Look at the error messages and durations to identify bottlenecks or issues.</li>
        </ul>
      </div>
    </div>
  );
};

export default DashboardNetworkTest;
