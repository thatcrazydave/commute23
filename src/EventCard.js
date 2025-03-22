import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaCalendarAlt, 
  FaClock, 
  FaMapMarkerAlt, 
  FaUsers, 
  FaCheck, 
  FaPlus 
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import './EventCard.css';

const EventCard = ({ event, currentUserId, compact = false }) => {
  if (!event) return null;

  const handleAttendance = async () => {
    if (!currentUserId) return;
    
    try {
      if (event.isAttending) {
        // Remove attendance
        await deleteDoc(doc(db, 'eventAttendees', `${event.id}_${currentUserId}`));
      } else {
        // Add attendance
        await setDoc(doc(db, 'eventAttendees', `${event.id}_${currentUserId}`), {
          eventId: event.id,
          userId: currentUserId,
          joinedAt: new Date()
        });
      }
      // In a real app, you would update the UI state here
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'TBD';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <motion.div 
      className={`event-card ${compact ? 'compact' : ''}`}
      whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)' }}
      transition={{ duration: 0.2 }}
    >
      <div className="event-image">
        <img 
          src={event.imageUrl || '/images/event-placeholder.jpg'} 
          alt={event.title} 
        />
        <div className="event-category">{event.category}</div>
      </div>
      
      <div className="event-content">
        <h3 className="event-title">
          <Link to={`/events/${event.id}`}>{event.title}</Link>
        </h3>
        
        <div className="event-details">
          <div className="event-detail">
            <FaCalendarAlt className="detail-icon" />
            <span>{formatDate(event.eventDate)}</span>
          </div>
          
          {event.eventDate && (
            <div className="event-detail">
              <FaClock className="detail-icon" />
              <span>{formatTime(event.eventDate)}</span>
            </div>
          )}
          
          {event.location && (
            <div className="event-detail">
              <FaMapMarkerAlt className="detail-icon" />
              <span>{event.location}</span>
            </div>
          )}
          
          <div className="event-detail">
            <FaUsers className="detail-icon" />
            <span>{event.attendeesCount || 0} attending</span>
          </div>
        </div>
        
        {!compact && event.description && (
          <p className="event-description">{event.description}</p>
        )}
        
        {currentUserId && (
          <button 
            className={`attendance-button ${event.isAttending ? 'attending' : ''}`}
            onClick={handleAttendance}
          >
            {event.isAttending ? (
              <>
                <FaCheck /> Attending
              </>
            ) : (
              <>
                <FaPlus /> Attend
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default EventCard;
