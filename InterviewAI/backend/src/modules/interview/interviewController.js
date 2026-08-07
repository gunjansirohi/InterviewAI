import mongoose from 'mongoose';
import Resume from '../resume/Resume.js';
import { createInterview, endInterviewSession, getInterviewById, getInterviewHistory, insertFollowUpQuestion, saveAnswer, skipQuestion } from './interviewService.js';
import { generateQuestions } from './questionGenerator.js';
import { generateFollowUpQuestion } from './followUpGenerator.js';

const types = new Set(['hr', 'technical', 'dsa', 'project', 'system-design', 'behavioral', 'mixed']);
const difficulties = new Set(['easy', 'medium', 'hard']);

export async function startInterview(req, res, next) {
  try {
    const { role, interviewType, difficulty, experienceLevel = 'mid' } = req.body;
    const questionCount = Number(req.body.questionCount);
    const errors = [];
    if (typeof role !== 'string' || role.trim().length < 2 || role.trim().length > 100) errors.push('Role must contain 2 to 100 characters');
    if (!types.has(interviewType)) errors.push('Interview type is invalid');
    if (!difficulties.has(difficulty)) errors.push('Difficulty is invalid');
    if (!['entry', 'mid', 'senior'].includes(experienceLevel)) errors.push('Experience level is invalid');
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 20) errors.push('Question count must be between 1 and 20');
    if (errors.length) return res.status(400).json({ success: false, message: 'Validation failed', errors });

    console.info('[interview-start-request]', { requestId: req.id, userId: String(req.user._id), role: role.trim(), interviewType, difficulty, questionCount });

    const resume = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!resume) {
      console.warn('[interview-start-no-resume]', { requestId: req.id, userId: String(req.user._id) });
      return res.status(400).json({ success: false, message: 'Upload and analyze a resume before starting an interview' });
    }

    const questions = await generateQuestions({
      skills: resume.extractedInformation.skills,
      projects: resume.extractedInformation.projects,
      role: role.trim(), interviewType, difficulty, experienceLevel, questionCount,
    });
    const interview = await createInterview({ userId: req.user._id, role: role.trim(), interviewType, difficulty, experienceLevel, questions });
    console.info('[interview-start-complete]', { requestId: req.id, interviewId: String(interview._id), userId: String(req.user._id), questionCount: questions.length });
    return res.status(201).json({ success: true, interview });
  } catch (error) {
    return next(error);
  }
}

export async function createFollowUp(req, res, next) {
  try {
    const { interviewId } = req.body; const questionIndex = Number(req.body.questionIndex);
    if (!mongoose.isValidObjectId(interviewId) || !Number.isInteger(questionIndex) || questionIndex < 0) return res.status(400).json({ success: false, message: 'A valid interview and answered question index are required' });
    const interview = await getInterviewById(req.user._id, interviewId);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    const answer = interview.answers.find((item) => item.questionIndex === questionIndex);
    const parent = interview.questions[questionIndex];
    if (!answer || !parent) return res.status(400).json({ success: false, message: 'Answer the question before requesting a follow-up' });
    if (parent.isFollowUp || interview.questions.filter((item) => item.isFollowUp).length >= 3) return res.status(200).json({ success: true, interview, followUpAdded: false });
    const resume = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    const question = await generateFollowUpQuestion({ role: interview.role, interviewType: interview.interviewType, experienceLevel: interview.experienceLevel, difficulty: interview.difficulty, parentQuestion: parent.question, answer: answer.transcript || answer.answer, skills: resume?.extractedInformation?.skills || [], projects: resume?.extractedInformation?.projects || [], askedQuestions: interview.askedQuestions?.length ? interview.askedQuestions : interview.questions.map((item) => item.question), previousConversation: interview.questions.slice(0, questionIndex + 1).map((item, index) => ({ question: item.question, answer: interview.answers.find((value) => value.questionIndex === index)?.transcript || interview.answers.find((value) => value.questionIndex === index)?.answer || '' })) });
    const result = await insertFollowUpQuestion({ userId: req.user._id, interviewId, questionIndex, question });
    return res.status(201).json({ success: true, interview: result.interview, followUpAdded: result.added });
  } catch (error) { return next(error); }
}

export async function endInterview(req, res, next) {
  try {
    const { interviewId, autoTerminated = false } = req.body || {};
    if (!mongoose.isValidObjectId(interviewId)) return res.status(400).json({ success: false, message: 'A valid interview ID is required' });
    const interview = await endInterviewSession({ userId: req.user._id, interviewId, isAutoTerminated: Boolean(autoTerminated) });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    return res.status(200).json({ success: true, interview, terminated: interview.status === 'terminated' });
  } catch (error) { return next(error); }
}

export async function submitAnswer(req, res, next) {
  try {
    const { interviewId, answer } = req.body;
    const questionIndex = Number(req.body.questionIndex);
    if (!mongoose.isValidObjectId(interviewId) || !Number.isInteger(questionIndex) || questionIndex < 0 || typeof answer !== 'string' || !answer.trim() || answer.length > 10000) {
      return res.status(400).json({ success: false, message: 'A valid interview, question index, and answer are required' });
    }
    const interview = await saveAnswer({ userId: req.user._id, interviewId, questionIndex, answer: answer.trim() });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    return res.status(200).json({ success: true, interview });
  } catch (error) {
    return next(error);
  }
}

export async function skipCurrentQuestion(req, res, next) {
  try {
    const { interviewId, questionId, reason = 'candidate_skipped' } = req.body || {};
    if (!mongoose.isValidObjectId(interviewId)) return res.status(400).json({ success: false, message: 'A valid interview ID is required' });
    const interview = await getInterviewById(req.user._id, interviewId);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

    const questionIndex = interview.questions.findIndex((item) => String(item._id || item.question) === String(questionId));
    if (questionIndex < 0) return res.status(400).json({ success: false, message: 'Invalid question reference' });

    const result = await skipQuestion({ userId: req.user._id, interviewId, questionIndex, reason });
    if (!result || !result.interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    if (result.skipped === false) {
      return res.status(200).json({ success: true, message: 'Question already skipped', nextQuestion: true, interview: result.interview });
    }
    return res.status(200).json({ success: true, message: 'Question skipped successfully', nextQuestion: true, interview: result.interview });
  } catch (error) {
    return next(error);
  }
}

export async function interviewHistory(req, res, next) {
  try {
    const interviews = await getInterviewHistory(req.user._id);
    return res.status(200).json({ success: true, interviews });
  } catch (error) {
    return next(error);
  }
}

export async function interviewDetails(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid interview ID' });
    const interview = await getInterviewById(req.user._id, req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    return res.status(200).json({ success: true, interview });
  } catch (error) {
    return next(error);
  }
}

export async function interviewStatus(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid interview ID' });
    const interview = await getInterviewById(req.user._id, req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    return res.status(200).json({ success: true, interview: { _id: interview._id, status: interview.status, warningCount: interview.warningCount || interview.warnings?.length || interview.proctorWarnings?.length || 0, endedAt: interview.endedAt, warnings: interview.warnings || [] } });
  } catch (error) {
    return next(error);
  }
}
