
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import multer from 'multer';
import protect from '../../middleware/authMiddleware.js';
import { transcribe } from './voiceController.js';

const allowedAudioTypes = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/ogg',
]);

const maximumBytes =
  (Number(process.env.MAX_AUDIO_SIZE_MB) || 10) * 1024 * 1024;

// Vercel: use temporary writable storage instead of the project directory.
export const audioUploadDirectory = path.join(
  os.tmpdir(),
  'interviewai',
  'uploads',
  'audio'
);

mkdirSync(audioUploadDirectory, { recursive: true });

const audioUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, callback) => {
      try {
        const userDirectory = path.join(
          audioUploadDirectory,
          String(req.user._id)
        );

        mkdirSync(userDirectory, { recursive: true });
        callback(null, userDirectory);
      } catch (error) {
        callback(error);
      }
    },

    filename: (_req, file, callback) => {
      const extension = file.mimetype.includes('mp4')
        ? '.mp4'
        : file.mimetype.includes('mpeg')
          ? '.mp3'
          : file.mimetype.includes('wav')
            ? '.wav'
            : file.mimetype.includes('ogg')
              ? '.ogg'
              : '.webm';

      callback(null, `${randomUUID()}${extension}`);
    },
  }),

  limits: {
    fileSize: maximumBytes,
    files: 1,
  },

  fileFilter: (_req, file, callback) => {
    const baseMimeType = file.mimetype.split(';')[0].toLowerCase();

    if (!allowedAudioTypes.has(baseMimeType)) {
      const error = new Error('Unsupported audio format');
      error.status = 400;
      return callback(error);
    }

    return callback(null, true);
  },
});

const router = Router();

router.post(
  '/transcribe',
  protect,
  audioUpload.single('audio'),
  transcribe
);

export default router;
