import { isDatabaseReady } from '../config/db.js';

const analyticsFallbackPaths = ['/analytics/roadmap'];

export default function requireDatabase(req, _res, next) {
  if (isDatabaseReady()) return next();

  const path = req.originalUrl || req.url || '';
  if (analyticsFallbackPaths.some((entry) => path.includes(entry))) {
    return next();
  }

  const error = new Error('Database is temporarily unavailable. Please try again after the MongoDB connection is restored.');
  error.status = 503;
  error.expose = true;
  error.code = 'DATABASE_UNAVAILABLE';
  return next(error);
}
