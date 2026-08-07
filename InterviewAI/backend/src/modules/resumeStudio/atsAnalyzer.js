import GeminiClient from '../../lib/geminiClient.js';
import { zodTextFormat } from '../../lib/geminiClient.js';
import { z } from 'zod';

export const atsSchema = z.object({
  overallScore: z.number().min(0).max(100),
  missingKeywords: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
});

function stringList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean))];
}

export function normalizeAtsAnalysis(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const score = value.overallScore ?? value.atsScore ?? value.score;
  const overallScore = typeof score === 'string' && score.trim() ? Number(score) : score;
  return {
    ...value,
    overallScore,
    missingKeywords: stringList(value.missingKeywords ?? value.missing_keywords ?? value.keywordsMissing),
    strengths: stringList(value.strengths),
    improvements: stringList(value.improvements ?? value.suggestions ?? value.recommendations),
  };
}

function providerError(cause) {
  const providerStatus = Number(cause?.status || cause?.response?.status);
  let status = 500;
  let message = 'ATS analysis failed because the AI provider returned an invalid or unavailable response.';
  let code = 'ATS_ANALYSIS_PROVIDER_FAILED';
  if (providerStatus === 401 || providerStatus === 403) {
    status = 401;
    message = 'AI provider authentication failed. Check the server GEMINI_API_KEY.';
    code = 'AI_PROVIDER_AUTHENTICATION_FAILED';
  } else if (providerStatus === 429) {
    status = 429;
    message = 'AI provider quota is exhausted or rate-limited. Please try again shortly.';
    code = 'AI_PROVIDER_RATE_LIMITED';
  }
  const error = new Error(message, { cause });
  error.status = status;
  error.code = code;
  error.provider = 'gemini';
  error.requestId = cause?.request_id || cause?.headers?.['x-request-id'];
  error.expose = true;
  return error;
}

export async function analyzeForAts({ resume, targetRole, jobDescription, client }) {
  if (!resume || typeof resume !== 'object') {
    const error = new Error('A saved resume is required for ATS analysis.');
    error.status = 404;
    error.code = 'RESUME_NOT_FOUND';
    error.expose = true;
    throw error;
  }
  if (!client && !process.env.GEMINI_API_KEY) {
    const error = new Error('ATS analysis service is not configured');
    error.status = 500;
    error.code = 'AI_PROVIDER_NOT_CONFIGURED';
    error.provider = 'gemini';
    error.expose = true;
    throw error;
  }
  const resumeData = resume.toObject ? resume.toObject() : resume;
  const aiClient = client || new GeminiClient({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const input = [
      { role: 'system', content: 'You are a rigorous ATS resume analyst. Evaluate only supplied evidence, provide role-relevant keywords, and follow the output schema exactly.' },
      { role: 'user', content: `Analyze this resume for the target role "${targetRole}". ${jobDescription ? `Compare it with this job description: ${jobDescription}` : 'Use common role requirements without claiming a specific employer requirement.'}\nScore formatting, keyword alignment, specificity, completeness, and readability from 0 to 100. Suggest only truthful keywords the candidate should add when supported by their actual background. Return exactly this JSON object: {"overallScore":0,"missingKeywords":[],"strengths":[],"improvements":[]}.\nResume data (evidence only):\n${JSON.stringify(resumeData)}` },
    ];
    console.info('[resume-studio-ats-provider-config]', { provider: 'gemini', apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY), configuredModel: String(process.env.GEMINI_MODEL || '').trim() || 'auto-discovery' });
    console.info('[resume-studio-ats-provider-prompt]', { provider: 'gemini', input });
    const response = await aiClient.responses.parse({
      model: process.env.GEMINI_MODEL,
      input,
      text: { format: zodTextFormat(atsSchema, 'ats_analysis') },
      normalize: normalizeAtsAnalysis,
    });
    console.info('[resume-studio-ats-provider-response]', { provider: 'gemini', response });
    if (!response.output_parsed) throw new Error('The AI response did not contain a valid ATS analysis');
    return { ...response.output_parsed, overallScore: Math.round(response.output_parsed.overallScore) };
  } catch (cause) {
    console.error('[resume-studio-ats-provider-failed]', { provider: 'gemini', status: cause?.status || cause?.response?.status, code: cause?.code || cause?.error?.code, message: cause?.message, stack: cause?.stack, responsePreview: cause?.responsePreview });
    throw providerError(cause);
  }
}




