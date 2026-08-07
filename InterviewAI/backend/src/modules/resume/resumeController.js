import { unlink } from 'node:fs/promises';
import path from 'node:path';
import Resume from './Resume.js';
import { extractResumeText } from './resumeParser.js';
import { analyzeResume } from './resumeService.js';
import { uploadDirectory } from './uploadMiddleware.js';
import { extractResumeProfileMetadata } from './resumeProfileExtractor.js';

async function removeUploadedFile(filePath) {
  if (filePath) await unlink(filePath).catch(() => undefined);
}

export async function upload(req, res, next) {
  if (!req.file) return res.status(400).json({ success: false, message: 'A resume file is required' });

  try {
    const existingResume = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (existingResume) {
      await removeUploadedFile(req.file.path);
      return res.status(409).json({ success: false, code: 'RESUME_PROFILE_EXISTS', message: 'A saved resume profile already exists. Delete it before uploading a replacement.', resume: existingResume });
    }

    console.info('[resume-upload-request]', { requestId: req.id, feature: req.get('x-interviewai-feature') || 'unknown', userId: String(req.user._id), filename: req.file.originalname, mimeType: req.file.mimetype, bytes: req.file.size });
    const text = await extractResumeText(req.file);
    const { extractedInformation, analysisProvider, analysisWarning } = await analyzeResume(text);
    const metadata = extractResumeProfileMetadata(text, req.user.name);
    const fileReference = path.posix.join('uploads', 'resumes', req.file.filename);
    const resume = await Resume.create({
      userId: req.user._id,
      filePath: fileReference,
      originalFileName: req.file.originalname,
      resumeName: req.file.originalname,
      fileUrl: fileReference,
      ...metadata,
      summary: extractedInformation.summary,
      skills: extractedInformation.skills,
      projects: extractedInformation.projects,
      education: extractedInformation.education,
      experience: extractedInformation.experience,
      atsScore: extractedInformation.atsAnalysis?.atsScore || 0,
      strengths: extractedInformation.atsAnalysis?.strengths || extractedInformation.strengths,
      weaknesses: extractedInformation.atsAnalysis?.weaknesses || extractedInformation.weaknesses,
      suggestions: extractedInformation.atsAnalysis?.suggestions || extractedInformation.improvementSuggestions,
      extractedInformation,
      analysisProvider,
      analysisWarning,
    });
    console.info('[resume-upload-complete]', { requestId: req.id, userId: String(req.user._id), resumeId: String(resume._id), analysisProvider, extractedCharacters: text.length });
    return res.status(201).json({ success: true, resume });
  } catch (error) {
    console.error('[resume-upload-failed]', { requestId: req.id, userId: String(req.user._id), filename: req.file.originalname, code: error.code, message: error.message });
    await removeUploadedFile(req.file.path);
    return next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    const resume = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, resume: resume || null });
  } catch (error) {
    return next(error);
  }
}

export async function reanalyzeProfile(req, res, next) {
  try {
    const resume = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!resume) return res.status(404).json({ success: false, message: 'No saved resume profile was found' });

    const filePath = path.resolve(uploadDirectory, path.basename(resume.filePath));
    console.info('[resume-reanalysis-request]', { requestId: req.id, userId: String(req.user._id), resumeId: String(resume._id), previousProvider: resume.analysisProvider });
    const text = await extractResumeText({ path: filePath, originalname: resume.originalFileName });
    const { extractedInformation, analysisProvider, analysisWarning } = await analyzeResume(text);

    resume.summary = extractedInformation.summary;
    resume.skills = extractedInformation.skills;
    resume.projects = extractedInformation.projects;
    resume.education = extractedInformation.education;
    resume.experience = extractedInformation.experience;
    resume.atsScore = extractedInformation.atsAnalysis?.atsScore || 0;
    resume.strengths = extractedInformation.atsAnalysis?.strengths || extractedInformation.strengths;
    resume.weaknesses = extractedInformation.atsAnalysis?.weaknesses || extractedInformation.weaknesses;
    resume.suggestions = extractedInformation.atsAnalysis?.suggestions || extractedInformation.improvementSuggestions;
    resume.extractedInformation = extractedInformation;
    resume.analysisProvider = analysisProvider;
    resume.analysisWarning = analysisWarning;
    await resume.save();

    console.info('[resume-reanalysis-complete]', { requestId: req.id, resumeId: String(resume._id), analysisProvider, extractedCharacters: text.length });
    return res.status(200).json({ success: true, resume });
  } catch (error) {
    console.error('[resume-reanalysis-failed]', { requestId: req.id, userId: String(req.user._id), code: error.code, message: error.message });
    return next(error);
  }
}

export async function deleteProfile(req, res, next) {
  try {
    const resumes = await Resume.find({ userId: req.user._id }).select('filePath');
    if (!resumes.length) return res.status(404).json({ success: false, message: 'No saved resume profile was found' });
    await Resume.deleteMany({ userId: req.user._id });
    await Promise.all(resumes.map(({ filePath }) => removeUploadedFile(path.resolve(uploadDirectory, path.basename(filePath)))));
    console.info('[resume-profile-deleted]', { requestId: req.id, userId: String(req.user._id), deletedCount: resumes.length });
    return res.status(200).json({ success: true, message: 'Resume profile deleted' });
  } catch (error) {
    return next(error);
  }
}
