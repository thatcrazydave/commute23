/**
 * One-time migration: convert old Post schema to new schema.
 * Safe to re-run — guard conditions skip already-migrated posts.
 *
 * Run: node backend/scripts/migrate-posts.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/commute';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const postsCol = db.collection('posts');
  const mediaCol = db.collection('media');
  const likesCol = db.collection('likes');
  const commentsCol = db.collection('comments');

  // Ensure indexes before migration
  await likesCol.createIndex({ postId: 1, userId: 1 }, { unique: true, background: true });
  await likesCol.createIndex({ userId: 1, createdAt: -1 }, { background: true });
  await commentsCol.createIndex({ postId: 1, createdAt: -1 }, { background: true });
  await commentsCol.createIndex({ parentId: 1, createdAt: 1 }, { background: true });
  await mediaCol.createIndex({ postId: 1, sortOrder: 1 }, { background: true });
  await mediaCol.createIndex({ uploadedBy: 1 }, { background: true });
  await postsCol.createIndex({ createdAt: -1 }, { background: true });
  await postsCol.createIndex({ authorId: 1, createdAt: -1 }, { background: true });
  console.log('Indexes ensured');

  const posts = await postsCol.find({}).toArray();
  console.log(`Found ${posts.length} posts to process`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const post of posts) {
    try {
      const updates = {};

      // Step 1: migrate mediaUrl → media collection
      const alreadyHasMedia = Array.isArray(post.mediaIds) && post.mediaIds.length > 0;
      if (!alreadyHasMedia && post.mediaUrl) {
        const legacyType = post.mediaType === 'video' ? 'video' : 'image';
        const legacyMime = legacyType === 'video' ? 'video/mp4' : 'image/jpeg';

        const mediaDoc = {
          _id: new mongoose.Types.ObjectId(),
          postId: post._id,
          uploadedBy: post.authorId,
          storageKey: `legacy/${post._id}`,
          cdnUrl: post.mediaUrl,
          mediaType: legacyType,
          mimeType: legacyMime,
          originalMimeType: legacyMime,
          width: 0,
          height: 0,
          fileSize: 0,
          status: 'ready',
          sortOrder: 0,
          createdAt: post.createdAt || new Date(),
          updatedAt: new Date(),
        };
        await mediaCol.insertOne(mediaDoc);
        updates.mediaIds = [mediaDoc._id];
        updates.mediaType = legacyType;
      } else if (!alreadyHasMedia) {
        updates.mediaIds = [];
        updates.mediaType = 'none';
      }

      // Step 2: migrate likes array → likes collection
      const alreadyMigratedLikes = (post.likesCount > 0 && (!post.likes || post.likes.length === 0));
      if (!alreadyMigratedLikes && Array.isArray(post.likes) && post.likes.length > 0) {
        const likeDocs = post.likes.map(userId => ({
          _id: new mongoose.Types.ObjectId(),
          postId: post._id,
          userId,
          createdAt: post.createdAt || new Date(),
        }));
        // ordered: false — skip duplicates silently
        await likesCol.insertMany(likeDocs, { ordered: false }).catch(() => {});
        updates.likesCount = post.likes.length;
        updates.likes = [];
      }

      // Step 3: migrate embedded comments → comments collection
      if (Array.isArray(post.comments) && post.comments.length > 0) {
        const commentDocs = post.comments.map(c => ({
          _id: c._id || new mongoose.Types.ObjectId(),
          postId: post._id,
          authorId: c.authorId,
          content: c.content || '',
          parentId: null,
          likesCount: 0,
          repliesCount: 0,
          isDeleted: false,
          createdAt: c.createdAt || new Date(),
          updatedAt: new Date(),
        }));
        await commentsCol.insertMany(commentDocs, { ordered: false }).catch(() => {});
        updates.commentsCount = post.comments.length;
        updates.comments = [];
      }

      // Step 4: remove embedded author object
      if (post.author) {
        updates.$unset = { author: '' };
      }

      // Step 5: add isDeleted flag
      if (post.isDeleted === undefined) {
        updates.isDeleted = false;
      }

      // Apply updates
      const setFields = { ...updates };
      const unsetFields = setFields.$unset;
      delete setFields.$unset;

      const updateOp = {};
      if (Object.keys(setFields).length > 0) updateOp.$set = setFields;
      if (unsetFields) updateOp.$unset = unsetFields;

      if (Object.keys(updateOp).length > 0) {
        await postsCol.updateOne({ _id: post._id }, updateOp);
        migrated++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`Error migrating post ${post._id}:`, err.message);
      errors++;
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped (already done): ${skipped}`);
  console.log(`  Errors: ${errors}`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
