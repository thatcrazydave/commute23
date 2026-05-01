import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaImage, FaSmile, FaInfoCircle, FaCloudUploadAlt } from 'react-icons/fa';
import API from './services/api';
import './css/CreatePostModal.css';

const EmojiFallback = () => <div className="emoji-fallback"><p>Emoji picker unavailable</p></div>;

const EmojiPickerComponent = ({ onEmojiClick }) => {
  const [EmojiPicker, setEmojiPicker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    import('emoji-picker-react')
      .then(m => { setEmojiPicker(() => m.default); setIsLoading(false); })
      .catch(() => { setHasError(true); setIsLoading(false); });
  }, []);

  if (isLoading) return <div className="loading-emoji">Loading emojis...</div>;
  if (hasError || !EmojiPicker) return <EmojiFallback />;
  return <EmojiPicker onEmojiClick={onEmojiClick} disableAutoFocus searchPlaceholder="Search emoji..." />;
};

const CreatePostModal = ({ user, onClose, onSubmit, isOffline }) => {
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const modalRef = useRef(null);

  const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
  const modalVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
    exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } },
  };

  const updateCursorPosition = () => {
    if (textareaRef.current) setCursorPosition(textareaRef.current.selectionStart);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('File size must be less than 10MB'); return; }
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (!allowed.includes(file.type)) { setError('Unsupported file type'); return; }
    setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
    setMediaFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setMediaPreview(reader.result);
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleEmojiClick = (emojiData) => {
    try {
      const { emoji } = emojiData;
      const start = cursorPosition;
      const newText = content.substring(0, start) + emoji + content.substring(start);
      setContent(newText);
      const newPos = start + emoji.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPos, newPos);
          setCursorPosition(newPos);
        }
      }, 0);
    } catch (err) {
      console.error('Emoji error:', err);
    }
  };

  const uploadMedia = async (file) => {
    const form = new FormData();
    form.append('file', file);
    // Track progress manually via XMLHttpRequest since axios doesn't expose it easily
    const { data } = await API.post('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return data.data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaFile) { setError('Please add some content or media'); return; }
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      let mediaUrl = null;
      let resolvedMediaType = null;

      if (mediaFile) {
        try {
          const uploaded = await uploadMedia(mediaFile);
          mediaUrl = uploaded.url;
          resolvedMediaType = uploaded.mediaType;
        } catch (uploadErr) {
          setError('Failed to upload media. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      if (isOffline) {
        onSubmit({
          id: `temp-${Date.now()}`,
          content: content.trim(),
          mediaUrl,
          mediaType: resolvedMediaType,
          author: { firstName: user.firstName, lastName: user.lastName, photoURL: user.photoURL },
          authorId: user.uid || user.id,
          createdAt: new Date(),
          likes: [], likesCount: 0, comments: [], commentsCount: 0,
          isLiked: false, isPending: true,
        });
        onClose();
        return;
      }

      const { data } = await API.post('/posts', { content: content.trim(), mediaUrl, mediaType: resolvedMediaType });
      if (data.success) {
        onSubmit(data.data.post);
        onClose();
      } else {
        setError(data.error?.message || 'Failed to create post');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Create post error:', err);
      setError(err.response?.data?.error?.message || 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="modal-backdrop"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="create-post-modal"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Create Post</h2>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <div className="modal-content">
          <div className="user-info">
            <img
              src={user.photoURL || '/images/default-avatar.png'}
              alt={`${user.firstName || ''} ${user.lastName || ''}`}
              className="user-avatar"
            />
            <span className="user-name">{user.firstName || ''} {user.lastName || ''}</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onClick={updateCursorPosition}
                onKeyUp={updateCursorPosition}
                onSelect={updateCursorPosition}
                placeholder={`What's on your mind, ${user.firstName || 'there'}?`}
                disabled={isSubmitting}
                rows={4}
                aria-label="Post content"
              />
            </div>

            {mediaPreview && (
              <div className="media-preview">
                <button
                  type="button"
                  className="remove-media"
                  onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaType(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  aria-label="Remove media"
                >
                  <FaTimes />
                </button>
                {mediaType === 'image' ? (
                  <img src={mediaPreview} alt="Preview" />
                ) : (
                  <video src={mediaPreview} controls />
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="upload-progress">
                    <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                    <span className="progress-text">{Math.round(uploadProgress)}%</span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="error-message">
                <FaInfoCircle /> {error}
                <button type="button" className="dismiss-error" onClick={() => setError(null)} aria-label="Dismiss">
                  <FaTimes />
                </button>
              </div>
            )}

            {isOffline && (
              <div className="offline-indicator">
                <FaCloudUploadAlt /> Your post will be published when you're back online
              </div>
            )}

            <div className="post-actions">
              <div className="media-buttons">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*, video/*"
                  style={{ display: 'none' }}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting} className="media-button" aria-label="Add photo or video">
                  <FaImage />
                </button>
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="emoji-button" aria-label="Add emoji">
                  <FaSmile />
                </button>
              </div>
              <button type="submit" className="submit-button" disabled={isSubmitting || (!content.trim() && !mediaFile)}>
                {isSubmitting ? 'Posting...' : isOffline ? 'Save for Later' : 'Post'}
              </button>
            </div>
          </form>

          {showEmojiPicker && (
            <div className="emoji-picker-container">
              <EmojiPickerComponent onEmojiClick={handleEmojiClick} />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CreatePostModal;
