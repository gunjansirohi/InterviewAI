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
  const responses = Array.isArray(transcript) ? transcript.filter((item) => typeof item?.answer === 'string' && item.answer.trim()) : [];
  const responseEvidence = responses.map(scoreResponseEvidence);
  const count = responseEvidence.length;
  const average = (key) => count ? responseEvidence.reduce((total, item) => total + item[key], 0) / count : 0;
  const relevance = average('relevance');
  const depth = average('depth');
  const reasoning = average('reasoning');
  const technicalEvidence = average('technicalEvidence');
  const structuredCommunication = average('structuredCommunication');
  const technicalScore = clamp(Math.round(interviewType === 'behavioral' ? relevance * 0.7 + reasoning * 0.3 : technicalEvidence * 0.65 + relevance * 0.35));
  const communicationScore = clamp(Math.round(relevance * 0.35 + depth * 0.35 + structuredCommunication * 0.3));
  const problemSolvingScore = clamp(Math.round(relevance * 0.4 + reasoning * 0.35 + structuredCommunication * 0.15 + technicalEvidence * 0.1));
  const confidenceScore = clamp(Math.round(relevance * 0.45 + depth * 0.25 + reasoning * 0.3));
  const answerQualityScore = clamp(Math.round(relevance * 0.5 + depth * 0.25 + reasoning * 0.25));
  const irrelevant = !count || relevance === 0;
  const strongTechnicalEvidence = interviewType !== 'behavioral' && relevance >= 20 && technicalEvidence >= 70 && depth >= 60;
  const scores = [technicalScore, communicationScore, problemSolvingScore, confidenceScore, answerQualityScore]
    .map((score) => irrelevant ? Math.min(score, 20) : clamp(score + (strongTechnicalEvidence ? 15 : 0)));
  const [strictTechnicalScore, strictCommunicationScore, strictProblemSolvingScore, strictConfidenceScore, strictAnswerQualityScore] = scores;
  const overallScore = clamp(Math.round(scores.reduce((total, score) => total + score, 0) / scores.length));
  const topics = responses.map((item) => item.question || 'the interview question').slice(0, 2).join('; ');
  const hasEvidence = relevance >= 35 && (technicalEvidence >= 35 || reasoning >= 35);
  return validateEvaluation({
    overallScore, technicalScore: strictTechnicalScore, communicationScore: strictCommunicationScore, problemSolvingScore: strictProblemSolvingScore, confidenceScore: strictConfidenceScore, answerQualityScore: strictAnswerQualityScore,
    strengths: hasEvidence ? [`Relevant evidence was provided for: ${topics}.`] : [],
    weaknesses: [!count ? 'No answer was submitted, so there is no evidence to assess.' : relevance < 20 ? `The response did not address the question: ${topics}.` : depth < 45 ? `The response to ${topics} is too brief to establish correctness or depth.` : `The response to ${topics} needs more explicit justification and trade-offs.`],
    suggestions: [!count ? 'Submit a direct answer to each question before requesting feedback.' : relevance < 20 ? `Answer ${topics} directly and explain the relevant approach.` : `For ${topics}, explain the reasoning, implementation details, and trade-offs that support the answer.`],
  });
}

function scoreResponseEvidence({ question = '', answer = '' }) {
  const questionTerms = meaningfulTerms(question);
  const answerTerms = meaningfulTerms(answer);
  const overlap = questionTerms.filter((term) => answerTerms.includes(term)).length;
  const domainSignals = domainSignalCount(answer);
  // Direct question terms are strongest evidence of relevance; domain evidence
  // can support a technical answer but cannot make unrelated prose pass.
  const relevance = questionTerms.length ? Math.min(100, Math.round((overlap / Math.min(questionTerms.length, 3)) * 100) + Math.min(40, domainSignals * 8)) : 0;
  const answerWordCount = answerTerms.length;
  const technicalEvidence = Math.min(100, domainSignals * 14);
  const reasoning = Math.min(100, reasoningSignalCount(answer) * 20);
  const structuredCommunication = Math.min(100, structureSignalCount(answer) * 25);
  return { relevance, technicalEvidence, reasoning, structuredCommunication, depth: Math.min(100, answerWordCount * 2.5) };
}

function meaningfulTerms(value) {
  const stopWords = new Set(['about', 'after', 'again', 'answer', 'being', 'could', 'does', 'each', 'from', 'have', 'into', 'that', 'this', 'would', 'with', 'your', 'what', 'when', 'where', 'which', 'will', 'how', 'why', 'the', 'and', 'for', 'are', 'you']);
  return [...new Set(String(value).toLowerCase().split(/[^a-z0-9+#]+/).filter((term) => term.length >= 3))].filter((term) => !stopWords.has(term));
}

function domainSignalCount(answer) { return (String(answer).toLowerCase().match(/\b(api|database|algorithm|system|test|performance|security|architecture|code|data|cache|validation|authentication|authorization|schema|deployment|monitoring)\b/g) || []).length; }
function reasoningSignalCount(answer) { return (String(answer).toLowerCase().match(/\b(because|therefore|trade-?off|first|then|result|approach|consider|validate|compare|measure)\b/g) || []).length; }
function structureSignalCount(answer) { return (String(answer).toLowerCase().match(/\b(first|second|then|finally|because|for example|for instance|so that)\b/g) || []).length; }

function clamp(value) { return Math.max(0, Math.min(100, value)); }




