const express = require('express');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Media = require('../models/Media');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');
const Logger = require('../utils/logger');

const router = express.Router();

const MAX_MEDIA_PER_POST = 10;

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// Build the aggregation pipeline used by both GET / and POST /
// Pagination ($skip/$limit) is applied BEFORE $lookups to avoid joining all posts before paging
function buildPostPipeline(matchStage, userId, skip = 0, limit = 20) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  return [
    { $match: matchStage },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    // Join media (sorted by sortOrder)
    {
      $lookup: {
        from: 'media',
        localField: 'mediaIds',
        foreignField: '_id',
        as: 'media',
        pipeline: [
          { $sort: { sortOrder: 1 } },
          { $project: { cdnUrl: 1, mediaType: 1, width: 1, height: 1, sortOrder: 1 } },
        ],
      },
    },
    // Join author — preserveNullAndEmptyArrays keeps posts from deleted users in feed
    {
      $lookup: {
        from: 'users',
        localField: 'authorId',
        foreignField: '_id',
        as: 'author',
        pipeline: [
          { $project: { username: 1, firstName: 1, lastName: 1, photoURL: 1 } },
        ],
      },
    },
    { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
    // Check if requesting user liked this post
    {
      $lookup: {
        from: 'likes',
        let: { pid: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$postId', '$$pid'] },
                  { $eq: ['$userId', userObjId] },
                ],
              },
            },
          },
        ],
        as: 'myLike',
      },
    },
    {
      $addFields: {
        isLiked: { $gt: [{ $size: '$myLike' }, 0] },
      },
    },
    { $project: { myLike: 0 } },
  ];
}

// GET /api/posts — feed (20 most recent, paginated)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const posts = await Post.aggregate(
      buildPostPipeline({ isPending: false, isDeleted: { $ne: true } }, req.user._id, skip, limit)
    );
    return res.json({ success: true, data: { posts, page, limit } });
  } catch (err) {
    Logger.error('Fetch posts error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch posts' } });
  }
});

// POST /api/posts — create
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, mediaIds = [] } = req.body;

    if (!content?.trim() && mediaIds.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'EMPTY_POST', message: 'Post must have content or media' } });
    }
    if (content && content.length > 5000) {
      return res.status(400).json({ success: false, error: { code: 'TOO_LONG', message: 'Post content exceeds 5000 characters' } });
    }

    // Cap media count
    if (mediaIds.length > MAX_MEDIA_PER_POST) {
      return res.status(400).json({ success: false, error: { code: 'TOO_MANY_MEDIA', message: `Maximum ${MAX_MEDIA_PER_POST} media files per post` } });
    }

    // Validate all mediaIds are valid ObjectIds before any DB calls
    const invalidId = mediaIds.find(id => !isValidId(id));
    if (invalidId) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_MEDIA_ID', message: 'One or more media IDs are invalid' } });
    }

    let resolvedMediaType = 'none';
    let claimedMediaDocs = [];
    if (mediaIds.length > 0) {
      const mediaObjIds = mediaIds.map(id => new mongoose.Types.ObjectId(id));

      // Atomic CAS claim: atomically mark each Media doc as claimed by this request.
      // Filter: status='pending' AND postId=null AND uploadedBy=req.user — prevents race
      // where two concurrent POST /posts with the same mediaId both pass an ownership check.
      const claimResults = await Promise.all(
        mediaObjIds.map(id =>
          Media.findOneAndUpdate(
            { _id: id, uploadedBy: req.user._id, status: 'pending', postId: null },
            { $set: { status: 'claiming' } },
            { returnDocument: 'after', lean: true }
          )
        )
      );

      // If any claim failed (null = already claimed or not owned), roll back successful claims
      const failedClaim = claimResults.some(doc => doc === null);
      if (failedClaim) {
        const successfulIds = claimResults.filter(Boolean).map(d => d._id);
        if (successfulIds.length > 0) {
          await Media.updateMany({ _id: { $in: successfulIds } }, { $set: { status: 'pending' } });
        }
        return res.status(400).json({ success: false, error: { code: 'INVALID_MEDIA', message: 'One or more media files are invalid or already used' } });
      }

      claimedMediaDocs = claimResults;
      const types = new Set(claimedMediaDocs.map(m => m.mediaType));
      resolvedMediaType = types.size > 1 ? 'mixed' : types.values().next().value;
    }

    const post = await Post.create({
      authorId: req.user._id,
      content: content?.trim() || '',
      mediaIds: mediaIds.map(id => new mongoose.Types.ObjectId(id)),
      mediaType: resolvedMediaType,
      isPending: false,
    });

    // Link claimed media to post and mark ready
    if (claimedMediaDocs.length > 0) {
      await Media.updateMany(
        { _id: { $in: claimedMediaDocs.map(d => d._id) } },
        { $set: { postId: post._id, status: 'ready' } }
      );
    }

    const [assembled] = await Post.aggregate(
      buildPostPipeline({ _id: post._id }, req.user._id, 0, 1)
    );

    Logger.info('Post created', { postId: post._id, userId: req.user._id });
    return res.status(201).json({ success: true, data: { post: assembled } });
  } catch (err) {
    Logger.error('Create post error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create post' } });
  }
});

// DELETE /api/posts/:id — soft delete
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid post ID' } });
    }

    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    }
    if (post.authorId.toString() !== req.user._id.toString() && !['admin', 'superadmin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorised to delete this post' } });
    }

    await Post.updateOne({ _id: post._id }, { $set: { isDeleted: true } });
    return res.json({ success: true });
  } catch (err) {
    Logger.error('Delete post error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete post' } });
  }
});

// POST /api/posts/:id/like — toggle like
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid post ID' } });
    }

    const post = await Post.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!post) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    }

    const userId = req.user._id;
    const existing = await Like.findOne({ postId: post._id, userId });

    let isLiked;
    let delta;
    if (existing) {
      await Like.deleteOne({ _id: existing._id });
      await Post.updateOne({ _id: post._id }, { $inc: { likesCount: -1 } });
      delta = -1;
      isLiked = false;
    } else {
      await Like.create({ postId: post._id, userId });
      await Post.updateOne({ _id: post._id }, { $inc: { likesCount: 1 } });
      delta = 1;
      isLiked = true;

      if (post.authorId.toString() !== userId.toString()) {
        // Notification failure must not fail the like operation
        Notification.create({
          userId: post.authorId,
          type: 'like',
          content: `${req.user.firstName || req.user.username} liked your post`,
          refId: post._id.toString(),
          refType: 'Post',
        }).catch(err => Logger.warn('Like notification failed', { error: err.message }));
      }
    }

    // Compute likesCount from current value + delta — avoids an extra DB read
    const likesCount = Math.max(0, post.likesCount + delta);
    return res.json({ success: true, data: { isLiked, likesCount } });
  } catch (err) {
    Logger.error('Like post error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to toggle like' } });
  }
});

// POST /api/posts/:id/comment
router.post('/:id/comment', authenticateToken, async (req, res) => {
  try {
    Logger.info('Comment request received', { postId: req.params.id, userId: req.user._id, body: req.body });

    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid post ID' } });
    }

    const { content, parentId = null } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: { code: 'EMPTY_COMMENT', message: 'Comment cannot be empty' } });
    }
    if (content.length > 2000) {
      return res.status(400).json({ success: false, error: { code: 'TOO_LONG', message: 'Comment exceeds 2000 characters' } });
    }

    // Validate parentId belongs to this same post
    if (parentId !== null) {
      if (!isValidId(parentId)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_PARENT_ID', message: 'Invalid parent comment ID' } });
      }
      const parentComment = await Comment.findOne({ _id: parentId, postId: req.params.id });
      if (!parentComment) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_PARENT', message: 'Parent comment not found on this post' } });
      }
    }

    const post = await Post.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!post) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    }

    const comment = await Comment.create({
      postId: post._id,
      authorId: req.user._id,
      content: content.trim(),
      parentId: parentId || null,
    });

    const updatedPost = await Post.findOneAndUpdate(
      { _id: post._id },
      { $inc: { commentsCount: 1 } },
      { returnDocument: 'after', lean: true }
    );

    if (parentId) {
      await Comment.updateOne({ _id: parentId }, { $inc: { repliesCount: 1 } });
    }

    if (post.authorId.toString() !== req.user._id.toString()) {
      Notification.create({
        userId: post.authorId,
        type: 'comment',
        content: `${req.user.firstName || req.user.username} commented on your post`,
        refId: post._id.toString(),
        refType: 'Post',
      }).catch(err => Logger.warn('Comment notification failed', { error: err.message }));
    }

    const user = req.user;
    return res.status(201).json({
      success: true,
      data: {
        comment: {
          ...comment.toObject(),
          author: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            photoURL: user.photoURL,
            username: user.username,
          },
        },
        commentsCount: updatedPost?.commentsCount ?? post.commentsCount + 1,
      },
    });
  } catch (err) {
    Logger.error('Comment error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add comment' } });
  }
});

// GET /api/posts/:id/comments — paginated comments for a post
router.get('/:id/comments', authenticateToken, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid post ID' } });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ postId: req.params.id, parentId: null, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'firstName lastName photoURL username')
      .lean();

    const shaped = comments.map(c => ({
      ...c,
      author: c.authorId,
      authorId: c.authorId?._id,
    }));

    return res.json({ success: true, data: { comments: shaped, page, limit } });
  } catch (err) {
    Logger.error('Fetch comments error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch comments' } });
  }
});

module.exports = router;
