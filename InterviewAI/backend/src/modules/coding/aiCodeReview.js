import GeminiClient from '../../lib/geminiClient.js';
import { zodTextFormat } from '../../lib/geminiClient.js';
import { z } from 'zod';
import { buildReviewPrompt } from './promptTemplates.js';

const reviewSchema = z.object({
  logicScore: z.number().min(0).max(100),
  readabilityScore: z.number().min(0).max(100),
  namingScore: z.number().min(0).max(100),
  optimizationScore: z.number().min(0).max(100),
  timeComplexity: z.string(),
  spaceComplexity: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
});

export async function reviewCode(context) {
  if (!process.env.GEMINI_API_KEY) {
    if (process.env.NODE_ENV !== 'production') return createLocalReview(context);
    const error = new Error('AI code review service is not configured'); error.status = 503; error.expose = true; error.code = 'AI_NOT_CONFIGURED'; throw error;
  }
  const client = new GeminiClient({ apiKey: process.env.GEMINI_API_KEY, timeout: 45_000, maxRetries: 2 });
  try {
    const response = await client.responses.parse({
      model: process.env.GEMINI_MODEL,
      input: [{ role: 'system', content: 'You are a rigorous coding interview reviewer. Use only supplied evidence and follow the output schema exactly.' }, { role: 'user', content: buildReviewPrompt(context) }],
      text: { format: zodTextFormat(reviewSchema, 'coding_review') },
    });
    if (!response.output_parsed) throw new Error('The AI response did not contain a valid code review');
    return Object.fromEntries(Object.entries(response.output_parsed).map(([key, value]) => [key, typeof value === 'number' ? Math.round(value) : value]));
  } catch (cause) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Gemini code review failed; using local fallback.', { status: cause?.status, requestId: cause?.request_id });
      return createLocalReview(context);
    }
    const timedOut = cause.code === 'ETIMEDOUT' || cause.code === 'ECONNABORTED' || cause.name === 'APIConnectionTimeoutError';
    const error = new Error(timedOut ? 'AI code review timed out. Please try again.' : 'AI code review is temporarily unavailable. Please try again.');
    error.status = timedOut ? 504 : 503;
    error.expose = true;
    error.code = timedOut ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
}

function createLocalReview({ code, testSummary }) {
  const correctness = testSummary.correctness;
  const hasComments = /\/\/|\/\*|#/.test(code);
  const readableLines = code.split('\n').filter((line) => line.trim()).length <= 100;
  return {
    logicScore: correctness,
    readabilityScore: readableLines ? 80 : 65,
    namingScore: 75,
    optimizationScore: correctness === 100 ? 80 : 65,
    timeComplexity: 'Not determined by the local reviewer',
    spaceComplexity: 'Not determined by the local reviewer',
    strengths: [correctness === 100 ? 'Passed all configured test cases.' : `Passed ${testSummary.passedCount} of ${testSummary.totalCount} configured test cases.`, ...(hasComments ? ['Includes explanatory comments.'] : [])],
    improvements: correctness === 100 ? ['Review edge cases and complexity before production use.'] : ['Fix failing test cases and verify input/output formatting.'],
  };
}




