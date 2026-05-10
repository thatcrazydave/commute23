import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft } from 'react-icons/fa';
import API from './services/api';
import PostCard from './PostCard';
import LoadingSpinner from './components/LoadingSpinner';

const PostPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data } = await API.get(`/posts/p/${id}`);
        if (data.success) {
          setPost(data.data.post);
        } else {
          setError('Post not found');
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '90px 20px 40px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', color: '#4a6cf7', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem',
            fontWeight: 600, marginBottom: 20
          }}
        >
          <FaArrowLeft /> Back
        </button>

        {error ? (
          <div style={{ background: '#fff', padding: 40, borderRadius: 12, textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 10px', color: '#111827' }}>Post Unavailable</h2>
            <p style={{ margin: 0, color: '#6b7280' }}>{error}</p>
          </div>
        ) : post ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <PostCard
              post={post}
              onLike={() => {}} 
              onComment={() => {}}
              onDelete={() => { navigate('/dashboard'); }}
              isExpanded={true} 
            />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};

export default PostPage;
