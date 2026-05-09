import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import API from './services/api';
import PostCard from './PostCard';
import './css/Trash.css';

const Trash = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const res = await API.get('/posts/trash?page=1&limit=20');
      setPosts(res.data.posts || []);
    } catch (err) {
      setError('Failed to load recently deleted posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrash(); }, []);

  const handleRestore = async (postId) => {
    try {
      await API.post(`/posts/${postId}/restore`);
      setPosts(prev => prev.filter(p => p._id !== postId));
    } catch (err) {
      // silent fail — list stays as-is; user can retry
    }
  };

  if (loading && posts.length === 0) return <div className="trash-loading">Loading...</div>;

  return (
    <div className="trash-page">
      <div className="trash-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h2>Recently Deleted</h2>
      </div>
      <p className="trash-info">Posts are permanently deleted after 30 days.</p>
      {error && <p className="trash-error">{error}</p>}
      {posts.length === 0 && !loading ? (
        <div className="trash-empty">
          <p>No recently deleted posts</p>
        </div>
      ) : (
        <div className="trash-list">
          {posts.map(post => (
            <div key={post._id} className="trash-post-item">
              <div className="trash-countdown">
                Deletes in {post.daysUntilDeletion ?? '?'} day{post.daysUntilDeletion !== 1 ? 's' : ''}
              </div>
              <PostCard post={post} hideActions />
              <button
                className="restore-btn"
                onClick={() => handleRestore(post._id)}
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Trash;
