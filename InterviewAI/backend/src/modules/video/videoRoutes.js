import { randomUUID } from 'node:crypto';
import { mkdirSync, unlink } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { Router } from 'express';
import protect from '../../middleware/authMiddleware.js';

const maximumBytes = (Number(process.env.MAX_VIDEO_SIZE_MB) || 50) * 1024 * 1024;
const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../uploads/video');
const allowedMimeTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/x-msvideo', 'video/ogg']);
const allowedExtensions = new Set(['.mp4', '.webm', '.mov', '.m4v', '.avi', '.ogg']);
mkdirSync(directory, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, callback) => {
      const userDirectory = path.join(directory, req.user._id.toString());
      mkdirSync(userDirectory, { recursive: true });
      callback(null, userDirectory);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || '').toLowerCase();
      const fallbackExtension = extension || (file.mimetype?.includes('mp4') ? '.mp4' : '.webm');
      callback(null, `${randomUUID()}${fallbackExtension}`);
    },
  }),
  limits: { fileSize: maximumBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    const normalizedMime = (file.mimetype || '').split(';')[0].toLowerCase();
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (allowedMimeTypes.has(normalizedMime) || allowedExtensions.has(extension)) {
      return callback(null, true);
    }
    const error = new Error('Unsupported video format');
    error.status = 400;
    error.code = 'UNSUPPORTED_MEDIA_TYPE';
    return callback(error);
  },
});

function receiveVideo(req, res, next) {
  upload.single('video')(req, res, (error) => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : error.status || 400;
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded video exceeds the allowed size'
        : error.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Unexpected upload field; use the field name "video"'
          : error.message || 'Video upload failed';
      console.error('[video-upload-rejected]', { requestId: req.id, userId: String(req.user?._id || ''), contentType: req.get('content-type'), code: error.code, field: error.field, message: error.message });
      return res.status(status).json({ success: false, message });
    }

    if (!req.file) {
      console.warn('[video-upload-missing-file]', { requestId: req.id, userId: String(req.user?._id || '') });
      return res.status(400).json({ success: false, message: 'Video file is required' });
    }
    if (req.file.size <= 0) {
      console.warn('[video-upload-empty-file]', { requestId: req.id, userId: String(req.user?._id || ''), mimeType: req.file.mimetype, filename: req.file.filename });
      unlink(req.file.path, () => undefined);
      return res.status(400).json({ success: false, code: 'EMPTY_VIDEO_FILE', message: 'The uploaded video contains no data. Record your response again before uploading.' });
    }

    console.info('[video-upload-received]', { requestId: req.id, feature: req.get('x-interviewai-feature') || 'unknown', userId: String(req.user._id), field: req.file?.fieldname, mimeType: req.file?.mimetype, bytes: req.file?.size });
    return next();
  });
}

const router = Router();
router.post('/upload', protect, receiveVideo, (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Video file is required' });
    const videoUrl = path.posix.join('uploads', 'video', req.user._id.toString(), req.file.filename);
    console.info('[video-upload-complete]', { requestId: req.id, userId: String(req.user._id), videoUrl });
    return res.status(201).json({ success: true, videoUrl });
  } catch (error) {
    console.error('[video-upload-failed]', { requestId: req.id, userId: String(req.user?._id || ''), message: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Unable to process video upload' });
  }
});

export default router;
