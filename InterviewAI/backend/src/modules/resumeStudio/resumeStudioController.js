import mongoose from 'mongoose';
import StudioResume from './Resume.js';
import { analyzeForAts } from './atsAnalyzer.js';
import { improveSection } from './aiResumeWriter.js';
import { generateResumePdf } from './pdfGenerator.js';
import { createResume, getResume, getResumeVersions, listResumes, updateResume } from './resumeStudioService.js';

export async function create(req, res, next) {
  try {
    const { name, email } = req.body.personalInfo || {};
    if (typeof name !== 'string' || name.trim().length < 2 || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: 'A valid name and email are required' });
    const resume = await createResume(req.user._id, req.body);
    return res.status(201).json({ success: true, resume });
  } catch (error) { return next(error); }
}

export async function update(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid resume ID' });
    const resume = await updateResume(req.user._id, req.params.id, req.body);
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });
    return res.status(200).json({ success: true, resume });
  } catch (error) { return next(error); }
}

export async function improve(req, res, next) {
  try {
    console.info('[resume-studio-improve-request]', {
      requestId: req.id,
      authenticatedUser: req.user ? { id: String(req.user._id || ''), email: req.user.email } : null,
      body: req.body,
      // Improve operates on the submitted editor content; it does not load a resume.
      resumeData: null,
      resumeLookup: 'not required for this endpoint',
    });
    if (!req.user?._id) return res.status(401).json({ success: false, message: 'Authentication is required to improve resume content.' });
    const { sectionType, content, targetRole = '' } = req.body || {};
    if (!['summary', 'project', 'experience', 'skills'].includes(sectionType)) return res.status(400).json({ success: false, message: 'sectionType must be one of: summary, project, experience, skills.' });
    if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ success: false, message: 'content is required and must be a non-empty string.' });
    if (content.length > 15000) return res.status(400).json({ success: false, message: 'content must not exceed 15,000 characters.' });
    if (typeof targetRole !== 'string') return res.status(400).json({ success: false, message: 'targetRole must be a string when provided.' });
    if (targetRole.length > 100) return res.status(400).json({ success: false, message: 'targetRole must not exceed 100 characters.' });
    const improvedContent = await improveSection({ sectionType, content: content.trim(), targetRole: targetRole.trim() });
    return res.status(200).json({ success: true, improvedContent });
  } catch (error) {
    console.error('[resume-studio-improve-failed]', {
      requestId: req.id,
      userId: String(req.user?._id || ''),
      message: error.message,
      stack: error.stack,
      causeMessage: error.cause?.message,
      causeStack: error.cause?.stack,
    });
    return next(error);
  }
}

export async function analyze(req, res, next) {
  try {
    console.info('[resume-studio-ats-request]', { requestId: req.id, authenticatedUser: req.user ? { id: String(req.user._id || ''), email: req.user.email } : null, body: req.body });
    if (!req.user?._id) return res.status(401).json({ success: false, message: 'Authentication is required to analyze a resume.' });
    const { resumeId, targetRole, jobDescription = '' } = req.body || {};
    if (!mongoose.isValidObjectId(resumeId)) return res.status(400).json({ success: false, message: 'resumeId must be a valid saved resume ID.' });
    if (typeof targetRole !== 'string' || targetRole.trim().length < 2) return res.status(400).json({ success: false, message: 'targetRole is required and must contain at least two characters.' });
    if (typeof jobDescription !== 'string') return res.status(400).json({ success: false, message: 'jobDescription must be a string when provided.' });
    if (jobDescription.length > 20000) return res.status(400).json({ success: false, message: 'jobDescription must not exceed 20,000 characters.' });
    const resume = await getResume(req.user._id, resumeId);
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });
    console.info('[resume-studio-ats-resume]', { requestId: req.id, resume: resume.toObject ? resume.toObject() : resume });
    const analysis = await analyzeForAts({ resume, targetRole: targetRole.trim().slice(0, 100), jobDescription: jobDescription.trim() });
    resume.atsScore = analysis.overallScore;
    try {
      await resume.save();
    } catch (cause) {
      const error = new Error('ATS analysis completed, but the score could not be saved.');
      error.status = 500;
      error.code = 'ATS_ANALYSIS_SAVE_FAILED';
      error.expose = true;
      error.cause = cause;
      throw error;
    }
    return res.status(200).json({ success: true, analysis });
  } catch (error) {
    console.error('[resume-studio-ats-failed]', { requestId: req.id, userId: String(req.user?._id || ''), message: error.message, stack: error.stack, causeMessage: error.cause?.message, causeStack: error.cause?.stack, responsePreview: error.cause?.responsePreview });
    return next(error);
  }
}

export async function downloadPdf(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.resumeId)) return res.status(400).json({ success: false, message: 'Invalid resume ID' });
    const resume = await getResume(req.user._id, req.params.resumeId);
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });
    const pdf = await generateResumePdf(resume);
    const filename = `${resume.personalInfo.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'resume'}.pdf`;
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': pdf.length });
    return res.send(pdf);
  } catch (error) { return next(error); }
}

export async function history(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.resumeId)) return res.status(400).json({ success: false, message: 'Invalid resume ID' });
    if (!(await StudioResume.exists({ _id: req.params.resumeId, userId: req.user._id }))) return res.status(404).json({ success: false, message: 'Resume not found' });
    return res.status(200).json({ success: true, versions: await getResumeVersions(req.user._id, req.params.resumeId) });
  } catch (error) { return next(error); }
}

export async function getOne(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid resume ID' });
    const resume = await getResume(req.user._id, req.params.id);
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });
    return res.status(200).json({ success: true, resume });
  } catch (error) { return next(error); }
}

export async function list(req, res, next) {
  try { return res.status(200).json({ success: true, resumes: await listResumes(req.user._id) }); }
  catch (error) { return next(error); }
}
