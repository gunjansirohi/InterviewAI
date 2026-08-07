import cors from 'cors';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import resumeRoutes from './modules/resume/resumeRoutes.js';
import interviewRoutes from './modules/interview/interviewRoutes.js';
import voiceRoutes from './modules/voice/voiceRoutes.js';
import evaluationRoutes from './modules/evaluation/evaluationRoutes.js';
import analyticsRoutes from './modules/analytics/analyticsRoutes.js';
import resumeStudioRoutes from './modules/resumeStudio/resumeStudioRoutes.js';
import codingRoutes from './modules/coding/codingRoutes.js';
import videoRoutes from './modules/video/videoRoutes.js';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { isDatabaseReady } from './config/db.js';
import requireDatabase from './middleware/databaseAvailability.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  req.id = req.get('x-request-id') || randomUUID();
  res.set('x-request-id', req.id);
  next();
});
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));
const statusHandler = (_req, res) => {
  const databaseConnected = isDatabaseReady();
  return res.status(200).json({
    status: databaseConnected ? 'ok' : 'degraded',
    message: databaseConnected ? 'InterviewAI API is running' : 'InterviewAI API is running without a database connection',
    database: databaseConnected ? 'connected' : 'unavailable',
  });
};
app.get('/api/status', statusHandler);
app.get('/api/health', statusHandler);

app.use('/api', requireDatabase);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/resume-studio', resumeStudioRoutes);
app.use('/api/coding', codingRoutes);
app.use('/api/video', videoRoutes);

app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((error, req, res, _next) => {
  if (res.headersSent) return _next(error);
  console.error(`[${req.id}]`, error);
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file exceeds the allowed size' : error.code === 'LIMIT_UNEXPECTED_FILE' ? `Unexpected upload field "${error.field}"; use the field name configured for this endpoint` : error.message;
    return res.status(400).json({ success: false, message });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: Object.values(error.errors).map((item) => item.message) });
  }
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  const exposeMessage = status < 500 || error.expose === true;
  const response = { success: false, status: 'error', message: exposeMessage ? error.message : 'Internal server error', requestId: req.id };
  if (error.code) response.code = error.code;
  if (error.provider) response.provider = error.provider;
  if (error.requestId) response.requestId = error.requestId;
  res.status(status).json(response);
});

export default app;

