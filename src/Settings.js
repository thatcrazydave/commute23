import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUser,
  FaBell,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaCamera,
  FaEnvelope,
  FaShieldAlt,
  FaToggleOn,
  FaToggleOff,
  FaVideo,
  FaArchive,
  FaTrash
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import API from './services/api';
import Avatar from './components/Avatar';
import { useAuth } from './contexts/AuthContext';
import './css/Settings.css';

const UnsavedModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="settings-modal-overlay">
      <motion.div
        className="settings-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <h3>Unsaved Changes</h3>
        <p>You have unsaved changes. Are you sure you want to leave? Changes will be lost if not saved.</p>
        <div className="settings-modal-actions">
          <button className="settings-btn settings-btn--secondary" style={{ backgroundColor: '#e5e7eb', color: '#374151' }} onClick={onCancel}>Stay</button>
          <button className="settings-btn settings-btn--danger" onClick={onConfirm}>Leave</button>
        </div>
      </motion.div>
    </div>
  );
};

const TABS = [
  { id: 'profile', label: 'Profile', icon: <FaUser /> },
  { id: 'account', label: 'Account & Security', icon: <FaShieldAlt /> },
  { id: 'notifications', label: 'Notifications', icon: <FaBell /> },
  { id: 'video', label: 'Video Playback', icon: <FaVideo /> },
];

const Toast = ({ message, type, onClose }) => (
  <motion.div
    className={`settings-toast settings-toast--${type}`}
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
  >
    {type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
    <span>{message}</span>
    <button className="settings-toast__close" onClick={onClose}>×</button>
  </motion.div>
);

const ProfileTab = ({ user, onProfileUpdate, setIsDirty }) => {
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    headline: user?.headline || '',
    bio: user?.bio || '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      headline: user?.headline || '',
      bio: user?.bio || '',
    });
  }, [user]);

  useEffect(() => {
    const isChanged = 
      form.firstName !== (user?.firstName || '') ||
      form.lastName !== (user?.lastName || '') ||
      form.headline !== (user?.headline || '') ||
      form.bio !== (user?.bio || '');
    if (setIsDirty) setIsDirty(isChanged);
  }, [form, user, setIsDirty]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) {
      showToast('First name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await API.patch('/users/me', form);
      const updated = res.data?.data?.user || res.data?.user;
      if (updated) onProfileUpdate(updated);
      if (setIsDirty) setIsDirty(false);
      showToast('Profile updated successfully!');
      API.post('/logs/client', { level: 'info', message: 'User updated profile settings', meta: { tab: 'profile' } }).catch(() => {});
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to save changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-panel">
      <AnimatePresence>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

      <div className="settings-section">
        <div className="settings-avatar-row">
          <div className="settings-avatar-wrap">
            <Avatar user={user} size={80} />
            <button className="settings-avatar-edit" title="Change photo (coming soon)" disabled>
              <FaCamera />
            </button>
          </div>
          <div>
            <p className="settings-avatar-name">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="settings-avatar-sub">{user?.headline || 'No headline set'}</p>
          </div>
        </div>
      </div>

      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-section">
          <h3 className="settings-section-title">Personal Information</h3>
          <div className="settings-form-row">
            <div className="settings-field">
              <label htmlFor="settings-firstName">First Name</label>
              <input
                id="settings-firstName"
                type="text"
                value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                placeholder="First name"
              />
            </div>
            <div className="settings-field">
              <label htmlFor="settings-lastName">Last Name</label>
              <input
                id="settings-lastName"
                type="text"
                value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                placeholder="Last name"
              />
            </div>
          </div>
          <div className="settings-field">
            <label htmlFor="settings-headline">Headline</label>
            <input
              id="settings-headline"
              type="text"
              value={form.headline}
              onChange={e => setForm(f => ({ ...f, headline: e.target.value }))}
              placeholder="e.g. Software Engineer at Commute"
              maxLength={100}
            />
            <span className="settings-char-count">{form.headline.length}/100</span>
          </div>
          <div className="settings-field">
            <label htmlFor="settings-bio">Bio</label>
            <textarea
              id="settings-bio"
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell your community a bit about yourself..."
              rows={4}
              maxLength={300}
            />
            <span className="settings-char-count">{form.bio.length}/300</span>
          </div>
        </div>

        <div className="settings-actions">
          <button type="submit" className="settings-btn settings-btn--primary" disabled={saving}>
            {saving ? <><FaSpinner className="spin" /> Saving…</> : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

const AccountTab = ({ user, setIsDirty }) => {
  const navigate = useNavigate();
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [resetSent, setResetSent] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const isChanged = pwForm.newPw !== '' || pwForm.confirm !== '';
    if (setIsDirty) setIsDirty(isChanged);
  }, [pwForm, setIsDirty]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.newPw || pwForm.newPw.length < 8) {
      showToast('New password must be at least 8 characters.', 'error');
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    setPwSaving(true);
    try {
      await API.post('/auth/forgot-password', { email: user?.email });
      setResetSent(true);
      setPwForm({ current: '', newPw: '', confirm: '' });
      if (setIsDirty) setIsDirty(false);
      showToast('A password reset link has been sent to your email.');
      API.post('/logs/client', { level: 'info', message: 'User requested password reset via settings', meta: { tab: 'account' } }).catch(() => {});
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to send reset email.', 'error');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="settings-panel">
      <AnimatePresence>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

      <div className="settings-section">
        <h3 className="settings-section-title">Account Details</h3>
        <div className="settings-info-row">
          <FaEnvelope className="settings-info-icon" />
          <div>
            <p className="settings-info-label">Email Address</p>
            <p className="settings-info-value">{user?.email || '—'}</p>
          </div>
          <span className="settings-badge settings-badge--verified">Verified</span>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Change Password</h3>
        <p className="settings-section-desc">
          For your security, we'll send a password reset link to your registered email address.
        </p>
        {resetSent ? (
          <div className="settings-success-box">
            <FaCheckCircle />
            <span>Check your inbox at <strong>{user?.email}</strong> for the reset link.</span>
          </div>
        ) : (
          <form className="settings-form" onSubmit={handleChangePassword}>
            <div className="settings-field">
              <label htmlFor="settings-newPw">New Password</label>
              <input
                id="settings-newPw"
                type="password"
                value={pwForm.newPw}
                onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="settings-field">
              <label htmlFor="settings-confirmPw">Confirm New Password</label>
              <input
                id="settings-confirmPw"
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repeat new password"
              />
            </div>
            <div className="settings-actions">
              <button type="submit" className="settings-btn settings-btn--primary" disabled={pwSaving}>
                {pwSaving ? <><FaSpinner className="spin" /> Sending…</> : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Data & Content</h3>
        <p className="settings-section-desc">
          Manage your archived and recently deleted posts.
        </p>
        <div className="settings-actions" style={{ justifyContent: 'flex-start', gap: '1rem', marginTop: '1rem' }}>
          <button className="settings-btn settings-btn--secondary" onClick={() => navigate('/archive')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaArchive /> View Archive
          </button>
          <button className="settings-btn settings-btn--secondary" onClick={() => navigate('/trash')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaTrash /> Recently Deleted
          </button>
        </div>
      </div>

      <div className="settings-section settings-section--danger">
        <h3 className="settings-section-title settings-section-title--danger">Danger Zone</h3>
        <p className="settings-section-desc">
          Deleting your account is permanent and cannot be undone. All your data will be erased.
        </p>
        <button className="settings-btn settings-btn--danger" disabled title="Contact support to delete your account">
          Delete Account
        </button>
      </div>
    </div>
  );
};

const NOTIF_PREF_DEFAULTS = {
  newConnection: true,
  connectionRequest: true,
  newComment: true,
  newLike: false,
  newPost: true,
  eventReminder: true,
  systemAnnouncements: true,
};

const NotificationsTab = ({ setIsDirty }) => {
  const [prefs, setPrefs] = useState(NOTIF_PREF_DEFAULTS);
  const [initialPrefs, setInitialPrefs] = useState(NOTIF_PREF_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    API.get('/notifications/preferences')
      .then(({ data }) => {
        if (data.success) {
          const loaded = { ...NOTIF_PREF_DEFAULTS, ...data.data.preferences };
          setPrefs(loaded);
          setInitialPrefs(loaded);
        }
      })
      .catch(() => setError('Failed to load preferences'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (setIsDirty) setIsDirty(JSON.stringify(prefs) !== JSON.stringify(initialPrefs));
  }, [prefs, initialPrefs, setIsDirty]);

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    try {
      await API.patch('/notifications/preferences', prefs);
      setInitialPrefs(prefs);
      if (setIsDirty) setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Failed to save preferences');
    }
  };

  const rows = [
    { key: 'newConnection', label: 'Someone connects with you', desc: 'Get notified when a connection request is accepted' },
    { key: 'connectionRequest', label: 'New connection request', desc: 'Get notified when someone sends you a request' },
    { key: 'newComment', label: 'Comments on your posts', desc: 'Get notified when someone comments on your content' },
    { key: 'newLike', label: 'Likes on your posts', desc: 'Get notified when someone likes your posts' },
    { key: 'newPost', label: 'Posts from connections', desc: 'Get notified when your connections share new posts' },
    { key: 'eventReminder', label: 'Event reminders', desc: 'Get reminded about events you\'ve joined or saved' },
    { key: 'systemAnnouncements', label: 'System announcements', desc: 'Important updates and announcements from Commute' },
  ];

  if (loading) {
    return (
      <div className="settings-panel">
        <div className="settings-section" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888' }}>
          <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Loading preferences…
        </div>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <div className="settings-section">
        <h3 className="settings-section-title">In-App Notifications</h3>
        <p className="settings-section-desc">
          Choose what you'd like to be notified about inside the app.
        </p>
        {error && <p style={{ color: '#e53e3e', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{error}</p>}
        <div className="settings-notif-list">
          {rows.map(({ key, label, desc }) => (
            <div key={key} className="settings-notif-row">
              <div className="settings-notif-info">
                <p className="settings-notif-label">{label}</p>
                <p className="settings-notif-desc">{desc}</p>
              </div>
              <button
                className={`settings-toggle ${prefs[key] ? 'settings-toggle--on' : ''}`}
                onClick={() => toggle(key)}
                aria-label={`Toggle ${label}`}
              >
                {prefs[key] ? <FaToggleOn /> : <FaToggleOff />}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="settings-actions">
        <button className="settings-btn settings-btn--primary" onClick={handleSave}>
          {saved ? <><FaCheckCircle /> Saved!</> : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

const VideoTab = ({ user, onProfileUpdate, setIsDirty }) => {
  const [quality, setQuality] = useState(user?.videoQuality || 'auto');
  const [initialQuality, setInitialQuality] = useState(user?.videoQuality || 'auto');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (setIsDirty) setIsDirty(quality !== initialQuality);
  }, [quality, initialQuality, setIsDirty]);

  const handleSave = async () => {
    try {
      const res = await API.patch('/users/me', { videoQuality: quality });
      const updated = res.data?.data?.user || res.data?.user;
      if (updated && onProfileUpdate) onProfileUpdate(updated);
      setInitialQuality(quality);
      if (setIsDirty) setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Failed to save preferences');
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-section">
        <h3 className="settings-section-title">Video Quality</h3>
        <p className="settings-section-desc">
          Choose your preferred video playback quality. "Auto" will dynamically adjust the quality based on your current network level (better network = higher quality).
        </p>
        
        <div className="settings-form" style={{ marginTop: '1rem' }}>
          <div className="settings-field">
            <label htmlFor="video-quality">Default Quality</label>
            <select 
              id="video-quality" 
              value={quality} 
              onChange={e => setQuality(e.target.value)}
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #eeeeee', fontSize: '0.9rem' }}
            >
              <option value="auto">Auto (Recommended)</option>
              <option value="1080p">High (1080p)</option>
              <option value="720p">Medium (720p)</option>
              <option value="480p">Data Saver (480p)</option>
            </select>
          </div>
        </div>
      </div>
      {error && <p style={{ color: '#e53e3e', fontSize: '0.875rem', marginTop: '0.5rem' }}>{error}</p>}
      <div className="settings-actions">
        <button className="settings-btn settings-btn--primary" onClick={handleSave}>
          {saved ? <><FaCheckCircle /> Saved!</> : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

const Settings = ({ user, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isDirty, setIsDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleTabClick = (tabId) => {
    if (tabId === activeTab) return;
    if (isDirty) {
      setPendingTab(tabId);
    } else {
      setActiveTab(tabId);
    }
  };

  const confirmTabSwitch = () => {
    setIsDirty(false);
    setActiveTab(pendingTab);
    setPendingTab(null);
  };

  const cancelTabSwitch = () => {
    setPendingTab(null);
  };

  return (
    <motion.div
      className="settings-container"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
        <p className="settings-subtitle">Manage your profile, account, and preferences</p>
      </div>

      <div className="settings-layout">
        <nav className="settings-sidebar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
            >
              <span className="settings-nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="settings-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'profile' && <ProfileTab user={user} onProfileUpdate={onProfileUpdate} setIsDirty={setIsDirty} />}
              {activeTab === 'account' && <AccountTab user={user} setIsDirty={setIsDirty} />}
              {activeTab === 'notifications' && <NotificationsTab setIsDirty={setIsDirty} />}
              {activeTab === 'video' && <VideoTab user={user} onProfileUpdate={onProfileUpdate} setIsDirty={setIsDirty} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      
      <AnimatePresence>
        {pendingTab && (
          <UnsavedModal 
            isOpen={true} 
            onConfirm={confirmTabSwitch} 
            onCancel={cancelTabSwitch} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Settings;

export const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  
  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Settings user={user} onProfileUpdate={updateUser} />
    </div>
  );
};
