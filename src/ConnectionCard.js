import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaUserPlus, FaCheck, FaTimes, FaEllipsisH, FaUserCircle } from 'react-icons/fa';
import { doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import './ConnectionCard.css';

const ConnectionCard = ({ connection, isOffline }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(connection.status === 'connected' ? 'connected' : 'none');
  const [isLoading, setIsLoading] = useState(false);

  if (!connection) return null;

  const handleConnect = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (connectionStatus === 'none') {
        // Send connection request
        await setDoc(doc(db, 'connections', `${connection.userId}_${connection.connectedUserId}`), {
          userId: connection.userId,
          connectedUserId: connection.connectedUserId,
          status: 'pending',
          createdAt: Timestamp.now()
        });
        setConnectionStatus('pending');
      } else if (connectionStatus === 'pending') {
        // Cancel connection request
        await deleteDoc(doc(db, 'connections', `${connection.userId}_${connection.connectedUserId}`));
        setConnectionStatus('none');
      } else if (connectionStatus === 'connected') {
        // Remove connection
        await deleteDoc(doc(db, 'connections', `${connection.userId}_${connection.connectedUserId}`));
        await deleteDoc(doc(db, 'connections', `${connection.connectedUserId}_${connection.userId}`));
        setConnectionStatus('none');
      }
    } catch (error) {
      console.error('Error updating connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // Accept connection request
      await setDoc(doc(db, 'connections', `${connection.userId}_${connection.connectedUserId}`), {
        userId: connection.userId,
        connectedUserId: connection.connectedUserId,
        status: 'connected',
        createdAt: Timestamp.now()
      });
      
      // Update the original request
      await setDoc(doc(db, 'connections', `${connection.connectedUserId}_${connection.userId}`), {
        userId: connection.connectedUserId,
        connectedUserId: connection.userId,
        status: 'connected',
        createdAt: Timestamp.now()
      }, { merge: true });
      
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error accepting connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // Delete connection request
      await deleteDoc(doc(db, 'connections', `${connection.connectedUserId}_${connection.userId}`));
      setConnectionStatus('none');
    } catch (error) {
      console.error('Error declining connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      className="connection-card"
      whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)' }}
      transition={{ duration: 0.2 }}
    >
      <div className="connection-avatar">
        {connection.user.photoURL ? (
          <img src={connection.user.photoURL} alt={connection.user.firstName} />
        ) : (
          <FaUserCircle size={40} />
        )}
      </div>
      
      <div className="connection-info">
        <h4>{connection.user.firstName} {connection.user.lastName}</h4>
        
        {connection.user.headline && (
          <p className="connection-headline">{connection.user.headline}</p>
        )}
      </div>
      
      <div className="connection-actions">
        {connectionStatus === 'none' && (
          <button 
            className="connect-button"
            onClick={handleConnect}
            disabled={isLoading || isOffline}
          >
            <FaUserPlus />
            <span>Connect</span>
          </button>
        )}
        
        {connectionStatus === 'pending' && (
          <button 
            className="pending-button"
            onClick={handleConnect}
            disabled={isLoading || isOffline}
          >
            <span>Pending</span>
          </button>
        )}
        
        {connectionStatus === 'request' && (
          <div className="request-actions">
            <button 
              className="accept-button"
              onClick={handleAccept}
              disabled={isLoading || isOffline}
            >
              <FaCheck />
            </button>
            <button 
              className="decline-button"
              onClick={handleDecline}
              disabled={isLoading || isOffline}
            >
              <FaTimes />
            </button>
          </div>
        )}
        
        {connectionStatus === 'connected' && (
          <div className="connected-actions">
            <span className="connected-label">Connected</span>
            <div className="connection-menu">
              <button 
                className="menu-button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <FaEllipsisH />
              </button>
              
              {isMenuOpen && (
                <div className="menu-dropdown">
                  <button 
                    className="menu-item remove"
                    onClick={handleConnect}
                  >
                    Remove Connection
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ConnectionCard;
