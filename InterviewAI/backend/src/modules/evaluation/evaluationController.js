import mongoose from 'mongoose';
import Interview from '../interview/Interview.js';
import InterviewReport from './InterviewReport.js';
import { generateInterviewReport } from './reportGenerator.js';

export async function evaluate(req, res, next) {
  try {
    const { interviewId } = req.body;
    if (!mongoose.isValidObjectId(interviewId)) return res.status(400).json({ success: false, message: 'A valid interview ID is required' });
    console.info('[evaluation-request]', { requestId: req.id, interviewId, userId: String(req.user._id) });
    const interview = await Interview.findOne({ _id: interviewId, userId: req.user._id });
    if (!interview) { console.warn('[evaluation-interview-not-found]', { requestId: req.id, interviewId, userId: String(req.user._id) }); return res.status(404).json({ success: false, message: 'Interview not found' }); }
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

export async function getHistory(req, res, next) {
  try {
    const reports = await InterviewReport.find({ userId: req.user._id }).sort({ createdAt: -1 }).populate('interviewId', 'role interviewType difficulty createdAt');
    return res.status(200).json({ success: true, reports });
  } catch (error) {
    return next(error);
  }
}
