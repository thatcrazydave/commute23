import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FaCalendarAlt, FaMapMarkerAlt, FaClock, FaUser, FaArrowLeft, FaHeart, FaRegHeart, FaShare, FaTicketAlt, FaMapMarked, FaUserFriends } from 'react-icons/fa';
import './eventDetail.css';

const EventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isAttending, setIsAttending] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [isJoining, setIsJoining] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Redirect to login if not authenticated
        navigate('/login', { 
          state: { 
            message: 'Please log in to view event details', 
            type: 'info' 
          } 
        });
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);

  // Fetch event details
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);
        
        if (eventSnap.exists()) {
          const eventData = {
            id: eventSnap.id,
            ...eventSnap.data()
          };
          
          setEvent(eventData);
          
          // Check if user is attending
          const attendeesList = eventData.attendees || [];
          setAttendees(attendeesList);
          setIsAttending(attendeesList.includes(user.uid));
          
          // Check if event is in user's favorites
          const userFavoritesRef = doc(db, 'users', user.uid, 'favoriteEvents', eventId);
          const favoriteSnap = await getDoc(userFavoritesRef);
          setIsFavorite(favoriteSnap.exists());
        } else {
          setError('Event not found');
        }
      } catch (err) {
        console.error('Error fetching event details:', err);
        setError('Failed to load event details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchEventDetails();
    }
  }, [eventId, user]);

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date not available';
    
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Toggle attendance status
  const toggleAttendance = async () => {
    if (!user || isJoining) return;
    
    setIsJoining(true);
    
    try {
      const eventRef = doc(db, 'events', eventId);
      
      if (isAttending) {
        // Leave event
        await updateDoc(eventRef, {
          attendees: arrayRemove(user.uid)
        });
        
        // Remove from user's attending events
        const userEventRef = doc(db, 'users', user.uid, 'attendingEvents', eventId);
        await deleteDoc(userEventRef);
        
        setIsAttending(false);
        setAttendees(attendees.filter(id => id !== user.uid));
      } else {
        // Join event
        await updateDoc(eventRef, {
          attendees: arrayUnion(user.uid)
        });
        
        // Add to user's attending events
        const userEventRef = doc(db, 'users', user.uid, 'attendingEvents', eventId);
        await setDoc(userEventRef, {
          joinedAt: Timestamp.now(),
          eventId: eventId
        });
        
        setIsAttending(true);
        setAttendees([...attendees, user.uid]);
      }
    } catch (err) {
      console.error('Error updating attendance:', err);
      alert('Failed to update attendance status. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // Toggle favorite status
  const toggleFavorite = async () => {
    if (!user) return;
    
    try {
      // Update local state immediately for responsive UI
      setIsFavorite(!isFavorite);
      
      const userFavoritesRef = doc(db, 'users', user.uid, 'favoriteEvents', eventId);
      
      if (isFavorite) {
        // Remove from favorites
        await deleteDoc(userFavoritesRef);
      } else {
        // Add to favorites
        await setDoc(userFavoritesRef, {
          addedAt: Timestamp.now(),
          eventId: eventId
        });
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Revert the local state change if the server update fails
      setIsFavorite(!isFavorite);
      alert('Failed to update favorite status. Please try again.');
    }
  };

  // Share event
  const shareEvent = () => {
    setShowShareOptions(!showShareOptions);
  };

  // Copy event link to clipboard
  const copyEventLink = () => {
    const eventUrl = window.location.href;
    navigator.clipboard.writeText(eventUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
      });
  };

  // Share on social media
  const shareOnSocial = (platform) => {
    const eventUrl = encodeURIComponent(window.location.href);
    const eventTitle = encodeURIComponent(event?.title || 'Check out this event');
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${eventTitle}&url=${eventUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${eventUrl}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${eventUrl}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
    setShowShareOptions(false);
  };

  // Go back to events list
  const goBack = () => {
    navigate('/events');
  };

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
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  // Loading spinner component
  if (isLoading) {
    return (
      <div className="loading-container">
        <motion.div 
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        >
          <div className="spinner-inner"></div>
        </motion.div>
        <p>Loading event details...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="error-container">
        <h2>Oops!</h2>
        <p>{error}</p>
        <button onClick={goBack}>Back to Events</button>
      </div>
    );
  }

  // If event is not loaded yet
  if (!event) {
    return null;
  }

  // Check if event has already passed
  const eventPassed = event.date && event.date.toDate() < new Date();

  return (
    <div className="event-detail-page">
      <motion.div 
        className="event-detail-container"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.button 
          className="back-button"
          onClick={goBack}
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaArrowLeft /> Back to Events
        </motion.button>

        <div className="event-detail-content">
          <motion.div className="event-detail-header" variants={itemVariants}>
            <div className="event-image-container">
              <img 
                src={event.imageUrl || 'https://via.placeholder.com/1200x400?text=Event+Banner'} 
                alt={event.title} 
                className="event-detail-image"
              />
              <div className="event-actions">
                <button 
                  className={`action-button favorite-button ${isFavorite ? 'active' : ''}`}
                  onClick={toggleFavorite}
                >
                  {isFavorite ? <FaHeart /> : <FaRegHeart />}
                  <span>{isFavorite ? 'Saved' : 'Save'}</span>
                </button>
                
                <div className="share-container">
                  <button 
                    className="action-button share-button"
                    onClick={shareEvent}
                  >
                    <FaShare />
                    <span>Share</span>
                  </button>
                  
                  {showShareOptions && (
                    <motion.div 
                      className="share-options"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                    >
                      <button 
                        className="share-option copy-link"
                        onClick={copyEventLink}
                      >
                        {copied ? 'Copied!' : 'Copy Link'}
                      </button>
                      <button 
                        className="share-option twitter"
                        onClick={() => shareOnSocial('twitter')}
                      >
                        Twitter
                      </button>
                      <button 
                        className="share-option facebook"
                        onClick={() => shareOnSocial('facebook')}
                      >
                        Facebook
                      </button>
                      <button 
                        className="share-option linkedin"
                        onClick={() => shareOnSocial('linkedin')}
                      >
                        LinkedIn
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="event-category-tag">{event.category}</div>
            <h1 className="event-detail-title">{event.title}</h1>
            
            <div className="event-organizer">
              <div className="organizer-avatar">
                {event.organizer?.photoURL ? (
                  <img src={event.organizer.photoURL} alt="Organizer" />
                ) : (
                  <div className="avatar-placeholder">
                    {event.organizer?.name?.charAt(0) || 'O'}
                  </div>
                )}
              </div>
              <div className="organizer-info">
                <p className="organized-by">Organized by</p>
                <p className="organizer-name">{event.organizer?.name || 'Event Organizer'}</p>
              </div>
            </div>
          </motion.div>

          <div className="event-detail-body">
            <motion.div className="event-main-info" variants={itemVariants}>
              <div className="event-info-section">
                <h2>About this event</h2>
                <p className="event-description">{event.description}</p>
                
                <div className="event-highlights">
                  {event.highlights && event.highlights.map((highlight, index) => (
                    <div key={index} className="event-highlight-item">
                      <div className="highlight-icon">•</div>
                      <p>{highlight}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="event-info-section">
                <h2>Date and Time</h2>
                <div className="info-item">
                  <FaCalendarAlt className="info-icon" />
                  <div>
                    <p className="info-label">Date</p>
                    <p className="info-value">{formatDate(event.date)}</p>
                  </div>
                </div>
                
                <div className="info-item">
                  <FaClock className="info-icon" />
                  <div>
                    <p className="info-label">Duration</p>
                    <p className="info-value">{event.duration || '2 hours'}</p>
                  </div>
                </div>
              </div>
              
              <div className="event-info-section">
                <h2>Location</h2>
                <div className="info-item">
                  <FaMapMarkerAlt className="info-icon" />
                  <div>
                    <p className="info-label">{event.isOnline ? 'Online Event' : 'Venue'}</p>
                    <p className="info-value">{event.location}</p>
                    {event.address && <p className="info-address">{event.address}</p>}
                  </div>
                </div>
                
                {event.locationDetails && (
                  <div className="location-details">
                    <FaMapMarked className="info-icon" />
                    <p>{event.locationDetails}</p>
                  </div>
                )}
              </div>
              
              {event.agenda && (
                <div className="event-info-section">
                  <h2>Event Agenda</h2>
                  <div className="event-agenda">
                    {event.agenda.map((item, index) => (
                      <div key={index} className="agenda-item">
                        <div className="agenda-time">{item.time}</div>
                        <div className="agenda-content">
                          <h4>{item.title}</h4>
                          {item.description && <p>{item.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="event-info-section">
                <h2>Attendees</h2>
                <div className="attendees-info">
                  <div className="info-item">
                    <FaUserFriends className="info-icon" />
                    <p>{attendees.length} people attending</p>
                  </div>
                  
                  {attendees.length > 0 && (
                    <div className="attendees-avatars">
                      {/* Here you would map through attendees and show their avatars */}
                      <div className="avatar-group">
                        {/* Placeholder for attendee avatars */}
                        <div className="attendee-avatar placeholder">+{attendees.length}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div className="event-sidebar" variants={itemVariants}>
              <div className="event-registration-card">
                <div className="registration-header">
                  {event.isFree ? (
                    <div className="event-price free">Free</div>
                  ) : (
                    <div className="event-price">${event.price || '0'}</div>
                  )}
                </div>
                
                <div className="registration-body">
                  <div className="registration-info">
                    <FaTicketAlt className="registration-icon" />
                    <div>
                      <p className="registration-label">Registration</p>
                      <p className="registration-value">
                        {event.registrationDeadline ? 
                          `Closes on ${formatDate(event.registrationDeadline)}` : 
                          'Open until event starts'}
                      </p>
                    </div>
                  </div>
                  
                  {event.maxAttendees && (
                    <div className="spots-left">
                      <p>
                        {Math.max(0, event.maxAttendees - (attendees.length || 0))} spots left
                      </p>
                      <div className="capacity-bar">
                        <div 
                          className="capacity-fill" 
                          style={{ 
                            width: `${Math.min(100, ((attendees.length || 0) / event.maxAttendees) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <button 
                    className={`register-button ${isAttending ? 'registered' : ''} ${eventPassed ? 'disabled' : ''}`}
                    onClick={toggleAttendance}
                    disabled={isJoining || eventPassed}
                  >
                    {isJoining ? 'Processing...' : 
                      eventPassed ? 'Event has ended' :
                      isAttending ? 'Cancel Registration' : 'Register Now'}
                  </button>
                  
                  {isAttending && (
                    <div className="registration-confirmation">
                      <p>You're registered for this event!</p>
                      {event.isOnline && event.joinLink && (
                        <a 
                          href={event.joinLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="join-link"
                        >
                          Join Online Event
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {event.tags && event.tags.length > 0 && (
                <div className="event-tags">
                  <h3>Tags</h3>
                  <div className="tags-container">
                    {event.tags.map((tag, index) => (
                      <span key={index} className="event-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {event.contactInfo && (
                <div className="contact-info">
                  <h3>Contact Information</h3>
                  <p>{event.contactInfo}</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EventDetail;
