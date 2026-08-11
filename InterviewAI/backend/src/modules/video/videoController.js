import mongoose from 'mongoose';
import { addProctorWarning, endInterviewSession, saveAnswer } from '../interview/interviewService.js';

const warningTypes = new Set(['multiple_faces', 'no_face', 'looking_away', 'tab_switch', 'fullscreen_exit', 'silence', 'no_response']);

export async function saveVideoAnswer(req, res, next) {
  try {
    const { interviewId, transcript, videoUrl = '' } = req.body;
    const questionIndex = Number(req.body.questionIndex);
    if (!mongoose.isValidObjectId(interviewId) || !Number.isInteger(questionIndex) || questionIndex < 0 || typeof transcript !== 'string' || !transcript.trim() || transcript.length > 10000) return res.status(400).json({ success: false, message: 'A valid interview, question index, and transcript are required' });
    const ownedPrefix = `uploads/video/${req.user._id.toString()}/`;
    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.startsWith(ownedPrefix)) return res.status(400).json({ success: false, message: 'A valid owned video recording is required' });
    const interview = await saveAnswer({ userId: req.user._id, interviewId, questionIndex, answer: transcript.trim(), transcript: transcript.trim(), answerType: 'video', videoUrl });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    return res.status(200).json({ success: true, interview });
  } catch (error) { return next(error); }
}

export async function saveProctorWarning(req, res, next) {
  try {
    const payload = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const interviewId = typeof (payload.interviewId || payload.interview_id || payload.id) === 'string' ? (payload.interviewId || payload.interview_id || payload.id).trim() : payload.interviewId || payload.interview_id || payload.id;
    const warningType = typeof (payload.warningType || payload.warning_type || payload.type || payload.warningTypeName) === 'string' ? (payload.warningType || payload.warning_type || payload.type || payload.warningTypeName).trim() : '';
    const message = typeof payload.message === 'string' ? payload.message.trim() : '';
    const questionIndex = Number(payload.questionIndex ?? payload.question_index ?? 0);
    const severity = typeof payload.severity === 'string' ? payload.severity.trim().toLowerCase() : 'medium';
    const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
    const validationErrors = [];

    console.info('[proctor-warning-request]', { requestId: req.id, userId: String(req.user?._id || ''), body: payload, interviewId, warningType, questionIndex, severity, timestamp: Number.isNaN(timestamp.getTime()) ? 'invalid' : timestamp.toISOString() });

    if (!req.user?._id) return res.status(401).json({ success: false, message: 'Authentication is required to record a warning', requestId: req.id });

    if (!mongoose.isValidObjectId(interviewId)) validationErrors.push({ field: 'interviewId', message: 'A valid interview ID is required' });
    if (!warningTypes.has(warningType)) validationErrors.push({ field: 'warningType', message: 'Use a supported warning type' });
    if (!message || message.length > 200) validationErrors.push({ field: 'message', message: 'Warning message must contain 1 to 200 characters' });
    if (!Number.isInteger(questionIndex) || questionIndex < 0) validationErrors.push({ field: 'questionIndex', message: 'Question index must be a non-negative integer' });
    if (!['low', 'medium', 'high'].includes(severity)) validationErrors.push({ field: 'severity', message: 'Severity must be low, medium, or high' });
    if (Number.isNaN(timestamp.getTime())) validationErrors.push({ field: 'timestamp', message: 'Timestamp must be a valid date' });
    if (validationErrors.length) {
      console.warn('[proctor-warning-invalid]', { requestId: req.id, userId: String(req.user._id), interviewId, errors: validationErrors });
      return res.status(400).json({ success: false, message: 'Invalid proctor warning payload', errors: validationErrors, requestId: req.id });
    }

    const interview = await addProctorWarning({
      userId: req.user._id,
      interviewId,
      warning: {
        type: warningType,
        message,
        questionIndex,
        severity,
        createdAt: timestamp,
      },
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found or warning limit reached' });
    }

    const shouldAutoTerminate = interview.warningCount >= 5;
    if (shouldAutoTerminate) {
      const terminated = await endInterviewSession({ userId: req.user._id, interviewId, isAutoTerminated: true });
      return res.status(200).json({ success: true, warningCount: terminated.warningCount, autoTerminated: true, interview: terminated, message: 'Warning recorded and interview ended automatically due to multiple warnings.' });
    }

    return res.status(200).json({ success: true, warningCount: interview.warningCount, autoTerminated: false, interview, message: 'Warning recorded' });
  } catch (error) {
    console.error('[proctor-warning-failed]', { requestId: req.id, userId: String(req.user?._id || ''), interviewId: req.body?.interviewId, name: error?.name, message: error?.message, stack: error?.stack });
    return next(error);
  }
}
