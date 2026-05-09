#!/usr/bin/env node
// Migrates Post documents from isDeleted boolean to status enum.
// Usage: node scripts/migrate-post-status.js [--dry-run]
//
// --dry-run: prints counts, writes nothing (default — safe to run at any time)
// --live:    applies changes (explicit flag required for safety)

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const mongoose = require('mongoose');

const DRY_RUN = !process.argv.includes('--live');
if (DRY_RUN) console.log('[DRY RUN] No writes will occur. Pass --live to apply.');

// Pre-flight: ensure required env vars are set before touching any database
if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
  console.error('ERROR: MONGODB_URI (or MONGO_URI) env var is not set. Aborting.');
  process.exit(1);
}

async function main() {
  // Connect MongoDB
  const connectDB = require('../backend/config/db');
  await connectDB();
  console.log('MongoDB connected');

  const Post = require('../backend/models/Post');

  // Count documents in each bucket
  const deletedCount  = await Post.countDocuments({ isDeleted: true });
  const activeCount   = await Post.countDocuments({ $or: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: { $exists: false } }] });
  console.log(`Documents to migrate: ${deletedCount} deleted → recently_deleted, ${activeCount} active`);

  if (DRY_RUN) {
    console.log('[DRY RUN] Would enqueue', deletedCount, 'BullMQ cleanup jobs.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Connect Redis + Queue for enqueuing jobs
  const { createRedisClient } = require('../backend/config/redis');
  await createRedisClient();
  const { getArchiveQueue } = require('../backend/queues/archiveQueue');

  const migrationDate = new Date();
  let jobsQueued = 0;

  // Backfill isDeleted:true → recently_deleted
  if (deletedCount > 0) {
    const deletedPosts = await Post.find({ isDeleted: true }).select('_id');
    for (const post of deletedPosts) {
      await Post.updateOne(
        { _id: post._id },
        { $set: { status: 'recently_deleted', deletedAt: migrationDate, deletedBy: 'user' } }
      );
      const queue = getArchiveQueue();
      if (queue) {
        await queue.add('purge-post', { postId: post._id.toString() }, {
          jobId: `purge-post-${post._id}`,
          delay: 30 * 24 * 60 * 60 * 1000,
        });
        jobsQueued++;
      }
    }
    console.log(`Migrated ${deletedCount} deleted posts → recently_deleted, ${jobsQueued} jobs queued`);
  }

  // Backfill isDeleted:false/null/absent → active
  await Post.updateMany(
    { $or: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: { $exists: false } }] },
    { $set: { status: 'active' } }
  );
  console.log(`Migrated ${activeCount} posts → active`);

  console.log('Migration complete:', { active: activeCount, recentlyDeleted: deletedCount, jobsQueued });

  // Cleanup
  const queue = getArchiveQueue();
  if (queue) await queue.close();
  const { getClient } = require('../backend/config/redis');
  if (getClient()) await getClient().quit();
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
