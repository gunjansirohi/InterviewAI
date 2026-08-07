import { randomUUID } from 'node:crypto';
import GeminiClient from '../../lib/geminiClient.js';
import { zodTextFormat } from '../../lib/geminiClient.js';
import { z } from 'zod';
import CodingEvaluation from './CodingEvaluation.js';
import CodingInterview from './CodingInterview.js';
import { reviewCode } from './aiCodeReview.js';
import { executeCode } from './executionEngine.js';
import { buildProblemPrompt } from './promptTemplates.js';
import { runTestCases } from './testCaseEngine.js';
import { generateLocalProblems } from './localProblemGenerator.js';

const problemSchema = z.object({
  problems: z.array(z.object({
    title: z.string(), statement: z.string(),
    examples: z.array(z.object({ input: z.string(), output: z.string(), explanation: z.string() })),
    constraints: z.array(z.string()), starterCode: z.string(),
    publicTestCases: z.array(z.object({ input: z.string(), expectedOutput: z.string() })),
    hiddenTestCases: z.array(z.object({ input: z.string(), expectedOutput: z.string() })),
  })).min(1).max(5),
});

export async function startCodingInterview({ userId, language, difficulty, topic, questionCount }) {
  const recentInterviews = await CodingInterview.find({ userId, topic }).sort({ createdAt: -1 }).limit(50).select('problem.title').lean();
  const avoidTitles = recentInterviews.map((interview) => interview.problem.title);
  if (!process.env.GEMINI_API_KEY) {
    const problems = generateLocalProblems({ language, difficulty, topic, questionCount, avoidTitles });
    return saveProblems({ userId, language, difficulty, topic, problems });
  }
  const client = new GeminiClient({ apiKey: process.env.GEMINI_API_KEY, timeout: 45_000, maxRetries: 2 });
  try {
    const response = await client.responses.parse({
      model: process.env.GEMINI_MODEL,
      input: [{ role: 'system', content: 'You create deterministic, sandbox-friendly coding interview problems and follow the required schema exactly.' }, { role: 'user', content: buildProblemPrompt({ language, difficulty, topic, questionCount, avoidTitles }) }],
      text: { format: zodTextFormat(problemSchema, 'coding_problems') },
    });
    if (!response.output_parsed || response.output_parsed.problems.length !== questionCount) throw new Error('The AI returned an unexpected number of coding problems');
    const generatedTitles = response.output_parsed.problems.map((problem) => problem.title.trim().toLowerCase());
    if (new Set(generatedTitles).size !== generatedTitles.length) throw new Error('The AI returned duplicate coding problems');
    const avoidedTitles = new Set(avoidTitles.map((title) => title.trim().toLowerCase()));
    if (generatedTitles.some((title) => avoidedTitles.has(title))) throw new Error('The AI reused a recent coding problem');
    return saveProblems({ userId, language, difficulty, topic, problems: response.output_parsed.problems });
  } catch (cause) {
    const timedOut = cause.code === 'ETIMEDOUT' || cause.code === 'ECONNABORTED' || cause.name === 'APIConnectionTimeoutError';
    const providerStatus = Number(cause?.status);
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Gemini coding question generation failed; using local fallback.', {
        status: providerStatus || undefined,
        requestId: cause?.request_id || cause?.headers?.['x-request-id'],
      });
      const problems = generateLocalProblems({ language, difficulty, topic, questionCount, avoidTitles });
      return saveProblems({ userId, language, difficulty, topic, problems });
    }
    let message = timedOut ? 'Coding question service timed out. Please try again.' : 'Coding question service is temporarily unavailable. Please try again.';
    let code = timedOut ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE';
    if (providerStatus === 401 || providerStatus === 403) {
      message = 'Coding question service authentication failed. Check the server GEMINI_API_KEY.';
      code = 'AI_AUTH_FAILED';
    } else if (providerStatus === 429) {
      message = 'Coding question service is rate-limited or has no available quota. Please try again later.';
      code = 'AI_RATE_LIMITED';
    } else if (providerStatus === 400 || providerStatus === 404) {
      message = `Coding question model "${process.env.GEMINI_MODEL}" is unavailable for this API key.`;
      code = 'AI_MODEL_UNAVAILABLE';
    }
    const error = new Error(message);
    error.status = timedOut ? 504 : 503;
    error.expose = true;
    error.code = code;
    error.requestId = cause?.request_id || cause?.headers?.['x-request-id'];
    error.cause = cause;
    throw error;
  }
}

function saveProblems({ userId, language, difficulty, topic, problems }) {
  const batchId = randomUUID();
  const documents = problems.map((item, index) => ({ userId, batchId, questionNumber: index + 1, language, difficulty, topic, problem: { title: item.title, statement: item.statement, examples: item.examples, constraints: item.constraints }, starterCode: item.starterCode, testCases: [...item.publicTestCases.map((test) => ({ ...test, hidden: false })), ...item.hiddenTestCases.map((test) => ({ ...test, hidden: true }))] }));
  return CodingInterview.insertMany(documents);
}

export async function runCandidateCode({ userId, interviewId, code, language, input, problemId, testCases }) {
  const interview = await CodingInterview.findOne({ _id: interviewId, userId });
  if (!interview) return null;
  if (language !== interview.language) {
    const error = new Error(`This coding problem must be run as ${interview.language}, not ${language}.`);
    error.status = 400; error.expose = true; error.code = 'LANGUAGE_MISMATCH'; throw error;
  }
  if (normalizeSource(code) === normalizeSource(interview.starterCode)) {
    const error = new Error('Please write your code before running. The unchanged starter code cannot be executed.');
    error.status = 400; error.expose = true; error.code = 'CODE_NOT_MODIFIED'; throw error;
  }
  console.log('[coding-run-start]', { interviewId, problemId: problemId || interviewId, userId: String(userId), language, codeLength: code.length, inputLength: input.length, testCaseCount: Array.isArray(testCases) ? testCases.length : 0 });
  let execution;
  try {
    execution = await executeCode({ language: interview.language, code, stdin: input });
  } catch (error) {
    console.error('[coding-run-failed]', { interviewId, userId: String(userId), language: interview.language, errorCode: error.code, errorMessage: error.message });
    throw error;
  }
  console.log('[coding-run-complete]', { interviewId, problemId: problemId || interviewId, status: execution.status, executionTime: execution.executionTime, memoryUsage: execution.memoryUsage });
  interview.submittedCode = code;
  interview.executionOutput = execution;
  await interview.save();
  return execution;
}

export async function submitCandidateCode({ userId, interviewId, code }) {
  const interview = await CodingInterview.findOne({ _id: interviewId, userId }).select('+testCases');
  if (!interview) return null;
  if (normalizeSource(code) === normalizeSource(interview.starterCode)) {
    const error = new Error('Please write your code before submitting. The unchanged starter code cannot be submitted.');
    error.status = 400; error.expose = true; error.code = 'CODE_NOT_MODIFIED'; throw error;
  }
  const testSummary = await runTestCases({ language: interview.language, code, testCases: interview.testCases });
  const review = await reviewCode({ language: interview.language, problem: interview.problem, code, testSummary: { passedCount: testSummary.passedCount, totalCount: testSummary.totalCount, correctness: testSummary.correctness } });
  const reviewAverage = (review.logicScore + review.readabilityScore + review.namingScore + review.optimizationScore) / 4;
  const finalScore = Math.round(testSummary.correctness * 0.7 + reviewAverage * 0.3);
  const evaluation = await CodingEvaluation.findOneAndUpdate(
    { codingInterviewId: interview._id },
    { $set: { userId, correctness: testSummary.correctness, executionTime: testSummary.executionTime, memoryUsage: testSummary.memoryUsage, ...review, finalScore, testResults: testSummary.results } },
    { upsert: true, new: true, runValidators: true },
  );
  interview.submittedCode = code;
  interview.executionOutput = { passedCount: testSummary.passedCount, totalCount: testSummary.totalCount, executionTime: testSummary.executionTime, memoryUsage: testSummary.memoryUsage };
  interview.score = finalScore;
  await interview.save();
  return { interview: sanitizeInterview(interview), evaluation };
}

export function getCodingInterview(userId, interviewId) { return CodingInterview.findOne({ _id: interviewId, userId }).select('+testCases'); }
export function getCodingBatch(userId, batchId) { return CodingInterview.find({ userId, batchId }).sort({ questionNumber: 1 }).select('+testCases'); }
export function getCodingHistory(userId) { return CodingInterview.find({ userId }).sort({ createdAt: -1 }).lean(); }

function normalizeSource(value = '') { return value.replace(/\r\n/g, '\n').trim(); }

export function sanitizeInterview(interview) {
  const value = interview.toObject ? interview.toObject() : interview;
  const testCases = value.testCases || [];
  delete value.testCases;
  value.publicTestCases = testCases.filter((test) => !test.hidden).map(({ input, expectedOutput }) => ({ input, expectedOutput }));
  return value;
}




