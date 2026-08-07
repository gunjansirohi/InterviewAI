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
    const payload = req.body || {};
    const interviewId = payload.interviewId || payload.interview_id || payload.id;
    const warningType = payload.warningType || payload.warning_type || payload.type || payload.warningTypeName;
    const message = typeof payload.message === 'string' ? payload.message.trim() : '';
    const questionIndex = Number(payload.questionIndex ?? payload.question_index ?? 0);
    const severity = payload.severity || 'medium';
    const timestamp = payload.timestamp || new Date().toISOString();

    if (!interviewId) {
      return res.status(400).json({ success: false, message: 'Interview ID is required' });
    }

    if (!mongoose.isValidObjectId(interviewId)) {
      return res.status(400).json({ success: false, message: 'Invalid interview ID format' });
    }

    if (!warningType) {
      return res.status(400).json({ success: false, message: 'Warning type is required' });
    }

    if (!warningTypes.has(warningType)) {
      return res.status(400).json({ success: false, message: 'Unsupported warning type' });
    }

    if (!message) {
      return res.status(400).json({ success: false, message: 'Warning message is required' });
    }

    if (!Number.isInteger(questionIndex) || questionIndex < 0) {
      return res.status(400).json({ success: false, message: 'Question index must be a non-negative integer' });
    }

    const interview = await addProctorWarning({
      userId: req.user._id,
      interviewId,
      warning: {
        type: warningType,
        message,
        questionIndex,
        severity,
        timestamp,
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
    console.error('[proctor-warning-failed]', { requestId: req.id, userId: String(req.user?._id || ''), error: error?.stack || error });
    return res.status(500).json({ success: false, message: 'Unable to record warning' });
  }
}
