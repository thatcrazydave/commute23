import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCalendarAlt, FaMapMarkerAlt, FaClock, FaArrowLeft, FaHeart, FaRegHeart, FaShare, FaTicketAlt, FaUserFriends } from 'react-icons/fa';
import API from './services/api';
import { useAuth } from './contexts/AuthContext';
import './css/eventDetail.css';

const EventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized } = useAuth();

  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAttending, setIsAttending] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [attendeesCount, setAttendeesCount] = useState(0);
  const [isJoining, setIsJoining] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      navigate('/login', { state: { message: 'Please log in to view event details', type: 'info' } });
    }
  }, [isInitialized, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchEvent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data } = await API.get(`/events/${eventId}`);
        if (data.success) {
          setEvent(data.data.event);
          setIsAttending(data.data.event.isAttending || false);
          setIsFavorite(data.data.event.isFavorite || false);
          setAttendeesCount(data.data.event.attendeesCount || 0);
        } else {
          setError('Event not found');
        }
      } catch (err) {
        setError('Failed to load event details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvent();
  }, [eventId, isAuthenticated]);

  const formatDate = (val) => {
    if (!val) return 'Date not available';
    const date = new Date(val);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(date);
  };

  const toggleAttendance = async () => {
    if (isJoining) return;
    setIsJoining(true);
    try {
      const { data } = await API.post(`/events/${eventId}/attend`);
      if (data.success) {
        setIsAttending(data.data.isAttending);
        setAttendeesCount(data.data.attendeesCount);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message;
      if (msg === 'Event is at full capacity') alert(msg);
      else console.error('Error updating attendance:', err);
    } finally {
      setIsJoining(false);
    }
  };

  const toggleFavorite = async () => {
    setIsFavorite(f => !f);
    try {
      const { data } = await API.post(`/events/${eventId}/favorite`);
      if (data.success) setIsFavorite(data.data.isFavorite);
    } catch (err) {
      setIsFavorite(f => !f);
    }
  };

  const copyEventLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(err => console.error('Failed to copy link:', err));
  };

  const shareOnSocial = (platform) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(event?.title || 'Check out this event');
    const links = {
      twitter: `https://twitter.com/intent/tweet?text=${title}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };
    if (links[platform]) window.open(links[platform], '_blank', 'width=600,height=400');
    setShowShareOptions(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5, when: 'beforeChildren', staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.3 } },
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <motion.div className="loading-spinner" animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
          <div className="spinner-inner"></div>
        </motion.div>
        <p>Loading event details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Oops!</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/events')}>Back to Events</button>
      </div>
    );
  }

  if (!event) return null;

  const eventPassed = event.date && new Date(event.date) < new Date();

  return (
    <div className="event-detail-page">
      <motion.div className="event-detail-container" initial="hidden" animate="visible" variants={containerVariants}>
        <motion.button className="back-button" onClick={() => navigate('/events')} variants={itemVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <FaArrowLeft /> Back to Events
        </motion.button>

        <div className="event-detail-content">
          <motion.div className="event-detail-header" variants={itemVariants}>
            <div className="event-image-container">
              <img src={event.imageUrl || 'https://via.placeholder.com/1200x400?text=Event+Banner'} alt={event.title} className="event-detail-image" />
              <div className="event-actions">
                <button className={`action-button favorite-button ${isFavorite ? 'active' : ''}`} onClick={toggleFavorite}>
                  {isFavorite ? <FaHeart /> : <FaRegHeart />}
                  <span>{isFavorite ? 'Saved' : 'Save'}</span>
                </button>
                <div className="share-container">
                  <button className="action-button share-button" onClick={() => setShowShareOptions(s => !s)}>
                    <FaShare /><span>Share</span>
                  </button>
                  {showShareOptions && (
                    <motion.div className="share-options" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                      <button className="share-option copy-link" onClick={copyEventLink}>{copied ? 'Copied!' : 'Copy Link'}</button>
                      <button className="share-option twitter" onClick={() => shareOnSocial('twitter')}>Twitter</button>
                      <button className="share-option facebook" onClick={() => shareOnSocial('facebook')}>Facebook</button>
                      <button className="share-option linkedin" onClick={() => shareOnSocial('linkedin')}>LinkedIn</button>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
            <div className="event-category-tag">{event.category}</div>
            <h1 className="event-detail-title">{event.title}</h1>
          </motion.div>

          <div className="event-detail-body">
            <motion.div className="event-main-info" variants={itemVariants}>
              <div className="event-info-section">
                <h2>About this event</h2>
                <p className="event-description">{event.description}</p>
              </div>
              <div className="event-info-section">
                <h2>Date and Time</h2>
                <div className="info-item">
                  <FaCalendarAlt className="info-icon" />
                  <div><p className="info-label">Date</p><p className="info-value">{formatDate(event.date)}</p></div>
                </div>
                <div className="info-item">
                  <FaClock className="info-icon" />
                  <div><p className="info-label">Duration</p><p className="info-value">{event.duration || '2 hours'}</p></div>
                </div>
              </div>
              <div className="event-info-section">
                <h2>Location</h2>
                <div className="info-item">
                  <FaMapMarkerAlt className="info-icon" />
                  <div>
                    <p className="info-label">{event.isVirtual ? 'Online Event' : 'Venue'}</p>
                    <p className="info-value">{event.location}</p>
                  </div>
                </div>
              </div>
              <div className="event-info-section">
                <h2>Attendees</h2>
                <div className="info-item">
                  <FaUserFriends className="info-icon" />
                  <p>{attendeesCount} people attending</p>
                </div>
              </div>
            </motion.div>

            <motion.div className="event-sidebar" variants={itemVariants}>
              <div className="event-registration-card">
                <div className="registration-header">
                  <div className={`event-price ${!event.price || event.price === 0 ? 'free' : ''}`}>
                    {!event.price || event.price === 0 ? 'Free' : `$${event.price}`}
                  </div>
                </div>
                <div className="registration-body">
                  <div className="registration-info">
                    <FaTicketAlt className="registration-icon" />
                    <div>
                      <p className="registration-label">Registration</p>
                      <p className="registration-value">Open until event starts</p>
                    </div>
                  </div>
                  {event.capacity && (
                    <div className="spots-left">
                      <p>{Math.max(0, event.capacity - attendeesCount)} spots left</p>
                      <div className="capacity-bar">
                        <div className="capacity-fill" style={{ width: `${Math.min(100, (attendeesCount / event.capacity) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                  <button
                    className={`register-button ${isAttending ? 'registered' : ''} ${eventPassed ? 'disabled' : ''}`}
                    onClick={toggleAttendance}
                    disabled={isJoining || eventPassed}
                  >
                    {isJoining ? 'Processing...' : eventPassed ? 'Event has ended' : isAttending ? 'Cancel Registration' : 'Register Now'}
                  </button>
                  {isAttending && (
                    <div className="registration-confirmation">
                      <p>You're registered for this event!</p>
                      {event.isVirtual && event.registrationLink && (
                        <a href={event.registrationLink} target="_blank" rel="noopener noreferrer" className="join-link">Join Online Event</a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EventDetail;
