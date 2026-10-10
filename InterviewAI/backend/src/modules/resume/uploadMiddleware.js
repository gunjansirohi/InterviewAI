import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import multer from 'multer';

// Vercel serverless environment mein writable temporary directory
export const uploadDirectory = path.join(
  os.tmpdir(),
  'interview-ai',
  'uploads',
  'resumes'
);

mkdirSync(uploadDirectory, { recursive: true });

const allowedFiles = new Map([
  [
    '.pdf',
    new Set(['application/pdf', 'application/octet-stream']),
  ],
  [
    '.docx',
    new Set([
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/octet-stream',
    ]),
  ],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (_req, file, callback) => {
    callback(
      null,
      `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`
    );
  },
});

function fileFilter(_req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  const acceptedMimeTypes = allowedFiles.get(extension);

  if (!acceptedMimeTypes?.has(file.mimetype)) {
    const error = new Error('Only PDF and DOCX resume files are allowed');
    error.status = 400;
    return callback(error);
  }

  return callback(null, true);
}

const maximumBytes =
  (Number(process.env.MAX_RESUME_SIZE_MB) || 5) * 1024 * 1024;

const uploadResume = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maximumBytes,
    files: 1,
  },
});

export default uploadResume;