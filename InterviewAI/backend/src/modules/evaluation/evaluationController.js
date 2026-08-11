import mongoose from 'mongoose';
import Interview from '../interview/Interview.js';
import InterviewReport from './InterviewReport.js';
import { generateInterviewReport } from './reportGenerator.js';
import { generateEvaluationReportPdf } from './reportPdfGenerator.js';
import User from '../../models/User.js';

export async function evaluate(req, res, next) {
  try {
    const payload = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const interviewId = typeof payload.interviewId === 'string' ? payload.interviewId.trim() : payload.interviewId;
    if (!mongoose.isValidObjectId(interviewId)) {
      console.warn('[evaluation-request-invalid]', {
        requestId: req.id,
        userId: String(req.user?._id || ''),
        receivedKeys: Object.keys(payload),
        interviewIdType: typeof payload.interviewId,
      });
      return res.status(400).json({
        success: false,
        code: 'INVALID_EVALUATION_REQUEST',
        message: 'A valid interviewId is required to generate an evaluation.',
        errors: [{ field: 'interviewId', message: 'Provide the saved interview ID returned when the interview was created.' }],
        requestId: req.id,
      });
    }
    console.info('[evaluation-request]', { requestId: req.id, interviewId, userId: String(req.user._id) });
    const interview = await Interview.findOne({ _id: interviewId, userId: req.user._id });
    if (!interview) { console.warn('[evaluation-interview-not-found]', { requestId: req.id, interviewId, userId: String(req.user._id) }); return res.status(404).json({ success: false, message: 'Interview not found' }); }
    console.info('[evaluation-context-resolved]', {
      requestId: req.id,
      interviewId,
      status: interview.status,
      questionCount: interview.questions.length,
      answerCount: interview.answers.length,
      answeredCount: interview.answers.filter((answer) => answer.status !== 'skipped' && Boolean((answer.transcript || answer.answer || '').trim())).length,
      skippedCount: interview.answers.filter((answer) => answer.status === 'skipped').length,
      proctorWarningCount: interview.proctorWarnings?.length || 0,
    });
    const report = await generateInterviewReport(interview);
    console.info('[evaluation-complete]', { requestId: req.id, interviewId, reportId: String(report._id), overallScore: report.overallScore });
    return res.status(200).json({ success: true, report });
  } catch (error) {
    return next(error);
  }
}

export async function getReport(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid report ID' });
    const report = await InterviewReport.findOne({ userId: req.user._id, $or: [{ _id: req.params.id }, { interviewId: req.params.id }] }).populate('interviewId', 'role interviewType difficulty createdAt');
    if (!report) return res.status(404).json({ success: false, message: 'Interview report not found' });
    return res.status(200).json({ success: true, report });
  } catch (error) {
    return next(error);
  }
}

export async function downloadReport(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid report ID' });
    const report = await InterviewReport.findOne({ userId: req.user._id, $or: [{ _id: req.params.id }, { interviewId: req.params.id }] });
    if (!report) return res.status(404).json({ success: false, message: 'Interview report not found' });
    const interview = await Interview.findOne({ _id: report.interviewId, userId: req.user._id });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview details not found' });
    const candidate = await User.findById(req.user._id).select('name');
    console.info('[evaluation-download-request]', { requestId: req.id, reportId: String(report._id), interviewId: String(interview._id), userId: String(req.user._id) });
    const pdf = await generateEvaluationReportPdf({ report, interview, candidate });
    const filename = `interview-evaluation-${String(interview._id)}.pdf`;
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': pdf.length, 'Cache-Control': 'private, no-store' });
    return res.status(200).send(pdf);
  } catch (error) { return next(error); }
}

export async function getHistory(req, res, next) {
  try {
    const reports = await InterviewReport.find({ userId: req.user._id }).sort({ createdAt: -1 }).populate('interviewId', 'role interviewType difficulty createdAt');
    return res.status(200).json({ success: true, reports });
  } catch (error) {
    return next(error);
  }
}
