const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../config/supabase');
const Media = require('../models/Media');
const Logger = require('../utils/logger');

const router = express.Router();
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'posts';
const CDN_BASE = process.env.SUPABASE_CDN_URL; // validated at startup in config/supabase.js

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB hard cap; images enforced below
  fileFilter(req, file, cb) {
    if (IMAGE_MIMES.has(file.mimetype) || VIDEO_MIMES.has(file.mimetype)) {
      return cb(null, true);
    }
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Unsupported file type'));
  },
});

// Wrap multer to return clean 400/413 instead of propagating MulterError to Express default handler
function uploadSingle(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ success: false, error: { code: err.code, message: err.message } });
    }
    return res.status(400).json({ success: false, error: { code: 'UPLOAD_FAILED', message: err.message } });
  });
}

/**
 * Extract the real underlying error from a Supabase StorageError.
 * The Supabase client wraps fetch failures in StorageUnknownError which stores
 * the original TypeError in .originalError, and Node's fetch stores the real
 * cause (ECONNRESET, ETIMEDOUT, etc.) in .cause.
 */
function extractUploadCause(err) {
  const orig = err?.originalError || err;
  const cause = orig?.cause;
  if (cause) {
    return cause.message || cause.code || String(cause);
  }
  return orig?.message || '';
}

// POST /api/upload — one file per call; frontend fires in parallel for multi-image posts
router.post('/', authenticateToken, uploadSingle, async (req, res) => {
  // Extend socket timeout for large file uploads (videos can take minutes to relay to Supabase)
  req.socket.setTimeout(5 * 60 * 1000); // 5 minutes
  res.setTimeout(5 * 60 * 1000);

  if (!req.file) {
    return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file provided' } });
  }

  const { mimetype, buffer, size } = req.file;
  const userId = req.user._id.toString();
  const isImage = IMAGE_MIMES.has(mimetype);

  Logger.info('Upload request received', { userId, mimetype, size, isImage });

  // Enforce 10MB limit for images (multer allows up to 50MB for videos)
  if (isImage && size > 10 * 1024 * 1024) {
    return res.status(413).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'Image must be under 10MB' } });
  }

  let storageKey;
  try {
    let uploadBuffer = buffer;
    let storedMime = mimetype;
    let width = 0;
    let height = 0;
    const ext = isImage ? 'webp' : 'mp4';
    storageKey = `posts/${userId}/${uuidv4()}.${ext}`;

    // Magic-bytes validation for videos — client Content-Type is not trusted
    if (!isImage) {
      const { fileTypeFromBuffer } = await import('file-type');
      const detected = await fileTypeFromBuffer(buffer);
      if (!detected || !VIDEO_MIMES.has(detected.mime)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_FILE_TYPE', message: 'File content does not match declared type' } });
      }
    }

    if (isImage) {
      const processed = await sharp(buffer)
        .rotate() // auto-orient from EXIF
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80, animated: true }) // animated: true preserves GIF animations
        .toBuffer({ resolveWithObject: true });

      uploadBuffer = processed.data;
      storedMime = 'image/webp';
      width = processed.info.width;
      height = processed.info.height;
    }

    // Convert Buffer → Uint8Array so the Supabase client (which delegates to
    // global fetch) sends a proper binary body. Passing a Node Buffer can cause
    // "Cannot convert argument to a ByteString" when fetch tries to serialise
    // bytes > 255 as a Latin-1 string in headers/body.
    const uploadBody = new Uint8Array(
      uploadBuffer.buffer,
      uploadBuffer.byteOffset,
      uploadBuffer.byteLength
    );

    Logger.info('Uploading to Supabase', {
      storageKey,
      bodySize: uploadBody.byteLength,
      mime: storedMime,
    });

    // Upload with automatic retries for transient network failures (ECONNRESET, etc.)
    const MAX_UPLOAD_ATTEMPTS = 3;
    let uploadError = null;

    for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
      const result = await supabase.storage
        .from(BUCKET)
        .upload(storageKey, uploadBody, {
          contentType: storedMime,
          upsert: attempt > 1, // upsert on retry in case partial upload succeeded
        });

      uploadError = result.error;
      if (!uploadError) break;

      // Extract the underlying cause for better diagnostics
      const cause = extractUploadCause(uploadError);
      const detail = uploadError.message || String(uploadError);
      const isTransient = /fetch failed|ECONNRESET|ETIMEDOUT|EPIPE|socket hang up|network|abort/i.test(
        `${detail} ${cause}`
      );

      Logger.warn('Supabase upload attempt failed', {
        attempt,
        maxAttempts: MAX_UPLOAD_ATTEMPTS,
        error: detail,
        cause,
        errorType: uploadError.constructor?.name,
        userId,
        storageKey,
        bodySize: uploadBody.byteLength,
        transient: isTransient,
      });

      if (!isTransient || attempt === MAX_UPLOAD_ATTEMPTS) break;
      // Exponential backoff: 1s, 2s
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }

    if (uploadError) {
      const cause = extractUploadCause(uploadError);
      Logger.error('Supabase upload error (all attempts failed)', {
        error: uploadError.message,
        cause,
        errorType: uploadError.constructor?.name,
        userId,
        storageKey,
        bodySize: uploadBody.byteLength,
      });
      // Do not forward Supabase error details to client — may contain bucket/policy info
      return res.status(500).json({ success: false, error: { code: 'UPLOAD_FAILED', message: 'Upload failed. Please try again.' } });
    }

    const cdnUrl = `${CDN_BASE}/${storageKey}`;

    let media;
    try {
      media = await Media.create({
        uploadedBy: req.user._id,
        storageKey,
        cdnUrl,
        mediaType: isImage ? 'image' : 'video',
        mimeType: storedMime,
        originalMimeType: mimetype,
        width,
        height,
        fileSize: uploadBuffer.length,
        status: 'pending',
        sortOrder: 0,
      });
    } catch (dbErr) {
      // Supabase file exists but DB record creation failed — clean up the orphaned file
      Logger.error('Media.create failed after upload, cleaning up Supabase file', { error: dbErr.message, storageKey, userId });
      await supabase.storage.from(BUCKET).remove([storageKey]).catch(() => {});
      throw dbErr; // re-throw to hit outer catch
    }

    Logger.info('Media uploaded', { mediaId: media._id, userId, mediaType: media.mediaType, fileSize: uploadBuffer.length });
    return res.status(201).json({
      success: true,
      data: {
        mediaId: media._id,
        cdnUrl,
        width,
        height,
        fileSize: uploadBuffer.length,
        mediaType: media.mediaType,
      },
    });
  } catch (err) {
    Logger.error('Upload processing error', { error: err.message, cause: err.cause?.message, userId });
    return res.status(500).json({ success: false, error: { code: 'PROCESSING_FAILED', message: 'Failed to process upload' } });
  }
});

module.exports = router;
