import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaUserPlus, FaCheck, FaTimes, FaEllipsisH, FaUserCircle } from 'react-icons/fa';
import API from './services/api';
import './css/ConnectionCard.css';

const ConnectionCard = ({ connection, isOffline, onRemoved }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    connection.status === 'connected' ? 'connected' : 'none'
  );
  const [isLoading, setIsLoading] = useState(false);

  if (!connection) return null;

  const handleRemove = async () => {
    if (isLoading || isOffline) return;
    setIsLoading(true);
    try {
      await API.delete(`/connections/${connection.id}`);
      setConnectionStatus('none');
      setIsMenuOpen(false);
      if (onRemoved) onRemoved(connection.id);
    } catch (error) {
      console.error('Error removing connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (isLoading || isOffline) return;
    setIsLoading(true);
    try {
      await API.patch(`/connections/${connection.id}`, { action: 'accept' });
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error accepting connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    if (isLoading || isOffline) return;
    setIsLoading(true);
    try {
      await API.patch(`/connections/${connection.id}`, { action: 'reject' });
      setConnectionStatus('none');
      if (onRemoved) onRemoved(connection.id);
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
        {connection.user?.photoURL ? (
          <img src={connection.user.photoURL} alt={connection.user.firstName} />
        ) : (
          <FaUserCircle size={40} />
        )}
      </div>

      <div className="connection-info">
        <h4>{connection.user?.firstName} {connection.user?.lastName}</h4>
        {connection.user?.headline && (
          <p className="connection-headline">{connection.user.headline}</p>
        )}
      </div>

      <div className="connection-actions">
        {connectionStatus === 'none' && (
          <button className="connect-button" disabled={isLoading || isOffline}>
            <FaUserPlus />
            <span>Connect</span>
          </button>
        )}

        {connectionStatus === 'pending' && (
          <button className="pending-button" disabled={isLoading || isOffline}>
            <span>Pending</span>
          </button>
        )}

        {connectionStatus === 'request' && (
          <div className="request-actions">
            <button className="accept-button" onClick={handleAccept} disabled={isLoading || isOffline}>
              <FaCheck />
            </button>
            <button className="decline-button" onClick={handleDecline} disabled={isLoading || isOffline}>
              <FaTimes />
            </button>
          </div>
        )}

        {connectionStatus === 'connected' && (
          <div className="connected-actions">
            <span className="connected-label">Connected</span>
            <div className="connection-menu">
              <button className="menu-button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <FaEllipsisH />
              </button>
              {isMenuOpen && (
                <div className="menu-dropdown">
                  <button className="menu-item remove" onClick={handleRemove} disabled={isLoading}>
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
