import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import connectDatabase from './config/db.js';

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  console.info('[ai-startup-configuration]', {
    provider: 'gemini',
    apiKeyConfigured: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
    configuredModel: String(process.env.GEMINI_MODEL || '').trim().replace(/^models\/+?/i, '') || 'auto-discovery',
    fallback: 'local analysis is used only when Gemini is unavailable',
  });

  const databaseReady = await connectDatabase();
  if (!databaseReady) {
    console.warn('Database connection could not be established at startup; route handlers will use graceful fallbacks.');
  }

  const server = app.listen(port, () => console.log(`InterviewAI API listening on port ${port}`));
  const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down gracefully.`);
    server.close(async () => {
      await mongoose.disconnect().catch((error) => console.error('MongoDB disconnect failed:', error.message));
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('Failed to start the server:', error);
  process.exit(1);
});

