import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import API from './services/api';
import PostCard from './PostCard';
import './css/Archive.css';

const Archive = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchArchive = async (pageNum = 1) => {
    try {
      setLoading(true);
      const res = await API.get(`/posts/archive?page=${pageNum}&limit=20`);
      if (pageNum === 1) setPosts(res.data.posts || []);
      else setPosts(prev => [...prev, ...(res.data.posts || [])]);
    } catch (err) {
      setError('Failed to load archive');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchArchive(1); }, []);

  const handleRestore = async (postId) => {
    try {
      await API.post(`/posts/${postId}/restore`);
      setPosts(prev => prev.filter(p => p._id !== postId));
    } catch (err) {
      // silent fail — list stays as-is; user can retry
    }
  };

  if (loading && posts.length === 0) return <div className="archive-loading">Loading...</div>;

  return (
    <div className="archive-page">
      <div className="archive-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h2>Archive</h2>
      </div>
      {error && <p className="archive-error">{error}</p>}
      {posts.length === 0 && !loading ? (
        <div className="archive-empty">
          <p>No archived posts</p>
          <p className="archive-empty-sub">Posts you archive will appear here</p>
        </div>
      ) : (
        <div className="archive-list">
          {posts.map(post => (
            <div key={post._id} className="archive-post-item">
              <PostCard post={post} hideActions />
              <button
                className="restore-btn"
                onClick={() => handleRestore(post._id)}
              >
                Restore post
              </button>
            </div>
          ))}
          {posts.length > 0 && posts.length % 20 === 0 && (
            <button
              className="load-more-btn"
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchArchive(nextPage);
              }}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Archive;
