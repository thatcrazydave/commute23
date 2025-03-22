import React, { useState } from 'react';
import { FaThumbsUp, FaComment, FaShare, FaEllipsisH } from 'react-icons/fa';

const PostCard = ({ post, currentUser, userProfile, onLike, onComment, onDelete, isOffline }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const authorName = post.author.firstName && post.author.lastName 
    ? `${post.author.firstName} ${post.author.lastName}`
    : currentUser.displayName || 'Anonymous';

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (commentText.trim()) {
      onComment(post.id, commentText);
      setCommentText('');
    }
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-author">
          <img 
            src={post.author.photoURL || '/images/default-avatar.png'} 
            alt={authorName} 
          />
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

      {post.imageUrl && (
        <img src={post.imageUrl} alt="Post content" className="post-image" />
      )}

      <div className="post-actions">
        <button 
          className={`action-btn ${post.isLiked ? 'liked' : ''}`}
          onClick={() => onLike(post.id)}
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
            <div key={index} className="comment">
              <img 
                src={comment.userPhoto || '/images/default-avatar.png'} 
                alt={comment.userName} 
              />
              <div className="comment-content">
                <h5>{comment.userName}</h5>
                <p>{comment.content}</p>
                <div className="comment-actions">
                  <span>{new Date(comment.timestamp).toLocaleDateString()}</span>
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