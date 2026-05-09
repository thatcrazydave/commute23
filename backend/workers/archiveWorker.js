const { Worker } = require('bullmq');
const supabase = require('../config/supabase');
const Media = require('../models/Media');
const Post = require('../models/Post');
const Logger = require('../utils/logger');
const { getClient } = require('../config/redis');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'posts';

function createArchiveWorker() {
  const worker = new Worker(
    'archive',
    async (job) => {
      if (job.name !== 'purge-post') return;

      const { postId } = job.data;

      // Step 1: Find post. Abort if user restored it (status changed).
      const post = await Post.findById(postId);
      if (!post || post.status !== 'recently_deleted') {
        Logger.info('Archive worker: post not recently_deleted, aborting', { postId });
        return;
      }

      // Step 2: Fetch media docs scoped to this post's author (defense-in-depth: prevents
      // cross-user file deletion if DB is ever in an inconsistent state).
      const mediaDocs = await Media.find({ _id: { $in: post.mediaIds }, uploadedBy: post.authorId });
      const storageKeys = mediaDocs.map(m => m.storageKey).filter(Boolean);

      // Step 3: Remove each file from Supabase storage.
      let filesDeleted = 0;
      let filesFailed = 0;

      for (const storageKey of storageKeys) {
        const { error } = await supabase.storage.from(BUCKET).remove([storageKey]);
        if (error) {
          if (error.status === 404) {
            // File already gone — harmless
            Logger.info('Archive worker: file not found in storage (harmless)', { postId, storageKey });
            filesDeleted++;
          } else {
            Logger.error('Archive worker: failed to delete file from storage', { postId, storageKey, error: error.message });
            filesFailed++;
          }
        } else {
          filesDeleted++;
        }
      }

      // Step 4: Mark post as permanently deleted.
      await Post.updateOne({ _id: post._id }, { $set: { status: 'deleted', cleanupJobId: null } });

      // Step 5: Log summary.
      Logger.info('Archive worker: post purged', {
        postId,
        filesAttempted: storageKeys.length,
        filesDeleted,
        filesFailed,
      });
    },
    {
      connection: getClient(),
      concurrency: 2,
    }
  );

  worker.on('failed', (job, err) => {
    Logger.error('Archive worker job failed', { jobId: job?.id, error: err.message });
  });

  return worker;
}

module.exports = { createArchiveWorker };
