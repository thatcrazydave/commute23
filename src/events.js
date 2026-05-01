import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt, FaMapMarkerAlt, FaSearch, FaFilter, FaHeart, FaRegHeart,
  FaPlus, FaTimes, FaCamera, FaUsers, FaTicketAlt,
  FaExclamationTriangle, FaTh, FaList, FaSort, FaChevronDown, // eslint-disable-line no-unused-vars
} from 'react-icons/fa';
import API from './services/api';
import { useAuth } from './contexts/AuthContext';
import './css/events.css';

// ─── Create Event Modal ────────────────────────────────────────────────────────
const CreateEventModal = ({ isOpen, onClose, onEventCreated }) => {
  const [form, setForm] = useState({ title:'', description:'', date:'', time:'', location:'', category:'tech', capacity:50, price:0, isVirtual:false, registrationLink:'' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef(null);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.title || !form.description || !form.date || !form.time || !form.location) { setError('Please fill in all required fields'); return; }
    const dt = new Date(`${form.date}T${form.time}`);
    if (isNaN(dt.getTime())) { setError('Invalid date or time'); return; }
    setIsSubmitting(true); setError(null);
    try {
      let imageUrl = '';
      if (imageFile) {
        const fd = new FormData(); fd.append('file', imageFile);
        const { data: up } = await API.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: ev => { if (ev.total) setUploadProgress(Math.round((ev.loaded/ev.total)*100)); } });
        imageUrl = up.data.url;
      }
      const { data } = await API.post('/events', { ...form, date: dt.toISOString(), capacity: parseInt(form.capacity), price: parseFloat(form.price), imageUrl });
      if (data.success) { onEventCreated(data.data.event); onClose(); }
      else throw new Error(data.error?.message || 'Failed to create event');
    } catch (err) { setError(err.response?.data?.error?.message || err.message); }
    finally { setIsSubmitting(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 }} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
          <motion.div style={{ backgroundColor:'white', borderRadius:'10px', width:'90%', maxWidth:'800px', maxHeight:'90vh', overflow:'auto', padding:'20px', position:'relative' }} initial={{ y:50, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:50, opacity:0 }} onClick={e => e.stopPropagation()}>
            <h2>Create New Event</h2>
            <button onClick={onClose} style={{ position:'absolute', top:15, right:15, background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer' }}><FaTimes /></button>
            {error && <div style={{ backgroundColor:'#ffecec', color:'#e74c3c', padding:'10px', borderRadius:'5px', marginBottom:'15px' }}><FaExclamationTriangle /> {error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Title *</label><input name="title" value={form.title} onChange={handleChange} placeholder="Event title" required /></div>
              <div className="form-row">
                <div className="form-group"><label>Date *</label><input type="date" name="date" value={form.date} onChange={handleChange} required /></div>
                <div className="form-group"><label>Time *</label><input type="time" name="time" value={form.time} onChange={handleChange} required /></div>
              </div>
              <div className="form-group"><label>Location *</label><input name="location" value={form.location} onChange={handleChange} placeholder="Location" required /></div>
              <div className="form-row">
                <div className="form-group"><label>Category</label>
                  <select name="category" value={form.category} onChange={handleChange}>
                    {['conference','workshop','networking','social','tech','business','arts'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Capacity</label><input type="number" name="capacity" value={form.capacity} onChange={handleChange} min="1" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Price ($)</label><input type="number" name="price" value={form.price} onChange={handleChange} min="0" step="0.01" /></div>
                <div className="form-group checkbox-group"><label><input type="checkbox" name="isVirtual" checked={form.isVirtual} onChange={handleChange} /> Virtual Event</label></div>
              </div>
              {form.isVirtual && <div className="form-group"><label>Registration Link</label><input type="url" name="registrationLink" value={form.registrationLink} onChange={handleChange} placeholder="Meeting link" /></div>}
              <div className="form-group"><label>Description *</label><textarea name="description" value={form.description} onChange={handleChange} rows="4" required placeholder="Describe your event" /></div>
              <div className="form-group">
                <label>Event Image</label>
                <div className="image-upload-container">
                  {imagePreview
                    ? <div className="image-preview"><img src={imagePreview} alt="Preview" /><button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}><FaTimes /></button></div>
                    : <div className="upload-placeholder" onClick={() => fileRef.current?.click()}><FaCamera /><p>Click to upload</p></div>}
                  <input type="file" ref={fileRef} onChange={handleImageChange} accept="image/*" style={{ display:'none' }} />
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && <div className="upload-progress"><div className="progress-bar" style={{ width:`${uploadProgress}%` }} /><span>{uploadProgress}%</span></div>}
              </div>
              <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
                <button type="button" onClick={onClose} disabled={isSubmitting} style={{ flex:1, padding:'10px', borderRadius:'5px', border:'1px solid #ddd', cursor:'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ flex:1, padding:'10px', borderRadius:'5px', backgroundColor:'#4a90e2', color:'white', border:'none', cursor:'pointer' }}>{isSubmitting ? 'Creating...' : 'Create Event'}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const NoEventsFound = ({ isFiltered, resetFilters, createNewEvent }) => (
  <div className="no-events-container">
    <div className="no-events-content">
      <h2>No Events Found</h2>
      {isFiltered
        ? <><p>No events match your filters.</p><button className="primary-button" onClick={resetFilters}>Clear Filters</button></>
        : <><p>No upcoming events yet.</p><button className="primary-button" onClick={createNewEvent}>Create an Event</button></>}
    </div>
  </div>
);

// ─── Main Events ───────────────────────────────────────────────────────────────
const Events = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized, isAdmin, isModerator } = useAuth();

  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState({ category:'all', timeFrame:'all', location:'all', price:'all', attendance:'all' });
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('date');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [myEventsOnly, setMyEventsOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) navigate('/login', { state: { message: 'Please log in to view events', type: 'info' } });
  }, [isInitialized, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, page, sortBy, myEventsOnly]);

  const fetchEvents = async () => {
    setIsLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (myEventsOnly) params.set('mine', 'true');
      const { data } = await API.get(`/events?${params}`);
      if (data.success) {
        let fetched = data.data.events;
        if (sortBy === 'popularity') fetched = [...fetched].sort((a,b) => (b.attendeesCount||0)-(a.attendeesCount||0));
        else if (sortBy === 'price') fetched = [...fetched].sort((a,b) => (a.price||0)-(b.price||0));
        setEvents(prev => page === 1 ? fetched : [...prev, ...fetched]);
        setHasMore(data.data.hasMore);
      }
    } catch (err) { setError('Failed to load events. Please try again later.'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    let f = [...events];
    if (searchTerm) { const t = searchTerm.toLowerCase(); f = f.filter(e => e.title?.toLowerCase().includes(t) || e.description?.toLowerCase().includes(t) || e.location?.toLowerCase().includes(t)); }
    if (filterOptions.category !== 'all') f = f.filter(e => e.category === filterOptions.category);
    if (filterOptions.timeFrame !== 'all') {
      const now = new Date();
      if (filterOptions.timeFrame === 'today') { const eod = new Date(now); eod.setHours(23,59,59,999); f = f.filter(e => { const d = new Date(e.date); return d>=now&&d<=eod; }); }
      else if (filterOptions.timeFrame === 'week') { const eow = new Date(now); eow.setDate(now.getDate()+7); f = f.filter(e => { const d = new Date(e.date); return d>=now&&d<=eow; }); }
      else if (filterOptions.timeFrame === 'month') { const eom = new Date(now); eom.setMonth(now.getMonth()+1); f = f.filter(e => { const d = new Date(e.date); return d>=now&&d<=eom; }); }
    }
    if (filterOptions.location === 'virtual') f = f.filter(e => e.isVirtual);
    else if (filterOptions.location === 'in-person') f = f.filter(e => !e.isVirtual);
    if (filterOptions.price === 'free') f = f.filter(e => !e.price || e.price === 0);
    else if (filterOptions.price === 'paid') f = f.filter(e => e.price > 0);
    if (filterOptions.attendance === 'registered') f = f.filter(e => e.isAttending);
    else if (filterOptions.attendance === 'saved') f = f.filter(e => e.isFavorite);
    setFilteredEvents(f);
  }, [events, searchTerm, filterOptions]);

  const patchEvent = (eventId, patch) => {
    const fn = e => (e._id||e.id) === eventId ? { ...e, ...patch } : e;
    setEvents(prev => prev.map(fn));
    if (selectedEvent && (selectedEvent._id||selectedEvent.id) === eventId) setSelectedEvent(prev => ({ ...prev, ...patch }));
  };

  const toggleFavorite = async eventId => {
    try {
      const { data } = await API.post(`/events/${eventId}/favorite`);
      if (data.success) patchEvent(eventId, { isFavorite: data.data.isFavorite });
    } catch (err) { console.error('toggleFavorite:', err); }
  };

  const registerForEvent = async eventId => {
    try {
      const { data } = await API.post(`/events/${eventId}/attend`);
      if (data.success) patchEvent(eventId, { isAttending: data.data.isAttending, attendeesCount: data.data.attendeesCount });
    } catch (err) {
      const msg = err.response?.data?.error?.message;
      if (msg) alert(msg);
    }
  };

  const formatDate = val => {
    if (!val) return 'TBD';
    return new Intl.DateTimeFormat('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(val));
  };

  const resetFilters = () => { setFilterOptions({ category:'all', timeFrame:'all', location:'all', price:'all', attendance:'all' }); setSearchTerm(''); };

  const containerVariants = { hidden:{ opacity:0 }, visible:{ opacity:1, transition:{ duration:0.5, when:'beforeChildren', staggerChildren:0.1 } } };
  const itemVariants = { hidden:{ y:20, opacity:0 }, visible:{ y:0, opacity:1, transition:{ duration:0.3 } } };

  if (isLoading && page === 1) return <div className="loading-container"><motion.div className="loading-spinner" animate={{ rotate:360 }} transition={{ duration:1.5, repeat:Infinity, ease:'linear' }}><div className="spinner-inner"/></motion.div><p>Loading events...</p></div>;
  if (error && page === 1) return <div className="error-container"><h2>Oops!</h2><p>{error}</p><button onClick={() => window.location.reload()}>Try Again</button></div>;

  return (
    <div className="events-page">
      <motion.div className="events-container" initial="hidden" animate="visible" variants={containerVariants}>
        <motion.div className="events-header" variants={itemVariants}>
          <div className="header-content"><h1>Upcoming Events</h1><p>Discover and join exciting events in your community</p></div>
          <div className="header-actions">
            {(isAdmin||isModerator) && <button className="create-event-button" onClick={() => setShowCreateModal(true)}><FaPlus /> Create Event</button>}
            <div className="view-toggle">
              <button className={`view-button ${viewMode==='grid'?'active':''}`} onClick={() => setViewMode('grid')} aria-label="Grid"><FaTh /></button>
              <button className={`view-button ${viewMode==='list'?'active':''}`} onClick={() => setViewMode('list')} aria-label="List"><FaList /></button>
            </div>
          </div>
        </motion.div>

        <motion.div className="search-filter-container" variants={itemVariants}>
          <div className="search-bar"><FaSearch className="search-icon"/><input type="text" placeholder="Search events..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
          <div className="filter-actions">
            <div className="sort-dropdown">
              <button className="sort-button"><FaSort/> Sort: {sortBy.charAt(0).toUpperCase()+sortBy.slice(1)}<FaChevronDown className="dropdown-icon"/></button>
              <div className="sort-options">{['date','popularity','price'].map(s => <button key={s} className={sortBy===s?'active':''} onClick={() => { setSortBy(s); setPage(1); }}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>)}</div>
            </div>
            <button className={`filter-toggle-button ${showFilters?'active':''}`} onClick={() => setShowFilters(s=>!s)}><FaFilter/> {showFilters?'Hide Filters':'Show Filters'}</button>
            <button className={`my-events-toggle ${myEventsOnly?'active':''}`} onClick={() => { setMyEventsOnly(s=>!s); setPage(1); }}>{myEventsOnly?'All Events':'My Events'}</button>
          </div>
        </motion.div>

        <AnimatePresence>
          {showFilters && (
            <motion.div className="filters-container" initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.3 }}>
              {[
                { label:'Category', key:'category', opts:[['all','All Categories'],['conference','Conference'],['workshop','Workshop'],['networking','Networking'],['social','Social'],['tech','Tech'],['business','Business'],['arts','Arts & Culture']] },
                { label:'Time Frame', key:'timeFrame', opts:[['all','All Time'],['today','Today'],['week','This Week'],['month','This Month']] },
                { label:'Location', key:'location', opts:[['all','All Locations'],['virtual','Virtual'],['in-person','In-Person']] },
                { label:'Price', key:'price', opts:[['all','All Prices'],['free','Free'],['paid','Paid']] },
                { label:'Attendance', key:'attendance', opts:[['all','All Events'],['registered','Registered'],['saved','Saved']] },
              ].map(({ label, key, opts }) => (
                <div className="filter-group" key={key}>
                  <label>{label}</label>
                  <select value={filterOptions[key]} onChange={e => setFilterOptions(f => ({ ...f, [key]: e.target.value }))}>
                    {opts.map(([v,t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                </div>
              ))}
              <button className="reset-filters-button" onClick={resetFilters}>Reset Filters</button>
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoading && filteredEvents.length === 0 && (
          <NoEventsFound isFiltered={events.length > 0 && (searchTerm || Object.values(filterOptions).some(v => v!=='all'))} resetFilters={resetFilters} createNewEvent={() => setShowCreateModal(true)} />
        )}

        {filteredEvents.length > 0 && (
          <>
            <motion.div className={`events-${viewMode}`} variants={containerVariants}>
              {filteredEvents.map(event => (
                <motion.div key={event._id||event.id} className={`event-card ${viewMode}`} variants={itemVariants} whileHover={{ y:-5, boxShadow:'0 10px 20px rgba(0,0,0,0.1)' }} onClick={() => { setSelectedEvent(event); setShowEventDetails(true); }}>
                  <div className="event-image-container">
                    <img src={event.imageUrl||'https://via.placeholder.com/300x150?text=Event'} alt={event.title} className="event-image"/>
                    <button className="favorite-button" onClick={e => { e.stopPropagation(); toggleFavorite(event._id||event.id); }}>
                      {event.isFavorite ? <FaHeart className="favorite-icon active"/> : <FaRegHeart className="favorite-icon"/>}
                    </button>
                    {event.isAttending && <div className="registered-badge">Registered</div>}
                  </div>
                  <div className="event-content">
                    <div className="event-category">{event.category}</div>
                    <h3 className="event-title">{event.title}</h3>
                    <div className="event-details">
                      <div className="event-detail"><FaCalendarAlt className="detail-icon"/><span>{formatDate(event.date)}</span></div>
                      <div className="event-detail"><FaMapMarkerAlt className="detail-icon"/><span>{event.location}</span></div>
                      {viewMode === 'list' && <div className="event-detail"><FaUsers className="detail-icon"/><span>{event.attendeesCount||0} attending</span></div>}
                    </div>
                    {viewMode === 'list' && event.description && <p className="event-description">{event.description.substring(0,150)}{event.description.length>150?'...':''}</p>}
                    {viewMode === 'list' && (
                      <div className="list-view-actions">
                        <button className={`register-button ${event.isAttending?'registered':''}`} onClick={e => { e.stopPropagation(); registerForEvent(event._id||event.id); }} disabled={event.isAttending}>{event.isAttending?'Registered':'Register'}</button>
                        <div className="price-tag">{event.price>0?`$${event.price.toFixed(2)}`:'Free'}</div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
            {hasMore && <div className="load-more-container"><button className="load-more-button" onClick={() => setPage(p=>p+1)} disabled={isLoading}>{isLoading?'Loading...':'Load More Events'}</button></div>}
          </>
        )}
      </motion.div>

      <CreateEventModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onEventCreated={e => { setEvents(prev => [e,...prev]); setShowCreateModal(false); }}/>

      <AnimatePresence>
        {showEventDetails && selectedEvent && (
          <motion.div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 }} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setShowEventDetails(false)}>
            <motion.div style={{ backgroundColor:'white', borderRadius:'10px', width:'90%', maxWidth:'800px', maxHeight:'90vh', overflow:'auto', position:'relative' }} initial={{ y:50, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:50, opacity:0 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowEventDetails(false)} style={{ position:'absolute', top:10, right:10, background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', zIndex:1 }}><FaTimes/></button>
              <img src={selectedEvent.imageUrl||'https://via.placeholder.com/800x400?text=Event'} alt={selectedEvent.title} style={{ width:'100%', height:'250px', objectFit:'cover', borderRadius:'10px 10px 0 0' }}/>
              <div style={{ padding:'20px' }}>
                <span style={{ backgroundColor:'#eee', borderRadius:'4px', padding:'2px 8px', fontSize:'0.8rem' }}>{selectedEvent.category}</span>
                <h2 style={{ margin:'10px 0' }}>{selectedEvent.title}</h2>
                <p><FaCalendarAlt style={{ marginRight:6 }}/>{formatDate(selectedEvent.date)}</p>
                <p><FaMapMarkerAlt style={{ marginRight:6 }}/>{selectedEvent.location}</p>
                <p><FaUsers style={{ marginRight:6 }}/>{selectedEvent.attendeesCount||0} attending</p>
                <p><FaTicketAlt style={{ marginRight:6 }}/>{selectedEvent.price>0?`$${selectedEvent.price.toFixed(2)}`:'Free'}</p>
                <p style={{ marginTop:'10px' }}>{selectedEvent.description}</p>
                <div style={{ display:'flex', gap:'10px', marginTop:'15px' }}>
                  <button className={`register-button ${selectedEvent.isAttending?'registered':''}`} onClick={() => registerForEvent(selectedEvent._id||selectedEvent.id)} disabled={selectedEvent.isAttending}>{selectedEvent.isAttending?'Registered':'Register Now'}</button>
                  <button className={`favorite-button ${selectedEvent.isFavorite?'favorited':''}`} onClick={() => toggleFavorite(selectedEvent._id||selectedEvent.id)}>{selectedEvent.isFavorite?<FaHeart/>:<FaRegHeart/>} {selectedEvent.isFavorite?'Saved':'Save'}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Events;
