import GeminiClient from '../../lib/geminiClient.js';
import { zodTextFormat } from '../../lib/geminiClient.js';
import { z } from 'zod';

const improvedSectionSchema = z.object({ improvedContent: z.string() });

function normalizeImprovedSection(value) {
  if (typeof value === 'string') return { improvedContent: value };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const improvedContent = value.improvedContent ?? value.improved_content ?? value.content ?? value.improvement ?? value.rewrittenContent ?? value.rewritten_content;
  return typeof improvedContent === 'string' ? { ...value, improvedContent } : value;
}

function providerError(cause) {
  const providerStatus = Number(cause?.status || cause?.response?.status);
  const providerCode = cause?.code || cause?.error?.code;
  let status = 500;
  let message = 'Resume improvement failed because the AI provider returned an invalid or unavailable response.';
  let code = 'RESUME_IMPROVEMENT_PROVIDER_FAILED';

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
  error.providerCode = providerCode;
  error.requestId = cause?.request_id || cause?.headers?.['x-request-id'];
  error.expose = true;
  return error;
}

export async function improveSection({ sectionType, content, targetRole, client }) {
  if (!client && !process.env.GEMINI_API_KEY) {
    const error = new Error('AI resume writing service is not configured');
    error.status = 500;
    error.code = 'AI_PROVIDER_NOT_CONFIGURED';
    error.provider = 'gemini';
    error.expose = true;
    throw error;
  }
  const aiClient = client || new GeminiClient({ apiKey: process.env.GEMINI_API_KEY });
  try {
    console.info('[resume-studio-improve-provider-config]', {
      provider: 'gemini',
      apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      configuredModel: String(process.env.GEMINI_MODEL || '').trim() || 'auto-discovery',
    });
    const input = [
      { role: 'system', content: 'Rewrite resume content professionally and truthfully. Preserve all factual claims and never invent metrics, skills, employers, or outcomes.' },
      { role: 'user', content: `Improve this ${sectionType} section for the target role "${targetRole || 'not specified'}". Use concise ATS-friendly language and strong action verbs. Return exactly this JSON object, with no other keys or text: {"improvedContent":"the improved resume content"}.\n\nContent:\n${content}` },
    ];
    console.info('[resume-studio-improve-provider-prompt]', { provider: 'gemini', input });
    const response = await aiClient.responses.parse({
      model: process.env.GEMINI_MODEL,
      input,
      text: { format: zodTextFormat(improvedSectionSchema, 'improved_resume_section') },
      normalize: normalizeImprovedSection,
    });
    console.info('[resume-studio-improve-provider-response]', { provider: 'gemini', response });
    const improvedContent = response?.output_parsed?.improvedContent;
    if (typeof improvedContent !== 'string' || !improvedContent.trim()) {
      const error = new Error('The AI response did not contain non-empty improved content');
      error.code = 'AI_MALFORMED_RESPONSE';
      throw error;
    }
    return improvedContent.trim();
  } catch (cause) {
    console.error('[resume-studio-improve-provider-failed]', {
      provider: 'gemini',
      status: cause?.status || cause?.response?.status,
      code: cause?.code || cause?.error?.code,
      message: cause?.message,
      stack: cause?.stack,
      responsePreview: cause?.responsePreview,
    });
    throw providerError(cause);
  }
}




