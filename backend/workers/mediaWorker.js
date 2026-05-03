const { Worker } = require('bullmq');
const fs = require('fs');
const supabase = require('../config/supabase');
const Media = require('../models/Media');
const Logger = require('../utils/logger');
const { getClient } = require('../config/redis');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'posts';
const CDN_BASE = process.env.SUPABASE_CDN_URL;

function createMediaWorker() {
  const worker = new Worker(
    'media-processing',
    async (job) => {
      const { mediaId, storageKey, tempPath, storedMime } = job.data;
      const start = Date.now();

      try {
        // Guard: temp file may be missing if the server crashed mid-write or the OS cleaned tmpdir.
        if (!fs.existsSync(tempPath)) {
          await Media.updateOne({ _id: mediaId }, { $set: { status: 'failed' } });
          throw new Error(`Temp file missing (may have been cleaned before retry): ${tempPath}`);
        }

        // Re-validate media ownership before processing (prevents job-data injection attacks).
        const media = await Media.findById(mediaId);
        if (!media) throw new Error(`Media doc not found: ${mediaId}`);

        const buffer = fs.readFileSync(tempPath);
        const uploadBody = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storageKey, uploadBody, { contentType: storedMime, upsert: false });

        if (uploadError) {
          await Media.updateOne({ _id: mediaId }, { $set: { status: 'failed' } });
          throw new Error(`Supabase upload failed: ${uploadError.message}`);
        }

        // Set to 'pending' so POST /api/posts can claim it via the existing CAS logic.
        const cdnUrl = `${CDN_BASE}/${storageKey}`;
        await Media.updateOne({ _id: mediaId }, { $set: { status: 'pending', cdnUrl } });

        Logger.info('Media worker processed', {
          mediaId,
          storageKey,
          duration_ms: Date.now() - start,
        });
      } finally {
        fs.unlink(tempPath, (err) => {
          if (err && err.code !== 'ENOENT') {
            Logger.error('Temp file cleanup failed', { tempPath, error: err.message });
          }
        });
      }
    },
    {
      connection: getClient(),
      concurrency: 2,
    }
  );

  worker.on('failed', (job, err) => {
    Logger.error('Media worker job failed', { jobId: job?.id, error: err.message });
  });

  return worker;
}

module.exports = { createMediaWorker };
