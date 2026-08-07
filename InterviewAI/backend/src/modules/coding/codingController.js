import mongoose from 'mongoose';
import { getCodingBatch, getCodingHistory, getCodingInterview, runCandidateCode, sanitizeInterview, startCodingInterview, submitCandidateCode } from './codingService.js';
import { supportedLanguageSet } from './languages.js';
import { getExecutionProviderStatus } from './executionEngine.js';

const languages = supportedLanguageSet;
const difficulties = new Set(['easy', 'medium', 'hard']);

export async function start(req, res, next) {
  try {
    const { language, difficulty, topic } = req.body;
    const questionCount = Number(req.body.questionCount);
    if (!languages.has(language) || !difficulties.has(difficulty) || typeof topic !== 'string' || topic.trim().length < 2 || !Number.isInteger(questionCount) || questionCount < 1 || questionCount > 5) return res.status(400).json({ success: false, message: 'Valid language, difficulty, topic, and 1–5 questions are required' });
    const interviews = await startCodingInterview({ userId: req.user._id, language, difficulty, topic: topic.trim().slice(0, 100), questionCount });
    return res.status(201).json({ success: true, interviews: interviews.map(sanitizeInterview) });
  } catch (error) { return next(error); }
}

export async function getOne(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid coding interview ID' });
    const interview = await getCodingInterview(req.user._id, req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Coding interview not found' });
    return res.status(200).json({ success: true, interview: sanitizeInterview(interview) });
  } catch (error) { return next(error); }
}

export async function run(req, res, next) {
  try {
    const { code, sourceCode, language, input = '', testCases, problemId } = req.body || {};
    const source = typeof code === 'string' && code.trim() ? code : typeof sourceCode === 'string' && sourceCode.trim() ? sourceCode : '';
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'The coding interview ID in the URL is invalid.' });
    if (typeof source !== 'string' || !source.trim()) return res.status(400).json({ success: false, message: 'Code is required and cannot be empty.' });
    if (source.length > 100000) return res.status(400).json({ success: false, message: 'Code must not exceed 100,000 characters.' });
    if (typeof language !== 'string' || !languages.has(language)) return res.status(400).json({ success: false, message: 'A supported language is required.' });
    if (typeof input !== 'string' || input.length > 20000) return res.status(400).json({ success: false, message: 'input must be a string no longer than 20,000 characters.' });
    if (testCases !== undefined && !Array.isArray(testCases)) return res.status(400).json({ success: false, message: 'testCases must be an array when provided. Test cases are managed by the saved coding problem.' });
    console.info('[coding-run-request]', { requestId: req.id, interviewId: req.params.id, problemId, userId: String(req.user._id), language, codeCharacters: source.length, inputCharacters: input.length, suppliedTestCaseCount: testCases?.length ?? 0 });
    const execution = await runCandidateCode({ userId: req.user._id, interviewId: req.params.id, code: source, language, input, problemId, testCases });
    if (!execution) {
      console.warn('[coding-run-not-found]', { requestId: req.id, interviewId: req.params.id, userId: String(req.user._id) });
      return res.status(404).json({ success: false, message: 'Coding interview not found' });
    }
    console.info('[coding-run-complete]', { requestId: req.id, interviewId: req.params.id, status: execution.status, executionTime: execution.executionTime, memoryUsage: execution.memoryUsage });
    return res.status(200).json({ success: true, execution });
  } catch (error) {
    console.error('[coding-run-request-failed]', { requestId: req.id, interviewId: req.params.id, userId: String(req.user?._id || ''), code: error.code, message: error.message, stack: error.stack });
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
    return res.status(status).json({ success: false, error: error.message, code: error.code || 'CODING_EXECUTION_FAILED' });
  }
}

export async function executionStatus(_req, res, next) {
  try {
    const status = await getExecutionProviderStatus();
    return res.status(status.available ? 200 : 503).json({ success: status.available, ...status });
  } catch (error) { return next(error); }
}

export async function submit(req, res, next) {
  try {
    const { code } = req.body;
    if (!mongoose.isValidObjectId(req.params.id) || typeof code !== 'string' || !code.trim() || code.length > 100000) return res.status(400).json({ success: false, message: 'Valid submitted code is required' });
    const result = await submitCandidateCode({ userId: req.user._id, interviewId: req.params.id, code });
    if (!result) return res.status(404).json({ success: false, message: 'Coding interview not found' });
    return res.status(200).json({ success: true, ...result });
  } catch (error) { return next(error); }
}

export async function history(req, res, next) {
  try { return res.status(200).json({ success: true, interviews: await getCodingHistory(req.user._id) }); }
  catch (error) { return next(error); }
}

export async function getBatch(req, res, next) {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.batchId)) return res.status(400).json({ success: false, message: 'Invalid coding interview batch ID' });
    const interviews = await getCodingBatch(req.user._id, req.params.batchId);
    return res.status(200).json({ success: true, interviews: interviews.map(sanitizeInterview) });
  } catch (error) { return next(error); }
}
