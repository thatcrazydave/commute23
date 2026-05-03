import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaImage, FaSmile, FaInfoCircle, FaCloudUploadAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import API from './services/api';
import clientLogger from './utils/clientLogger';
import Avatar from './components/Avatar';
import './css/CreatePostModal.css';

const MAX_FILES = 10;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];

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
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
  const modalVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
    exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } },
  };

  const updateCursorPosition = () => {
    if (textareaRef.current) setCursorPosition(textareaRef.current.selectionStart);
  };

  const handleFileChange = useCallback((e) => {
    const incoming = Array.from(e.target.files || []);
    if (!incoming.length) return;

    const remaining = MAX_FILES - mediaFiles.length;
    if (remaining <= 0) { setError(`Maximum ${MAX_FILES} files per post`); return; }
    const selected = incoming.slice(0, remaining);

    const invalid = selected.find(f => !ALLOWED_MIMES.includes(f.type));
    if (invalid) { setError(`Unsupported file type: ${invalid.type}`); return; }

    const oversized = selected.find(f =>
      f.type.startsWith('image/') ? f.size > MAX_IMAGE_SIZE : f.size > MAX_VIDEO_SIZE
    );
    if (oversized) {
      setError(oversized.type.startsWith('image/') ? 'Images must be under 10MB' : 'Videos must be under 50MB');
      return;
    }

    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreviews(prev => [...prev, { url: reader.result, type: file.type.startsWith('image/') ? 'image' : 'video' }]);
      };
      reader.readAsDataURL(file);
    });

    setMediaFiles(prev => [...prev, ...selected]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [mediaFiles.length]);

  const removeMedia = useCallback((index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setPreviewIndex(prev => Math.max(0, Math.min(prev, mediaFiles.length - 2)));
  }, [mediaFiles.length]);

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
      clientLogger.warn('Emoji insert error', { error: err.message });
    }
  };

  const uploadOne = async (file, index) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await API.post('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total) {
          setUploadProgress(prev => ({ ...prev, [index]: Math.round((e.loaded / e.total) * 100) }));
        }
      },
    });
    return data.data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && mediaFiles.length === 0) { setError('Please add some content or media'); return; }
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      let mediaIds = [];

      if (mediaFiles.length > 0) {
        try {
          const results = await Promise.all(mediaFiles.map((f, i) => uploadOne(f, i)));
          mediaIds = results.map(r => r.mediaId);
        } catch (uploadErr) {
          setError('Failed to upload media. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      if (isOffline) {
        onSubmit({
          _id: `temp-${Date.now()}`,
          content: content.trim(),
          media: mediaPreviews.map((p, i) => ({ cdnUrl: p.url, mediaType: p.type, sortOrder: i })),
          mediaType: mediaFiles.length === 0 ? 'none' : mediaFiles.length > 1 ? 'mixed' : (mediaFiles[0].type.startsWith('image/') ? 'image' : 'video'),
          author: { firstName: user.firstName, lastName: user.lastName, photoURL: user.photoURL, username: user.username },
          authorId: user._id || user.uid || user.id,
          createdAt: new Date(),
          likesCount: 0, commentsCount: 0, isLiked: false, isPending: true,
        });
        onClose();
        return;
      }

      const { data } = await API.post('/posts', { content: content.trim(), mediaIds });
      if (data.success) {
        onSubmit(data.data.post);
        onClose();
      } else {
        setError(data.error?.message || 'Failed to create post');
        setIsSubmitting(false);
      }
    } catch (err) {
      clientLogger.error('Create post error', { error: err.message });
      setError(err.response?.data?.error?.message || 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  const totalProgress = mediaFiles.length > 0
    ? Math.round(Object.values(uploadProgress).reduce((s, v) => s + v, 0) / mediaFiles.length)
    : 0;

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
            <Avatar user={user} size={40} className="user-avatar" />
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

            {mediaPreviews.length > 0 && (
              <div className="media-preview">
                {mediaPreviews.length > 1 && (
                  <div className="carousel-nav">
                    <button type="button" className="carousel-btn" onClick={() => setPreviewIndex(i => Math.max(0, i - 1))} disabled={previewIndex === 0}>
                      <FaChevronLeft />
                    </button>
                    <span className="carousel-counter">{previewIndex + 1} / {mediaPreviews.length}</span>
                    <button type="button" className="carousel-btn" onClick={() => setPreviewIndex(i => Math.min(mediaPreviews.length - 1, i + 1))} disabled={previewIndex === mediaPreviews.length - 1}>
                      <FaChevronRight />
                    </button>
                  </div>
                )}

                <button type="button" className="remove-media" onClick={() => removeMedia(previewIndex)} aria-label="Remove media">
                  <FaTimes />
                </button>

                {mediaPreviews[previewIndex]?.type === 'image'
                  ? <img src={mediaPreviews[previewIndex].url} alt="Preview" />
                  : <video src={mediaPreviews[previewIndex]?.url} controls />}

                {isSubmitting && mediaFiles.length > 0 && (
                  <div className="upload-progress">
                    <div className="progress-bar" style={{ width: `${totalProgress}%` }} />
                    <span className="progress-text">{totalProgress}%</span>
                  </div>
                )}

                {mediaPreviews.length > 1 && (
                  <div className="media-thumbs">
                    {mediaPreviews.map((p, i) => (
                      <button key={i} type="button" className={`thumb-btn ${i === previewIndex ? 'active' : ''}`} onClick={() => setPreviewIndex(i)}>
                        {p.type === 'image'
                          ? <img src={p.url} alt={`thumb-${i}`} />
                          : <span className="video-thumb">▶</span>}
                      </button>
                    ))}
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
                  accept="image/*,video/mp4,video/quicktime"
                  multiple
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting || mediaFiles.length >= MAX_FILES}
                  className="media-button"
                  aria-label={`Add photo or video (${mediaFiles.length}/${MAX_FILES})`}
                  title={`Add media (${mediaFiles.length}/${MAX_FILES})`}
                >
                  <FaImage />
                  {mediaFiles.length > 0 && <span className="media-count">{mediaFiles.length}</span>}
                </button>
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="emoji-button" aria-label="Add emoji">
                  <FaSmile />
                </button>
              </div>
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
              >
                {isSubmitting
                  ? (mediaFiles.length > 0 ? `Uploading ${totalProgress}%...` : 'Posting...')
                  : isOffline ? 'Save for Later' : 'Post'}
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
