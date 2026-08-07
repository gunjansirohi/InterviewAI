import mongoose from 'mongoose';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { saveAnswer } from '../interview/interviewService.js';
import { transcribeAudio } from './speechService.js';

export async function resolveTranscript(file, browserTranscript) {
  if (browserTranscript !== undefined) {
    if (typeof browserTranscript !== 'string' || browserTranscript.length > 10000) {
      const error = new Error('Browser transcript must be text no longer than 10,000 characters');
      error.status = 400;
      error.expose = true;
      throw error;
    }
    const transcript = browserTranscript.trim();
    if (transcript) return { transcript, source: 'browser' };
  }
  return { transcript: await transcribeAudio(file), source: 'provider' };
}

export async function transcribe(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'An audio recording is required' });
    console.info('[voice-transcription-request]', { requestId: req.id, feature: req.get('x-interviewai-feature') || 'unknown', userId: String(req.user._id), mimeType: req.file.mimetype, bytes: req.file.size });
    const { transcript, source } = await resolveTranscript(req.file, req.body?.browserTranscript);
    const audioUrl = path.posix.join('uploads', 'audio', req.user._id.toString(), req.file.filename);
    console.info('[voice-transcription-complete]', { requestId: req.id, userId: String(req.user._id), source, characters: transcript.length });
    return res.status(200).json({ success: true, transcript, audioUrl, transcriptionSource: source });
  } catch (error) {
    console.error('[voice-transcription-failed]', { requestId: req.id, userId: String(req.user._id), code: error.code, message: error.message });
    if (req.file?.path) await unlink(req.file.path).catch(() => undefined);
    return next(error);
  }
}

export async function saveVoiceAnswer(req, res, next) {
  try {
    const { interviewId, transcript, audioUrl = '' } = req.body;
    const questionIndex = Number(req.body.questionIndex);
    if (!mongoose.isValidObjectId(interviewId) || !Number.isInteger(questionIndex) || questionIndex < 0 || typeof transcript !== 'string' || !transcript.trim() || transcript.length > 10000) {
      return res.status(400).json({ success: false, message: 'A valid interview, question index, and transcript are required' });
    }
    const ownedAudioPrefix = `uploads/audio/${req.user._id.toString()}/`;
    if (audioUrl && (typeof audioUrl !== 'string' || !audioUrl.startsWith(ownedAudioPrefix))) return res.status(400).json({ success: false, message: 'Invalid audio reference' });
    const interview = await saveAnswer({ userId: req.user._id, interviewId, questionIndex, answer: transcript.trim(), transcript: transcript.trim(), answerType: 'voice', audioUrl });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    return res.status(200).json({ success: true, interview });
  } catch (error) {
    return next(error);
  }
}
