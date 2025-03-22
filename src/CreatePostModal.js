import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaImage, FaSmile, FaInfoCircle, FaCloudUploadAlt } from 'react-icons/fa';
import { collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import './CreatePostModal.css';

// Create a fallback component for when emoji-picker-react fails to load
const EmojiFallback = () => (
  <div className="emoji-fallback">
    <p>Emoji picker is not available</p>
  </div>
);

// Dynamically import the EmojiPicker to handle failures gracefully
const EmojiPickerComponent = ({ onEmojiClick }) => {
  const [EmojiPicker, setEmojiPicker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const loadEmojiPicker = async () => {
      try {
        setIsLoading(true);
        const module = await import('emoji-picker-react');
        setEmojiPicker(() => module.default);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load emoji picker:", error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    loadEmojiPicker();
  }, []);

  if (isLoading) return <div className="loading-emoji">Loading emojis...</div>;
  if (hasError || !EmojiPicker) return <EmojiFallback />;

  return (
    <EmojiPicker
      onEmojiClick={onEmojiClick}
      disableAutoFocus={true}
      searchPlaceholder="Search emoji..."
    />
  );
};

const CreatePostModal = ({ user, onClose, onSubmit, isOffline }) => {
  // State management
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Refs
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const modalRef = useRef(null);

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const modalVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', damping: 25, stiffness: 300 }
    },
    exit: { 
      opacity: 0, 
      y: 20, 
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  // Track textarea cursor position
  const updateCursorPosition = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload an image (JPG, PNG, GIF) or video (MP4, MOV)');
      return;
    }

    // Set media type and file
    setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
    setMediaFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => setMediaPreview(reader.result);
    reader.readAsDataURL(file);
    
    setError(null);
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiData) => {
    try {
      const { emoji } = emojiData;
      
      if (textareaRef.current) {
        const start = cursorPosition;
        const end = cursorPosition;
        
        const newText = 
          content.substring(0, start) + 
          emoji + 
          content.substring(end);
        
        setContent(newText);
        
        // Focus and set cursor position after emoji insertion
        const newPosition = start + emoji.length;
        
        // Use setTimeout to ensure React updates the textarea first
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newPosition, newPosition);
            setCursorPosition(newPosition);
          }
        }, 0);
      }
    } catch (error) {
      console.error("Error handling emoji:", error);
    }
  };

  // Handle media upload
  const uploadMedia = async (file) => {
    if (!file) return null;
    
    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
      const filePath = `posts/${user.uid}/${fileName}`;
      const storageRef = ref(storage, filePath);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error("Error in uploadMedia:", error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!content.trim() && !mediaFile) {
      setError("Please enter some content or attach media to your post");
      return;
    }
    
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      let mediaUrl = null;
      
      // Upload media if present
      if (mediaFile) {
        try {
          mediaUrl = await uploadMedia(mediaFile);
        } catch (error) {
          console.error("Media upload failed:", error);
          setError('Failed to upload media. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }
      
      // Prepare post data
      const postData = {
        authorId: user.uid,
        author: {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          photoURL: user.photoURL || '/images/default-avatar.png'
        },
        content: content.trim(),
        mediaUrl,
        mediaType,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        likes: [],
        likesCount: 0,
        comments: [],
        commentsCount: 0,
        shares: 0
      };

      // Handle offline mode
      if (isOffline) {
        onSubmit({ ...postData, id: `temp-${Date.now()}`, isPending: true });
        onClose();
        return;
      }

      // Create post in Firestore
      try {
        const docRef = await addDoc(collection(db, 'posts'), {
          ...postData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        onSubmit({ ...postData, id: docRef.id });
        onClose();
      } catch (error) {
        console.error("Firestore error:", error);
        setError('Failed to create post. Please try again later.');
        setIsSubmitting(false);
      }
      
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Handle click outside to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <motion.div 
      className="modal-backdrop"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={handleBackdropClick}
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
          <button 
            type="button" 
            className="close-button" 
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="modal-content">
          {/* User info */}
          <div className="user-info">
            <img 
              src={user.photoURL || '/images/default-avatar.png'} 
              alt={`${user.firstName || ''} ${user.lastName || ''}`} 
              className="user-avatar"
            />
            <span className="user-name">
              {user.firstName || ''} {user.lastName || ''}
            </span>
          </div>

          {/* Creation form */}
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

            {/* Media preview */}
            {mediaPreview && (
              <div className="media-preview">
                <button 
                  type="button"
                  className="remove-media"
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview(null);
                    setMediaType(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  aria-label="Remove media"
                >
                  <FaTimes />
                </button>
                {mediaType === 'image' ? (
                  <img src={mediaPreview} alt="Uploaded content preview" />
                ) : (
                  <video src={mediaPreview} controls />
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="upload-progress">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${uploadProgress}%` }}
                      role="progressbar"
                      aria-valuenow={uploadProgress}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    />
                    <span className="progress-text">{Math.round(uploadProgress)}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="error-message">
                <FaInfoCircle /> {error}
                <button
                  type="button"
                  className="dismiss-error"
                  onClick={() => setError(null)}
                  aria-label="Dismiss error"
                >
                  <FaTimes />
                </button>
              </div>
            )}

            {/* Offline indicator */}
            {isOffline && (
              <div className="offline-indicator">
                <FaCloudUploadAlt /> Your post will be published when you're back online
              </div>
            )}

            {/* Action buttons */}
            <div className="post-actions">
              <div className="media-buttons">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*, video/*"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="media-button"
                  aria-label="Add photo or video"
                >
                  <FaImage />
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="emoji-button"
                  aria-label="Add emoji"
                >
                  <FaSmile />
                </button>
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting || (!content.trim() && !mediaFile)}
              >
                {isSubmitting ? 'Posting...' : isOffline ? 'Save for Later' : 'Post'}
              </button>
            </div>
          </form>

          {/* Emoji picker */}
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