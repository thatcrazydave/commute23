import React, { useState } from 'react';
import { FaThumbsUp, FaComment, FaEllipsisH } from 'react-icons/fa';
import CustomVideoPlayer from './components/CustomVideoPlayer';
import Avatar from './components/Avatar';

const PostCard = ({ post, currentUser, userProfile, onLike, onComment, onDelete, isOffline }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const authorName = post.author?.firstName && post.author?.lastName
    ? `${post.author.firstName} ${post.author.lastName}`
    : post.author?.username || currentUser?.displayName || 'Anonymous';

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (commentText.trim()) {
      onComment(post._id || post.id, commentText);
      setCommentText('');
    }
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-author">
          <Avatar user={post.author || currentUser} size={40} className="post-author-avatar" />
          <div>
            <h4>{authorName}</h4>
            <span className="post-time">
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        {onDelete && (
          <button className="post-menu" onClick={onDelete}>
            <FaEllipsisH />
          </button>
        )}
      </div>

      <div className="post-content">
        {post.content}
      </div>

      {post.media && post.media.length > 0 && (
        <div className={`post-media ${post.media.length > 1 ? 'post-media-carousel' : ''}`}>
          {post.media.map((m, i) => (
            m.mediaType === 'video'
              ? <CustomVideoPlayer key={i} src={m.cdnUrl} />
              : <img key={i} src={m.cdnUrl} alt="Post content" className="post-image" />
          ))}
        </div>
      )}

      <div className="post-actions">
        <button 
          className={`action-btn ${post.isLiked ? 'liked' : ''}`}
          onClick={() => onLike(post._id || post.id)}
          disabled={isOffline}
        >
          <FaThumbsUp />
          <span>{post.likesCount || 0} Likes</span>
        </button>

        <button 
          className="action-btn"
          onClick={() => setShowComments(!showComments)}
        >
          <FaComment />
          <span>{post.commentsCount || 0} Comments</span>
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          <form onSubmit={handleSubmitComment} className="comment-form">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isOffline}
            />
            <button 
              type="submit" 
              className="primary-button"
              disabled={isOffline || !commentText.trim()}
            >
              Post
            </button>
          </form>

          {post.comments?.map((comment, index) => (
            <div key={comment._id || index} className="comment">
              <Avatar user={comment.author || { photoURL: comment.authorPhoto, firstName: comment.authorName }} size={32} className="comment-avatar" />
              <div className="comment-content">
                <h5>
                  {comment.author?.firstName
                    ? `${comment.author.firstName} ${comment.author.lastName || ''}`.trim()
                    : comment.authorName || 'User'}
                </h5>
                <p>{comment.content}</p>
                <div className="comment-actions">
                  <span>{new Date(comment.createdAt || comment.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostCard;