const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');
const Logger = require('../utils/logger');

const router = express.Router();

// GET /api/posts — feed (20 most recent)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const posts = await Post.find({ isPending: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const userId = req.user._id.toString();
    const enriched = posts.map(p => ({
      ...p,
      isLiked: p.likes?.some(id => id.toString() === userId) || false,
    }));

    return res.json({ success: true, data: { posts: enriched, page, limit } });
  } catch (err) {
    Logger.error('Fetch posts error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch posts' } });
  }
});

// POST /api/posts — create
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, mediaUrl, mediaType } = req.body;
    if (!content?.trim() && !mediaUrl) {
      return res.status(400).json({ success: false, error: { code: 'EMPTY_POST', message: 'Post must have content or media' } });
    }
    if (content && content.length > 5000) {
      return res.status(400).json({ success: false, error: { code: 'TOO_LONG', message: 'Post content exceeds 5000 characters' } });
    }

    const user = req.user;
    const post = new Post({
      authorId: user._id,
      author: {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        photoURL: user.photoURL || '/images/default-avatar.png',
        username: user.username || '',
      },
      content: content?.trim() || '',
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
    });

    await post.save();
    Logger.info('Post created', { postId: post._id, userId: user._id });

    return res.status(201).json({ success: true, data: { post: { ...post.toObject(), isLiked: false } } });
  } catch (err) {
    Logger.error('Create post error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create post' } });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    }
    if (post.authorId.toString() !== req.user._id.toString() && !['admin', 'superadmin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorised to delete this post' } });
    }
    await post.deleteOne();
    return res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    Logger.error('Delete post error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete post' } });
  }
});

// POST /api/posts/:id/like — toggle
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    }

    const userId = req.user._id;
    const likeIndex = post.likes.findIndex(id => id.toString() === userId.toString());
    let isLiked;

    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
      post.likesCount = Math.max(0, post.likesCount - 1);
      isLiked = false;
    } else {
      post.likes.push(userId);
      post.likesCount += 1;
      isLiked = true;

      // Notify post author if someone else liked it
      if (post.authorId.toString() !== userId.toString()) {
        await Notification.create({
          userId: post.authorId,
          type: 'like',
          content: `${req.user.firstName || req.user.username} liked your post`,
          refId: post._id.toString(),
          refType: 'Post',
        });
      }
    }

    await post.save();
    return res.json({ success: true, data: { isLiked, likesCount: post.likesCount } });
  } catch (err) {
    Logger.error('Like post error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to toggle like' } });
  }
});

// POST /api/posts/:id/comment
router.post('/:id/comment', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: { code: 'EMPTY_COMMENT', message: 'Comment cannot be empty' } });
    }
    if (content.length > 2000) {
      return res.status(400).json({ success: false, error: { code: 'TOO_LONG', message: 'Comment exceeds 2000 characters' } });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    }

    const user = req.user;
    const comment = {
      authorId: user._id,
      authorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
      authorPhoto: user.photoURL || '/images/default-avatar.png',
      content: content.trim(),
      createdAt: new Date(),
    };

    post.comments.push(comment);
    post.commentsCount += 1;
    await post.save();

    // Notify post author
    if (post.authorId.toString() !== user._id.toString()) {
      await Notification.create({
        userId: post.authorId,
        type: 'comment',
        content: `${user.firstName || user.username} commented on your post`,
        refId: post._id.toString(),
        refType: 'Post',
      });
    }

    const added = post.comments[post.comments.length - 1];
    return res.status(201).json({ success: true, data: { comment: added, commentsCount: post.commentsCount } });
  } catch (err) {
    Logger.error('Comment error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add comment' } });
  }
});

module.exports = router;
