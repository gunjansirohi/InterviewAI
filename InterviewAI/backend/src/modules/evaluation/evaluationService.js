import GeminiClient from '../../lib/geminiClient.js';
import { zodTextFormat } from '../../lib/geminiClient.js';
import { buildEvaluationPrompt } from './promptTemplates.js';
import { evaluationSchema, validateEvaluation } from './scoringEngine.js';

export async function evaluateTranscript(context) {
  if (!process.env.GEMINI_API_KEY) {
    if (process.env.NODE_ENV !== 'production') return createLocalEvaluation(context);
    const error = new Error('Interview evaluation service is not configured'); error.status = 503; error.expose = true; error.code = 'AI_NOT_CONFIGURED'; throw error;
  }

  const client = new GeminiClient({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await client.responses.parse({
      model: process.env.GEMINI_MODEL,
      input: [
        { role: 'system', content: 'You are a rigorous, fair interview evaluator. Score only from transcript evidence and follow the output schema exactly.' },
        { role: 'user', content: buildEvaluationPrompt(context) },
      ],
      text: { format: zodTextFormat(evaluationSchema, 'interview_evaluation') },
    });
    if (!response.output_parsed) throw new Error('The AI response did not contain a valid evaluation');
    return validateEvaluation(response.output_parsed);
  } catch (cause) {
    const providerStatus = Number(cause?.status);
    const requestId = cause?.request_id || cause?.headers?.['x-request-id'];
    console.error('[evaluation-provider-failed]', { provider: 'gemini', status: providerStatus, code: cause?.code, requestId, message: cause?.message });
    if (process.env.NODE_ENV !== 'production') return createLocalEvaluation(context);
    let message = 'Interview evaluation provider is temporarily unavailable. Please try again.';
    let status = 502;
    let code = 'AI_UNAVAILABLE';
    if (providerStatus === 401 || providerStatus === 403) { message = 'Interview evaluation authentication failed. Check GEMINI_API_KEY.'; status = 503; code = 'AI_AUTH_FAILED'; }
    else if (providerStatus === 429) { message = cause?.code === 'credit_balance_exhausted' ? 'Interview evaluation has no remaining Gemini quota. Add billing credits or try later.' : 'Interview evaluation is rate-limited. Please try again later.'; status = 503; code = cause?.code === 'credit_balance_exhausted' ? 'AI_CREDITS_EXHAUSTED' : 'AI_RATE_LIMITED'; }
    else if (providerStatus === 400 || providerStatus === 404) { message = `Interview evaluation model "${process.env.GEMINI_MODEL}" is unavailable for this API key.`; status = 503; code = 'AI_MODEL_UNAVAILABLE'; }
    const error = new Error(message);
    error.status = status;
    error.expose = true;
    error.code = code;
    error.provider = 'gemini';
    error.requestId = requestId;
    error.cause = cause;
    throw error;
  }
}

export function createLocalEvaluation({ interviewType, transcript }) {
  const answers = transcript.map((item) => item.answer.trim());
  const words = answers.map((answer) => answer.split(/\s+/).filter(Boolean));
  const averageWords = words.reduce((total, answerWords) => total + answerWords.length, 0) / Math.max(words.length, 1);
  const combined = answers.join(' ').toLowerCase();
  const reasoningSignals = (combined.match(/\b(because|therefore|trade-?off|first|then|result|approach|consider)\b/g) || []).length;
  const technicalSignals = (combined.match(/\b(api|database|algorithm|system|test|performance|security|architecture|code|data)\b/g) || []).length;
  const communicationScore = clamp(Math.round(45 + Math.min(averageWords, 35) * 1.2));
  const problemSolvingScore = clamp(Math.round(45 + Math.min(reasoningSignals, 12) * 4));
  const technicalBase = interviewType === 'behavioral' ? 60 : 45;
  const technicalScore = clamp(Math.round(technicalBase + Math.min(technicalSignals, 12) * 4));
  const overallScore = Math.round((technicalScore + communicationScore + problemSolvingScore) / 3);
  const confidenceScore = clamp(Math.round(40 + Math.min(averageWords, 30) * 1.5 + Math.min(reasoningSignals, 5) * 3));
  const answerQualityScore = clamp(Math.round((technicalScore + communicationScore + problemSolvingScore) / 3));
  return validateEvaluation({
    overallScore, technicalScore, communicationScore, problemSolvingScore, confidenceScore, answerQualityScore,
    strengths: [averageWords >= 15 ? 'Answers provide useful detail and context.' : 'All interview questions were completed.', reasoningSignals >= 2 ? 'Responses show a structured reasoning process.' : 'Responses stay focused on the questions.'],
    weaknesses: [averageWords < 15 ? 'Some answers are too brief to demonstrate depth.' : 'Some claims could use more measurable evidence.', technicalSignals < 2 && interviewType !== 'behavioral' ? 'Technical answers need more concrete implementation detail.' : 'Trade-offs could be explained more explicitly.'],
    suggestions: ['Use the STAR structure or a similarly clear framework.', 'Include concrete examples, outcomes, and measurable impact.', ...(interviewType !== 'behavioral' ? ['Explain technical trade-offs, testing, and failure handling.'] : [])],
  });
}

function clamp(value) { return Math.max(0, Math.min(100, value)); }




