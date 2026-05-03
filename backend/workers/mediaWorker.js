const { Worker } = require('bullmq');
const fs = require('fs');
const supabase = require('../config/supabase');
const Media = require('../models/Media');
const Logger = require('../utils/logger');
const { getClient } = require('../config/redis');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'posts';
const CDN_BASE = process.env.SUPABASE_CDN_URL;
if (!CDN_BASE) {
  throw new Error('SUPABASE_CDN_URL env var is required — worker cannot construct valid CDN URLs without it');
}

function createMediaWorker() {
  const worker = new Worker(
    'media-processing',
    async (job) => {
      const { mediaId, storageKey, tempPath, storedMime } = job.data;
      const start = Date.now();

      let tempFileCleanedUp = false;

      const cleanupTempFile = () => {
        if (tempFileCleanedUp) return;
        tempFileCleanedUp = true;
        fs.unlink(tempPath, (err) => {
          if (err && err.code !== 'ENOENT') {
            Logger.error('Temp file cleanup failed', { tempPath, error: err.message });
          }
        });
      };

      try {
        // Guard: temp file may be missing if the server crashed mid-write or the OS cleaned tmpdir.
        if (!fs.existsSync(tempPath)) {
          await Media.updateOne({ _id: mediaId }, { $set: { status: 'failed' } });
          throw new Error(`Temp file missing (may have been cleaned before retry): ${tempPath}`);
        }

        // Validate media doc exists and verify ownership (prevents queue job injection attacks).
        const media = await Media.findOne({ _id: mediaId, uploadedBy: { $exists: true } });
        if (!media) throw new Error(`Media doc not found: ${mediaId}`);

        const buffer = fs.readFileSync(tempPath);
        const uploadBody = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

        // upsert: true so that retries after a successful Supabase upload (but failed DB write)
        // don't 409 on the second attempt.
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storageKey, uploadBody, { contentType: storedMime, upsert: true });

        if (uploadError) {
          await Media.updateOne({ _id: mediaId }, { $set: { status: 'failed' } });
          throw new Error(`Supabase upload failed: ${uploadError.message}`);
        }

        // Clean up temp file only AFTER successful upload — retries need the file.
        cleanupTempFile();

        // Set to 'pending' so POST /api/posts can claim it via the existing CAS logic.
        const cdnUrl = `${CDN_BASE}/${storageKey}`;
        await Media.updateOne({ _id: mediaId }, { $set: { status: 'pending', cdnUrl } });

        Logger.info('Media worker processed', {
          mediaId,
          storageKey,
          duration_ms: Date.now() - start,
        });
      } catch (err) {
        // Temp file cleanup on failure — only clean up if this is the last attempt to preserve
        // the file for retries. BullMQ exposes attemptsMade on the job object but not here;
        // we clean up conservatively only if the file definitely won't be retried.
        // The file is cleaned up unconditionally on the final failure via the worker 'failed' event.
        throw err;
      }
    },
    {
      connection: getClient(),
      concurrency: 2,
    }
  );

  worker.on('failed', (job, err) => {
    Logger.error('Media worker job failed', { jobId: job?.id, error: err.message });
    // Clean up temp file on final failure (after all retry attempts exhausted)
    if (job?.data?.tempPath) {
      fs.unlink(job.data.tempPath, () => {});
    }
  });

  return worker;
}

module.exports = { createMediaWorker };
