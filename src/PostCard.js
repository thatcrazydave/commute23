import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaThumbsUp, FaComment, FaEllipsisH, FaReply, FaTrash,
  FaChevronDown, FaSmile, FaEdit, FaEye, FaEyeSlash, FaBan, FaLink,
} from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import API from './services/api';
import clientLogger from './utils/clientLogger';
import CustomVideoPlayer from './components/CustomVideoPlayer';
import Avatar from './components/Avatar';
import './css/PostCard.css';

const PostCard = ({ post, currentUser, userProfile, onLike, onDelete, onUpdate, isOffline }) => {
  const postId = post._id || post.id;

  // Log what the feed returned for this post's settings on every render
  console.log('[PostCard] post prop', {
    postId: post._id || post.id,
    hideLikeCount: post.hideLikeCount,
    commentsDisabled: post.commentsDisabled,
    content: post.content?.slice(0, 60),
  });

  // Local post settings — initialized from prop, kept in sync on successful API calls
  const [localContent, setLocalContent] = useState(post.content);
  const [localHideLikeCount, setLocalHideLikeCount] = useState(post.hideLikeCount || false);
  const [localCommentsDisabled, setLocalCommentsDisabled] = useState(post.commentsDisabled || false);

  // Menu / edit / delete UI state
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [editError, setEditError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [menuLoading, setMenuLoading] = useState(null); // 'edit' | 'hideLikes' | 'disableComments'

  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [fetchedComments, setFetchedComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.commentsCount || 0);

  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState(null);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState(false);

  const [replies, setReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [showReplies, setShowReplies] = useState({});

  const onEmojiClick = (emojiObject) => setCommentText(prev => prev + emojiObject.emoji);
  const onReplyEmojiClick = (emojiObject) => setReplyText(prev => prev + emojiObject.emoji);

  const authorName = post.author?.firstName && post.author?.lastName
    ? `${post.author.firstName} ${post.author.lastName}`
    : post.author?.username || currentUser?.displayName || 'Anonymous';

  useEffect(() => {
    if (!showComments || fetchedComments.length > 0 || commentsLoading) return;
    fetchComments(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments]);

  const fetchComments = useCallback(async (page) => {
    setCommentsLoading(true);
    try {
      const { data } = await API.get(`/posts/${postId}/comments?page=${page}&limit=20`);
      const newComments = data.data.comments || [];
      setFetchedComments(prev => page === 1 ? newComments : [...prev, ...newComments]);
      setCommentPage(page);
      setHasMoreComments(newComments.length === 20);
    } catch (err) {
      clientLogger.error('Failed to load comments', { postId, page, error: err.message });
    } finally {
      setCommentsLoading(false);
    }
  }, [postId]);

  // ── Post menu actions ──────────────────────────────────────────────────────

  const handleSaveEdit = async () => {
    if (!editText.trim() || menuLoading) return;
    setEditError(null);
    setMenuLoading('edit');
    const payload = { content: editText.trim() };
    console.log('[PostCard] PATCH edit post → sending', { postId, payload });
    try {
      const { data } = await API.patch(`/posts/${postId}`, payload);
      console.log('[PostCard] PATCH edit post ← response', data);
      setLocalContent(editText.trim());
      onUpdate?.({ content: editText.trim() });
      setIsEditing(false);
    } catch (err) {
      const detail = err.response?.data || err.message;
      console.error('[PostCard] PATCH edit post ✗', { postId, status: err.response?.status, detail });
      setEditError('Failed to save. Please try again.');
      clientLogger.error('Failed to update post content', { postId, error: err.message });
    } finally {
      setMenuLoading(null);
    }
  };

  const handleToggleHideLikes = async () => {
    setShowMenu(false);
    const newVal = !localHideLikeCount;
    setLocalHideLikeCount(newVal);
    const payload = { hideLikeCount: newVal };
    console.log('[PostCard] PATCH hideLikeCount → sending', { postId, payload });
    try {
      const { data } = await API.patch(`/posts/${postId}`, payload);
      console.log('[PostCard] PATCH hideLikeCount ← response', data);
      onUpdate?.({ hideLikeCount: newVal });
    } catch (err) {
      const detail = err.response?.data || err.message;
      console.error('[PostCard] PATCH hideLikeCount ✗ — reverting', { postId, status: err.response?.status, detail });
      setLocalHideLikeCount(!newVal);
      clientLogger.error('Failed to update like visibility', { postId, error: err.message });
    }
  };

  const handleToggleComments = async () => {
    setShowMenu(false);
    const newVal = !localCommentsDisabled;
    setLocalCommentsDisabled(newVal);
    const payload = { commentsDisabled: newVal };
    console.log('[PostCard] PATCH commentsDisabled → sending', { postId, payload });
    try {
      const { data } = await API.patch(`/posts/${postId}`, payload);
      console.log('[PostCard] PATCH commentsDisabled ← response', data);
      onUpdate?.({ commentsDisabled: newVal });
    } catch (err) {
      const detail = err.response?.data || err.message;
      console.error('[PostCard] PATCH commentsDisabled ✗ — reverting', { postId, status: err.response?.status, detail });
      setLocalCommentsDisabled(!newVal);
      clientLogger.error('Failed to update commenting', { postId, error: err.message });
    }
  };

  // ── Comment submission ──────────────────────────────────────────────────────

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || commentSubmitting || isOffline || localCommentsDisabled) return;
    setCommentSubmitting(true);

    const optimistic = {
      _id: `temp-${Date.now()}`,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
      likesCount: 0,
      repliesCount: 0,
      isLikedByMe: false,
      author: {
        _id: currentUser?._id || currentUser?.id,
        firstName: userProfile?.firstName || '',
        lastName: userProfile?.lastName || '',
        photoURL: userProfile?.photoURL || '/images/default-avatar.png',
        username: userProfile?.username || '',
      },
    };
    setFetchedComments(prev => [optimistic, ...prev]);
    setLocalCommentsCount(c => c + 1);
    const text = commentText;
    setCommentText('');

    try {
      const { data } = await API.post(`/posts/${postId}/comment`, { content: text });
      setFetchedComments(prev =>
        prev.map(c => (c._id === optimistic._id ? data.data.comment : c))
      );
      setShowEmojiPicker(false);
    } catch (err) {
      setFetchedComments(prev => prev.filter(c => c._id !== optimistic._id));
      setLocalCommentsCount(c => Math.max(0, c - 1));
      setCommentText(text);
      clientLogger.error('Failed to post comment', { postId, error: err.message });
    } finally {
      setCommentSubmitting(false);
    }
  };

  // ── Comment liking ──────────────────────────────────────────────────────────

  const handleCommentLike = async (commentId) => {
    if (isOffline) return;
    const snapshotComments = fetchedComments;
    const snapshotReplies = replies;

    const applyToggle = (comment) => ({
      ...comment,
      isLikedByMe: !comment.isLikedByMe,
      likesCount: comment.isLikedByMe
        ? Math.max(0, (comment.likesCount || 0) - 1)
        : (comment.likesCount || 0) + 1,
    });

    setFetchedComments(prev => prev.map(c => c._id === commentId ? applyToggle(c) : c));
    setReplies(prev => {
      const next = {};
      for (const [cid, list] of Object.entries(prev)) {
        next[cid] = list.map(r => r._id === commentId ? applyToggle(r) : r);
      }
      return next;
    });

    try {
      await API.post(`/posts/${postId}/comments/${commentId}/like`);
    } catch (err) {
      setFetchedComments(snapshotComments);
      setReplies(snapshotReplies);
      clientLogger.error('Failed to like comment', { commentId, postId, error: err.message });
    }
  };

  // ── Replies ─────────────────────────────────────────────────────────────────

  const handleShowReplies = async (commentId) => {
    const isShowing = showReplies[commentId];
    setShowReplies(prev => ({ ...prev, [commentId]: !isShowing }));

    if (!isShowing && !replies[commentId]) {
      setLoadingReplies(prev => ({ ...prev, [commentId]: true }));
      try {
        const { data } = await API.get(`/posts/${postId}/comments/${commentId}/replies`);
        setReplies(prev => ({ ...prev, [commentId]: data.data.replies || [] }));
      } catch (err) {
        clientLogger.error('Failed to load replies', { commentId, postId, error: err.message });
      } finally {
        setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
      }
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || replySubmitting || isOffline) return;
    setReplyError(null);
    setReplySubmitting(true);

    const optimistic = {
      _id: `temp-reply-${Date.now()}`,
      content: replyText.trim(),
      createdAt: new Date().toISOString(),
      likesCount: 0,
      isLikedByMe: false,
      author: {
        _id: currentUser?._id || currentUser?.id,
        firstName: userProfile?.firstName || '',
        lastName: userProfile?.lastName || '',
        photoURL: userProfile?.photoURL || '/images/default-avatar.png',
        username: userProfile?.username || '',
      },
    };
    const parentId = replyingTo;
    setReplies(prev => ({ ...prev, [parentId]: [...(prev[parentId] || []), optimistic] }));
    setFetchedComments(prev =>
      prev.map(c => c._id === parentId ? { ...c, repliesCount: (c.repliesCount || 0) + 1 } : c)
    );
    const text = replyText;
    setReplyText('');

    try {
      const { data } = await API.post(`/posts/${postId}/comment`, { content: text, parentId });
      setReplies(prev => ({
        ...prev,
        [parentId]: (prev[parentId] || []).map(r => r._id === optimistic._id ? data.data.comment : r),
      }));
      setReplyingTo(null);
      setShowReplyEmojiPicker(false);
    } catch (err) {
      setReplies(prev => ({
        ...prev,
        [parentId]: (prev[parentId] || []).filter(r => r._id !== optimistic._id),
      }));
      setFetchedComments(prev =>
        prev.map(c => c._id === parentId ? { ...c, repliesCount: Math.max(0, (c.repliesCount || 0) - 1) } : c)
      );
      setReplyText(text);
      const msg = err.response?.data?.error?.message || 'Failed to post reply';
      setReplyError(msg);
      clientLogger.error('Failed to post reply', { postId, parentId, error: msg });
    } finally {
      setReplySubmitting(false);
    }
  };

  // ── Comment / reply deletion ─────────────────────────────────────────────────

  const handleDeleteComment = async (commentId, isReply = false, parentId = null) => {
    if (isOffline) return;
    if (isReply && parentId) {
      setReplies(prev => ({ ...prev, [parentId]: (prev[parentId] || []).filter(r => r._id !== commentId) }));
      setFetchedComments(prev =>
        prev.map(c => c._id === parentId ? { ...c, repliesCount: Math.max(0, (c.repliesCount || 0) - 1) } : c)
      );
    } else {
      setFetchedComments(prev => prev.filter(c => c._id !== commentId));
    }
    setLocalCommentsCount(c => Math.max(0, c - 1));

    try {
      await API.delete(`/posts/${postId}/comments/${commentId}`);
    } catch (err) {
      fetchComments(1);
      setLocalCommentsCount(post.commentsCount || 0);
      clientLogger.error('Failed to delete comment', { commentId, postId, error: err.message });
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const currentUserId = currentUser?._id || currentUser?.id || currentUser?.uid;

  const canDeleteComment = (comment) => {
    const authorId = comment.author?._id || comment.authorId;
    return (
      authorId?.toString() === currentUserId?.toString() ||
      ['admin', 'superadmin', 'moderator'].includes(currentUser?.role)
    );
  };

  const formatDate = (dateStr) => {
    try { return new Date(dateStr).toLocaleDateString(); } catch { return ''; }
  };

  // ── Render helpers ───────────────────────────────────────────────────────────

  const renderCommentActions = (comment, isReply = false, parentId = null) => (
    <div className="comment-actions">
      <span className="comment-date">{formatDate(comment.createdAt)}</span>

      <button
        className={`comment-action-btn comment-like-btn ${comment.isLikedByMe ? 'liked' : ''}`}
        onClick={() => handleCommentLike(comment._id)}
        disabled={isOffline}
        title={comment.isLikedByMe ? 'Unlike' : 'Like'}
      >
        <FaThumbsUp />
        {comment.likesCount > 0 && <span>{comment.likesCount}</span>}
      </button>

      {!isReply && (
        <button
          className="comment-action-btn"
          onClick={() => {
            setReplyingTo(replyingTo === comment._id ? null : comment._id);
            setReplyError(null);
            setReplyText('');
            setShowReplyEmojiPicker(false);
          }}
          disabled={isOffline}
          title="Reply"
        >
          <FaReply />
          <span>Reply</span>
        </button>
      )}

      {canDeleteComment(comment) && (
        <button
          className="comment-action-btn comment-delete-btn"
          onClick={() => handleDeleteComment(comment._id, isReply, parentId)}
          disabled={isOffline}
          title="Delete"
        >
          <FaTrash />
        </button>
      )}
    </div>
  );

  const renderComment = (comment) => (
    <div key={comment._id} className="comment">
      <img
        src={comment.author?.photoURL || '/images/default-avatar.png'}
        alt={comment.author?.firstName || 'User'}
        className="comment-avatar"
      />
      <div className="comment-body">
        <div className="comment-bubble">
          <h5 className="comment-author">
            {comment.author?.firstName
              ? `${comment.author.firstName} ${comment.author.lastName || ''}`.trim()
              : comment.author?.username || 'User'}
          </h5>
          <p className="comment-text">{comment.content}</p>
        </div>

        {renderCommentActions(comment)}

        {comment.repliesCount > 0 && (
          <button
            className="show-replies-btn"
            onClick={() => handleShowReplies(comment._id)}
          >
            <FaChevronDown
              className={`replies-chevron ${showReplies[comment._id] ? 'open' : ''}`}
            />
            {loadingReplies[comment._id]
              ? 'Loading replies...'
              : showReplies[comment._id]
                ? 'Hide replies'
                : `View ${comment.repliesCount} ${comment.repliesCount === 1 ? 'reply' : 'replies'}`}
          </button>
        )}

        {showReplies[comment._id] && (replies[comment._id] || []).map(reply => (
          <div key={reply._id} className="comment comment-reply">
            <img
              src={reply.author?.photoURL || '/images/default-avatar.png'}
              alt={reply.author?.firstName || 'User'}
              className="comment-avatar"
            />
            <div className="comment-body">
              <div className="comment-bubble">
                <h5 className="comment-author">
                  {reply.author?.firstName
                    ? `${reply.author.firstName} ${reply.author.lastName || ''}`.trim()
                    : reply.author?.username || 'User'}
                </h5>
                <p className="comment-text">{reply.content}</p>
              </div>
              {renderCommentActions(reply, true, comment._id)}
            </div>
          </div>
        ))}

        {replyingTo === comment._id && (
          <form className="reply-form" onSubmit={handleReplySubmit}>
            <img
              src={userProfile?.photoURL || '/images/default-avatar.png'}
              alt="You"
              className="comment-avatar"
            />
            <div className="reply-input-wrap">
              <div className="comment-input-container">
                <input
                  type="text"
                  placeholder={`Reply to ${comment.author?.firstName || 'this comment'}...`}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  disabled={replySubmitting}
                  autoFocus
                />
                <button
                  type="button"
                  className="emoji-btn"
                  onClick={() => setShowReplyEmojiPicker(!showReplyEmojiPicker)}
                >
                  <FaSmile />
                </button>
                {showReplyEmojiPicker && (
                  <div className="emoji-picker-container" onClick={(e) => {
                    if (e.target.closest('a[href="#"]')) e.preventDefault();
                  }}>
                    <EmojiPicker onEmojiClick={onReplyEmojiClick} />
                  </div>
                )}
              </div>
              <div className="reply-actions">
                {replyError && <span className="reply-error">{replyError}</span>}
                <button
                  type="button"
                  className="cancel-reply-btn"
                  onClick={() => { setReplyingTo(null); setReplyText(''); setReplyError(null); setShowReplyEmojiPicker(false); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button reply-submit-btn"
                  disabled={replySubmitting || !replyText.trim()}
                >
                  {replySubmitting ? 'Posting...' : 'Reply'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <div className="post-card">
      {/* Inline delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay">
          <p className="delete-confirm-text">Delete this post? This cannot be undone.</p>
          <div className="delete-confirm-actions">
            <button className="cancel-reply-btn" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </button>
            <button
              className="delete-confirm-btn"
              onClick={() => { setShowDeleteConfirm(false); onDelete(); }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="post-header">
        <div className="post-author">
          <Avatar user={post.author || currentUser} size={40} className="post-author-avatar" />
          <div>
            <h4>{authorName}</h4>
            <span className="post-time">{formatDate(post.createdAt)}</span>
          </div>
        </div>

        {/* Options menu */}
        <div className="post-menu" ref={menuRef}>
          <button className="menu-button" onClick={() => setShowMenu(s => !s)} aria-label="Post options">
            <FaEllipsisH />
          </button>
          {showMenu && (
            <div className="menu-dropdown">
              <button
                className="menu-item"
                onClick={() => {
                  setShowMenu(false);
                  const link = `${window.location.origin}/post/${postId}`;
                  navigator.clipboard.writeText(link)
                    .then(() => alert("Post link copied to clipboard!"))
                    .catch(err => console.error("Failed to copy link: ", err));
                }}
              >
                <FaLink /> Copy Link
              </button>
              {onDelete && (
                <>
                  <button
                    className="menu-item"
                    onClick={() => { setShowMenu(false); setIsEditing(true); setEditText(localContent); setEditError(null); }}
                  >
                    <FaEdit /> Edit Post
                  </button>
                  <button className="menu-item" onClick={handleToggleHideLikes}>
                    {localHideLikeCount ? <FaEye /> : <FaEyeSlash />}
                    {localHideLikeCount ? 'Show Like Count' : 'Hide Like Count'}
                  </button>
                  <button className="menu-item" onClick={handleToggleComments}>
                    {localCommentsDisabled ? <FaComment /> : <FaBan />}
                    {localCommentsDisabled ? 'Turn On Commenting' : 'Turn Off Commenting'}
                  </button>
                  <button
                    className="menu-item delete"
                    onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                  >
                    <FaTrash /> Delete Post
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="post-content">
        {isEditing ? (
          <>
            <textarea
              className="post-edit-area"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              maxLength={5000}
              rows={4}
              autoFocus
            />
            {editError && <p className="edit-error">{editError}</p>}
            <div className="post-edit-actions">
              <button
                className="cancel-reply-btn"
                onClick={() => { setIsEditing(false); setEditText(localContent); setEditError(null); }}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={handleSaveEdit}
                disabled={!editText.trim() || menuLoading === 'edit'}
              >
                {menuLoading === 'edit' ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <p className="post-text">{localContent}</p>
        )}
      </div>

      {post.media && post.media.length > 0 && (
        <div className={`post-media ${post.media.length > 1 ? 'post-media-carousel' : ''}`}>
          {post.media.map((m, i) =>
            m.mediaType === 'video'
              ? <CustomVideoPlayer key={i} src={m.cdnUrl} />
              : <img key={i} src={m.cdnUrl} alt="Post content" className="post-image" />
          )}
        </div>
      )}

      <div className="post-actions">
        <button
          className={`action-btn ${post.isLiked ? 'liked' : ''}`}
          onClick={() => onLike && onLike()}
          disabled={isOffline}
        >
          <FaThumbsUp />
          <span>{localHideLikeCount ? 'Like' : `${post.likesCount || 0} Likes`}</span>
        </button>

        <button
          className="action-btn"
          onClick={() => setShowComments(s => !s)}
        >
          <FaComment />
          <span>{localCommentsCount} Comments</span>
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          {localCommentsDisabled ? (
            <p className="comments-disabled-notice">Comments are turned off for this post.</p>
          ) : (
            <form onSubmit={handleSubmitComment} className="comment-form">
              <img
                src={userProfile?.photoURL || '/images/default-avatar.png'}
                alt="You"
                className="comment-avatar"
              />
              <div className="comment-input-wrap">
                <div className="comment-input-container">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    disabled={isOffline || commentSubmitting}
                  />
                  <button
                    type="button"
                    className="emoji-btn"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <FaSmile />
                  </button>
                  {showEmojiPicker && (
                    <div className="emoji-picker-container" onClick={(e) => {
                      if (e.target.closest('a[href="#"]')) e.preventDefault();
                    }}>
                      <EmojiPicker onEmojiClick={onEmojiClick} />
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isOffline || !commentText.trim() || commentSubmitting}
                >
                  {commentSubmitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          )}

          {commentsLoading && fetchedComments.length === 0 ? (
            <p className="comments-loading">Loading comments...</p>
          ) : fetchedComments.length === 0 ? (
            <p className="no-comments">No comments yet. Be the first!</p>
          ) : (
            <>
              {fetchedComments.map(renderComment)}
              {hasMoreComments && (
                <button
                  className="load-more-comments-btn"
                  onClick={() => fetchComments(commentPage + 1)}
                  disabled={commentsLoading}
                >
                  {commentsLoading ? 'Loading...' : 'Load more comments'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PostCard;
