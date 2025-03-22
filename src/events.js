import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, where, orderBy, limit, Timestamp, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth, storage } from './firebase';
import { useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaMapMarkerAlt, FaSearch, FaFilter, FaClock, FaUser, FaHeart, FaRegHeart, 
         FaPlus, FaTimes, FaCamera, FaUsers, FaTicketAlt, FaShare, FaDownload, FaCalendarPlus, FaExclamationTriangle, FaTh, FaList, FaSort, FaChevronDown } from 'react-icons/fa';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import './events.css';

// Create Event Modal Component
const CreateEventModal = ({ isOpen, onClose, onEventCreated }) => {
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: 'tech',
    capacity: 50,
    price: 0,
    isVirtual: false,
    registrationLink: '',
    imageUrl: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEventData({
      ...eventData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Validate form
      if (!eventData.title || !eventData.description || !eventData.date || !eventData.time || !eventData.location) {
        throw new Error('Please fill in all required fields');
      }
      
      // Combine date and time into a timestamp
      const dateTimeString = `${eventData.date}T${eventData.time}`;
      const eventDateTime = new Date(dateTimeString);
      
      if (isNaN(eventDateTime.getTime())) {
        throw new Error('Invalid date or time format');
      }
      
      // Upload image if provided
      let imageUrl = eventData.imageUrl;
      
      if (imageFile) {
        const storageRef = ref(storage, `events/${Date.now()}_${imageFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, imageFile);
        
        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              imageUrl = downloadURL;
              resolve();
            }
          );
        });
      }
      
      // Get current user
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('You must be logged in to create an event');
      }
      
      // Create event document
      const eventRef = await addDoc(collection(db, 'events'), {
        title: eventData.title,
        description: eventData.description,
        date: Timestamp.fromDate(eventDateTime),
        location: eventData.location,
        category: eventData.category,
        capacity: parseInt(eventData.capacity),
        price: parseFloat(eventData.price),
        isVirtual: eventData.isVirtual,
        registrationLink: eventData.registrationLink,
        imageUrl: imageUrl,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
        attendees: [],
        interested: []
      });
      
      // Call the callback with the new event
      onEventCreated({
        id: eventRef.id,
        title: eventData.title,
        description: eventData.description,
        date: Timestamp.fromDate(eventDateTime),
        location: eventData.location,
        category: eventData.category,
        capacity: parseInt(eventData.capacity),
        price: parseFloat(eventData.price),
        isVirtual: eventData.isVirtual,
        registrationLink: eventData.registrationLink,
        imageUrl: imageUrl,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
        attendees: [],
        interested: []
      });
      
      onClose();
    } catch (err) {
      console.error('Error creating event:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <motion.div 
            className="create-event-modal"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            style={{
              backgroundColor: 'white',
              borderRadius: '10px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              padding: '20px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Create New Event</h2>
              <button 
                className="close-button" 
                onClick={onClose}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                <FaTimes />
              </button>
            </div>
            
            {error && (
              <div className="error-message" style={{
                backgroundColor: '#ffecec',
                color: '#e74c3c',
                padding: '10px 15px',
                borderRadius: '5px',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FaExclamationTriangle /> {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Event Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={eventData.title}
                  onChange={handleChange}
                  placeholder="Enter event title"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date">Date *</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={eventData.date}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="time">Time *</label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    value={eventData.time}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="location">Location *</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={eventData.location}
                  onChange={handleChange}
                  placeholder="Enter event location"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    name="category"
                    value={eventData.category}
                    onChange={handleChange}
                  >
                    <option value="conference">Conference</option>
                    <option value="workshop">Workshop</option>
                    <option value="networking">Networking</option>
                    <option value="social">Social</option>
                    <option value="tech">Tech</option>
                    <option value="business">Business</option>
                    <option value="arts">Arts & Culture</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="capacity">Capacity</label>
                  <input
                    type="number"
                    id="capacity"
                    name="capacity"
                    value={eventData.capacity}
                    onChange={handleChange}
                    min="1"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price">Price ($)</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={eventData.price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="isVirtual"
                      checked={eventData.isVirtual}
                      onChange={handleChange}
                    />
                    Virtual Event
                  </label>
                </div>
              </div>
              
              {eventData.isVirtual && (
                <div className="form-group">
                  <label htmlFor="registrationLink">Registration Link</label>
                  <input
                    type="url"
                    id="registrationLink"
                    name="registrationLink"
                    value={eventData.registrationLink}
                    onChange={handleChange}
                    placeholder="Enter registration or meeting link"
                  />
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={eventData.description}
                  onChange={handleChange}
                  placeholder="Describe your event"
                  rows="4"
                  required
                ></textarea>
              </div>
              
              <div className="form-group">
                <label>Event Image</label>
                <div className="image-upload-container">
                  {imagePreview ? (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Event preview" />
                      <button 
                        type="button" 
                        className="remove-image-button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="upload-placeholder"
                      onClick={() => fileInputRef.current.click()}
                    >
                      <FaCamera />
                      <p>Click to upload image</p>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="upload-progress">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                )}
              </div>
              
              <div className="form-actions" style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '20px',
                gap: '10px'
              }}>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '5px',
                    border: '1px solid #ddd',
                    backgroundColor: '#f8f8f8',
                    cursor: 'pointer',
                    flex: '1'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: '#4a90e2',
                    color: 'white',
                    cursor: 'pointer',
                    flex: '1'
                  }}
                >
                  {isSubmitting ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Event Details Modal Component
const EventDetailsModal = ({ event, isOpen, onClose, onRegister, onToggleFavorite, isFavorite, isRegistered }) => {
  if (!event) return null;
  
  const formatDate = (timestamp) => {
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
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: `Check out this event: ${event.title}`,
        url: window.location.href
      })
      .catch(err => console.error('Error sharing:', err));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Error copying link:', err));
    }
  };
  
  const addToCalendar = () => {
    const eventDate = event.date.toDate();
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 2); // Assuming 2-hour event
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${event.title}`,
      `DTSTART:${formatICSDate(eventDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `LOCATION:${event.location}`,
      `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event.title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const formatICSDate = (date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={onClose}
        >
          <motion.div 
            className="event-details-modal"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            style={{
              backgroundColor: 'white',
              borderRadius: '10px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button className="close-button" onClick={onClose}>
              <FaTimes />
            </button>
            
            <div className="event-image-container">
              <img 
                src={event.imageUrl || 'https://via.placeholder.com/800x400?text=Event'} 
                alt={event.title} 
                className="event-detail-image"
              />
              <div className="event-category-badge">{event.category}</div>
            </div>
            
            <div className="event-detail-content">
              <h2 className="event-detail-title">{event.title}</h2>
              
              <div className="event-detail-meta">
                <div className="detail-item">
                  <FaCalendarAlt className="detail-icon" />
                  <span>{formatDate(event.date)}</span>
                </div>
                
                <div className="detail-item">
                  <FaMapMarkerAlt className="detail-icon" />
                  <span>{event.location}</span>
                </div>
                
                <div className="detail-item">
                  <FaUsers className="detail-icon" />
                  <span>{event.attendees?.length || 0} / {event.capacity || 'Unlimited'} attending</span>
                </div>
                
                {event.price > 0 ? (
                  <div className="detail-item">
                    <FaTicketAlt className="detail-icon" />
                    <span>${event.price.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="detail-item free-badge">
                    <FaTicketAlt className="detail-icon" />
                    <span>Free</span>
                  </div>
                )}
              </div>
              
              <div className="event-description">
                <h3>About this event</h3>
                <p>{event.description}</p>
              </div>
              
              <div className="event-actions">
                <button 
                  className={`register-button ${isRegistered ? 'registered' : ''}`}
                  onClick={onRegister}
                  disabled={isRegistered}
                >
                  {isRegistered ? 'Registered' : 'Register Now'}
                </button>
                
                <button 
                  className={`favorite-button ${isFavorite ? 'favorited' : ''}`}
                  onClick={onToggleFavorite}
                >
                  {isFavorite ? <FaHeart /> : <FaRegHeart />}
                  {isFavorite ? 'Saved' : 'Save'}
                </button>
                
                <button className="share-button" onClick={handleShare}>
                  <FaShare /> Share
                </button>
                
                <button className="calendar-button" onClick={addToCalendar}>
                  <FaCalendarPlus /> Add to Calendar
                </button>
              </div>
              
              {event.isVirtual && event.registrationLink && (
                <div className="virtual-event-info">
                  <h3>Virtual Event</h3>
                  <p>This is an online event. After registration, you will receive a link to join.</p>
                  {isRegistered && (
                    <a 
                      href={event.registrationLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="join-link"
                    >
                      Join Event
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// No Events Component
const NoEventsFound = ({ isFiltered, resetFilters, createNewEvent }) => {
  return (
    <div className="no-events-container">
      <div className="no-events-content">
        <img 
          src="/images/no-events.svg" 
          alt="No events found" 
          className="no-events-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://via.placeholder.com/300?text=No+Events";
          }}
        />
        
        <h2>No Events Found</h2>
        
        {isFiltered ? (
          <>
            <p>We couldn't find any events that match your filters.</p>
            <div className="no-events-actions">
              <button className="primary-button" onClick={resetFilters}>
                Clear Filters
              </button>
            </div>
          </>
        ) : (
          <>
            <p>There are no upcoming events scheduled at this time.</p>
            <p>Check back later or create your own event!</p>
            <div className="no-events-actions">
              <button className="primary-button" onClick={createNewEvent}>
                Create an Event
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Main Events Component
const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    category: 'all',
    timeFrame: 'all',
    location: 'all',
    price: 'all',
    attendance: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'popularity', 'price'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myEventsOnly, setMyEventsOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hasEvents, setHasEvents] = useState(true);
  const eventsPerPage = 12;

  // Check authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Fetch user profile to check admin status
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserProfile(userData);
            setIsAdmin(userData.isAdmin || false);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        // Redirect to login if not authenticated
        navigate('/login', { 
          state: { 
            message: 'Please log in to view events', 
            type: 'info' 
          } 
        });
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);

  // Fetch events from Firestore
  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const now = Timestamp.now();
        
        // Create a query to get upcoming events
        let eventsQuery = query(
          collection(db, 'events'),
          where('date', '>=', now),
          orderBy('date', 'asc'),
          limit(eventsPerPage * page)
        );
        
        // If viewing only user's events
        if (myEventsOnly) {
          eventsQuery = query(
            collection(db, 'events'),
            where('createdBy', '==', user.uid),
            orderBy('date', 'asc'),
            limit(eventsPerPage * page)
          );
        }
        
        const querySnapshot = await getDocs(eventsQuery);
        const eventsData = [];
        
        querySnapshot.forEach((doc) => {
          eventsData.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        
        // Check if there are any events at all
        setHasEvents(eventsData.length > 0);
        
        // Check if there are more events to load
        setHasMore(eventsData.length === eventsPerPage * page);
        
        // Sort events based on sortBy
        let sortedEvents = [...eventsData];
        
        if (sortBy === 'date') {
          // Already sorted by date in the query
        } else if (sortBy === 'popularity') {
          sortedEvents.sort((a, b) => (b.attendees?.length || 0) - (a.attendees?.length || 0));
        } else if (sortBy === 'price') {
          sortedEvents.sort((a, b) => (a.price || 0) - (b.price || 0));
        }
        
        setEvents(sortedEvents);
        
        // Fetch user's favorite events
        const userFavoritesQuery = query(
          collection(db, 'users', user.uid, 'favoriteEvents')
        );
        
        const favoritesSnapshot = await getDocs(userFavoritesQuery);
        const favoritesData = [];
        
        favoritesSnapshot.forEach((doc) => {
          favoritesData.push(doc.id);
        });
        
        setFavorites(favoritesData);
        
        // Fetch user's registered events
        const userRegistrationsQuery = query(
          collection(db, 'users', user.uid, 'registeredEvents')
        );
        
        const registrationsSnapshot = await getDocs(userRegistrationsQuery);
        const registrationsData = [];
        
        registrationsSnapshot.forEach((doc) => {
          registrationsData.push(doc.id);
        });
        
        setRegisteredEvents(registrationsData);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvents();
  }, [user, page, sortBy, myEventsOnly]);

  // Filter events based on search term and filter options
  useEffect(() => {
    if (events.length > 0) {
      let filtered = [...events];
      
      // Apply search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(event => 
          event.title?.toLowerCase().includes(term) || 
          event.description?.toLowerCase().includes(term) ||
          event.location?.toLowerCase().includes(term)
        );
      }
      
      // Apply category filter
      if (filterOptions.category !== 'all') {
        filtered = filtered.filter(event => 
          event.category === filterOptions.category
        );
      }
      
      // Apply time frame filter
      if (filterOptions.timeFrame !== 'all') {
        const now = new Date();
        
        if (filterOptions.timeFrame === 'today') {
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);
          
          filtered = filtered.filter(event => {
            const eventDate = event.date.toDate();
            return eventDate >= now && eventDate <= endOfDay;
          });
        } else if (filterOptions.timeFrame === 'week') {
          const endOfWeek = new Date(now);
          endOfWeek.setDate(now.getDate() + 7);
          
          filtered = filtered.filter(event => {
            const eventDate = event.date.toDate();
            return eventDate >= now && eventDate <= endOfWeek;
          });
        } else if (filterOptions.timeFrame === 'month') {
          const endOfMonth = new Date(now);
          endOfMonth.setMonth(now.getMonth() + 1);
          
          filtered = filtered.filter(event => {
            const eventDate = event.date.toDate();
            return eventDate >= now && eventDate <= endOfMonth;
          });
        }
      }
      
      // Apply location filter
      if (filterOptions.location !== 'all') {
        if (filterOptions.location === 'virtual') {
          filtered = filtered.filter(event => event.isVirtual);
        } else if (filterOptions.location === 'in-person') {
          filtered = filtered.filter(event => !event.isVirtual);
        } else {
          filtered = filtered.filter(event => 
            event.location?.includes(filterOptions.location)
          );
        }
      }
      
      // Apply price filter
      if (filterOptions.price !== 'all') {
        if (filterOptions.price === 'free') {
          filtered = filtered.filter(event => !event.price || event.price === 0);
        } else if (filterOptions.price === 'paid') {
          filtered = filtered.filter(event => event.price > 0);
        }
      }
      
      // Apply attendance filter
      if (filterOptions.attendance !== 'all') {
        if (filterOptions.attendance === 'registered') {
          filtered = filtered.filter(event => registeredEvents.includes(event.id));
        } else if (filterOptions.attendance === 'saved') {
          filtered = filtered.filter(event => favorites.includes(event.id));
        }
      }
      
      setFilteredEvents(filtered);
    } else {
      setFilteredEvents([]);
    }
  }, [events, searchTerm, filterOptions, favorites, registeredEvents]);

  // Toggle favorite status for an event
  const toggleFavorite = async (eventId) => {
    if (!user) return;
    
    try {
      // Update local state immediately for responsive UI
      const newFavorites = [...favorites];
      const index = newFavorites.indexOf(eventId);
      
      if (index > -1) {
        newFavorites.splice(index, 1);
        await deleteDoc(doc(db, 'users', user.uid, 'favoriteEvents', eventId));
      } else {
        newFavorites.push(eventId);
        await setDoc(doc(db, 'users', user.uid, 'favoriteEvents', eventId), {
          addedAt: Timestamp.now()
        });
      }
      
      setFavorites(newFavorites);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  // Register for an event
  const registerForEvent = async (eventId) => {
    if (!user) return;
    
    try {
      // Check if already registered
      if (registeredEvents.includes(eventId)) {
        return;
      }
      
      // Get the event to check capacity
      const eventRef = doc(db, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }
      
      const eventData = eventDoc.data();
      
      // Check if event is at capacity
      if (eventData.capacity && eventData.attendees && eventData.attendees.length >= eventData.capacity) {
        alert('This event is at full capacity');
        return;
      }
      
      // Add user to event attendees
      const updatedAttendees = [...(eventData.attendees || []), user.uid];
      await updateDoc(eventRef, {
        attendees: updatedAttendees
      });
      
      // Add event to user's registered events
      await setDoc(doc(db, 'users', user.uid, 'registeredEvents', eventId), {
        registeredAt: Timestamp.now()
      });
      
      // Update local state
      setRegisteredEvents([...registeredEvents, eventId]);
      
      // Show success message
      alert('You have successfully registered for this event!');
    } catch (err) {
      console.error('Error registering for event:', err);
      alert('Failed to register for event. Please try again.');
    }
  };

  // Handle event creation
  const handleEventCreated = (newEvent) => {
    setEvents([newEvent, ...events]);
    setShowCreateModal(false);
  };

  // Format date for display
  const formatDate = (timestamp) => {
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

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilterOptions({
      ...filterOptions,
      [filterType]: value
    });
  };

  // View event details
  const viewEventDetails = (event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  // Load more events
  const loadMoreEvents = () => {
    setPage(page + 1);
  };

  // Reset filters
  const resetFilters = () => {
    setFilterOptions({
      category: 'all',
      timeFrame: 'all',
      location: 'all',
      price: 'all',
      attendance: 'all'
    });
    setSearchTerm('');
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
  if (isLoading && page === 1) {
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
        <p>Loading events...</p>
      </div>
    );
  }

  // Error state
  if (error && page === 1) {
    return (
      <div className="error-container">
        <h2>Oops!</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="events-page">
      <motion.div 
        className="events-container"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="events-header" variants={itemVariants}>
          <div className="header-content">
            <h1>Upcoming Events</h1>
            <p>Discover and join exciting events in your community</p>
          </div>
          
          <div className="header-actions">
            {(isAdmin || userProfile?.canCreateEvents) && (
              <button 
                className="create-event-button"
                onClick={() => setShowCreateModal(true)}
              >
                <FaPlus /> Create Event
              </button>
            )}
            
            <div className="view-toggle">
              <button 
                className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <FaTh />
              </button>
              <button 
                className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <FaList />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div className="search-filter-container" variants={itemVariants}>
          <div className="search-bar">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          <div className="filter-actions">
            <div className="sort-dropdown">
              <button className="sort-button">
                <FaSort /> Sort: {sortBy === 'date' ? 'Date' : sortBy === 'popularity' ? 'Popularity' : 'Price'}
                <FaChevronDown className="dropdown-icon" />
              </button>
              <div className="sort-options">
                <button 
                  className={sortBy === 'date' ? 'active' : ''}
                  onClick={() => setSortBy('date')}
                >
                  Date
                </button>
                <button 
                  className={sortBy === 'popularity' ? 'active' : ''}
                  onClick={() => setSortBy('popularity')}
                >
                  Popularity
                </button>
                <button 
                  className={sortBy === 'price' ? 'active' : ''}
                  onClick={() => setSortBy('price')}
                >
                  Price
                </button>
              </div>
            </div>
            
            <button 
              className={`filter-toggle-button ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <FaFilter /> {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            
            <button 
              className={`my-events-toggle ${myEventsOnly ? 'active' : ''}`}
              onClick={() => setMyEventsOnly(!myEventsOnly)}
            >
              {myEventsOnly ? 'All Events' : 'My Events'}
            </button>
          </div>
        </motion.div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              className="filters-container"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="filter-group">
                <label>Category</label>
                <select 
                  value={filterOptions.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="conference">Conference</option>
                  <option value="workshop">Workshop</option>
                  <option value="networking">Networking</option>
                  <option value="social">Social</option>
                  <option value="tech">Tech</option>
                  <option value="business">Business</option>
                  <option value="arts">Arts & Culture</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Time Frame</label>
                <select 
                  value={filterOptions.timeFrame}
                  onChange={(e) => handleFilterChange('timeFrame', e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Location</label>
                <select 
                  value={filterOptions.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                >
                  <option value="all">All Locations</option>
                  <option value="virtual">Virtual Events</option>
                  <option value="in-person">In-Person Events</option>
                  <option value="New York">New York</option>
                  <option value="San Francisco">San Francisco</option>
                  <option value="London">London</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Price</label>
                <select 
                  value={filterOptions.price}
                  onChange={(e) => handleFilterChange('price', e.target.value)}
                >
                  <option value="all">All Prices</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Attendance</label>
                <select 
                  value={filterOptions.attendance}
                  onChange={(e) => handleFilterChange('attendance', e.target.value)}
                >
                  <option value="all">All Events</option>
                  <option value="registered">Registered</option>
                  <option value="saved">Saved</option>
                </select>
              </div>
              
              <button 
                className="reset-filters-button"
                onClick={resetFilters}
              >
                Reset Filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoading && (
          <>
            {filteredEvents.length === 0 && (
              <NoEventsFound 
                isFiltered={hasEvents && (
                  searchTerm || 
                  filterOptions.category !== 'all' || 
                  filterOptions.timeFrame !== 'all' || 
                  filterOptions.location !== 'all' || 
                  filterOptions.price !== 'all' || 
                  filterOptions.attendance !== 'all'
                )}
                resetFilters={resetFilters}
                createNewEvent={() => setShowCreateModal(true)}
              />
            )}
            
            {filteredEvents.length > 0 && (
              <>
                <motion.div 
                  className={`events-${viewMode}`} 
                  variants={containerVariants}
                >
                  {filteredEvents.map((event) => (
                    <motion.div 
                      key={event.id} 
                      className={`event-card ${viewMode}`}
                      variants={itemVariants}
                      whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
                      onClick={() => viewEventDetails(event)}
                    >
                      <div className="event-image-container">
                        <img 
                          src={event.imageUrl || 'https://via.placeholder.com/300x150?text=Event'} 
                          alt={event.title} 
                          className="event-image"
                        />
                        <button 
                          className="favorite-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(event.id);
                          }}
                        >
                          {favorites.includes(event.id) ? 
                            <FaHeart className="favorite-icon active" /> : 
                            <FaRegHeart className="favorite-icon" />
                          }
                        </button>
                        {registeredEvents.includes(event.id) && (
                          <div className="registered-badge">Registered</div>
                        )}
                      </div>
                      
                      <div className="event-content">
                        <div className="event-category">{event.category}</div>
                        <h3 className="event-title">{event.title}</h3>
                        
                        <div className="event-details">
                          <div className="event-detail">
                            <FaCalendarAlt className="detail-icon" />
                            <span>{formatDate(event.date)}</span>
                          </div>
                          
                          <div className="event-detail">
                            <FaMapMarkerAlt className="detail-icon" />
                            <span>{event.location}</span>
                          </div>
                          
                          {viewMode === 'list' && (
                            <>
                              <div className="event-detail">
                                <FaClock className="detail-icon" />
                                <span>{event.duration || '2 hours'}</span>
                              </div>
                              
                              <div className="event-detail">
                                <FaUsers className="detail-icon" />
                                <span>{event.attendees?.length || 0} attending</span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {viewMode === 'list' && (
                          <p className="event-description">
                            {event.description.length > 150 
                              ? `${event.description.substring(0, 150)}...` 
                              : event.description
                            }
                          </p>
                        )}
                        
                        {viewMode === 'list' && (
                          <div className="list-view-actions">
                            <button 
                              className={`register-button ${registeredEvents.includes(event.id) ? 'registered' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                registerForEvent(event.id);
                              }}
                              disabled={registeredEvents.includes(event.id)}
                            >
                              {registeredEvents.includes(event.id) ? 'Registered' : 'Register'}
                            </button>
                            
                            <div className="price-tag">
                              {event.price > 0 ? `$${event.price.toFixed(2)}` : 'Free'}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
                
                {hasMore && (
                  <div className="load-more-container">
                    <button 
                      className="load-more-button"
                      onClick={loadMoreEvents}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Loading...' : 'Load More Events'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </motion.div>
      
      {/* Create Event Modal */}
      <CreateEventModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onEventCreated={handleEventCreated}
      />
      
      {/* Event Details Modal */}
      <EventDetailsModal 
        event={selectedEvent}
        isOpen={showEventDetails}
        onClose={() => setShowEventDetails(false)}
        onRegister={() => selectedEvent && registerForEvent(selectedEvent.id)}
        onToggleFavorite={() => selectedEvent && toggleFavorite(selectedEvent.id)}
        isFavorite={selectedEvent ? favorites.includes(selectedEvent.id) : false}
        isRegistered={selectedEvent ? registeredEvents.includes(selectedEvent.id) : false}
      />
    </div>
  );
};

export default Events;