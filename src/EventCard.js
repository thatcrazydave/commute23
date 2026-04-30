import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUsers, FaCheck, FaPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import API from './services/api';
import './EventCard.css';

const EventCard = ({ event: initialEvent, currentUserId, compact = false }) => {
  const [event, setEvent] = useState(initialEvent);
  const [isLoading, setIsLoading] = useState(false);

  if (!event) return null;

  const handleAttendance = async () => {
    if (!currentUserId || isLoading) return;
    setIsLoading(true);
    try {
      const { data } = await API.post(`/events/${event._id || event.id}/attend`);
      if (data.success) {
        setEvent(prev => ({
          ...prev,
          isAttending: data.data.isAttending,
          attendeesCount: data.data.attendeesCount,
        }));
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (val) => {
    if (!val) return 'TBD';
    const date = val instanceof Date ? val : new Date(val);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (val) => {
    if (!val) return '';
    const date = val instanceof Date ? val : new Date(val);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const eventId = event._id || event.id;

  return (
    <motion.div
      className={`event-card ${compact ? 'compact' : ''}`}
      whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)' }}
      transition={{ duration: 0.2 }}
    >
      <div className="event-image">
        <img src={event.imageUrl || '/images/event-placeholder.jpg'} alt={event.title} />
        <div className="event-category">{event.category}</div>
      </div>

      <div className="event-content">
        <h3 className="event-title">
          <Link to={`/events/${eventId}`}>{event.title}</Link>
        </h3>

        <div className="event-details">
          <div className="event-detail">
            <FaCalendarAlt className="detail-icon" />
            <span>{formatDate(event.date || event.eventDate)}</span>
          </div>
          {(event.date || event.eventDate) && (
            <div className="event-detail">
              <FaClock className="detail-icon" />
              <span>{formatTime(event.date || event.eventDate)}</span>
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
            disabled={isLoading}
          >
            {event.isAttending ? <><FaCheck /> Attending</> : <><FaPlus /> Attend</>}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default EventCard;
