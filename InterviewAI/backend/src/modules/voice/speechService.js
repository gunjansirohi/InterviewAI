import { createReadStream } from 'node:fs';
import GeminiClient from '../../lib/geminiClient.js';

export async function transcribeAudio(file) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('Voice transcription service is not configured. Set GEMINI_API_KEY or type the transcript manually.');
    error.status = 503;
    error.expose = true;
    error.code = 'AI_NOT_CONFIGURED';
    error.provider = 'gemini';
    throw error;
  }

  const client = new GeminiClient({ apiKey: process.env.GEMINI_API_KEY, timeout: 45000, maxRetries: 1 });
  try {
    const transcription = await client.audio.transcriptions.create({
      file: createReadStream(file.path),
      model: process.env.GEMINI_MODEL,
    });
    const transcript = transcription.text?.trim();
    if (!transcript) {
      const error = new Error('No speech could be recognized in the recording');
      error.status = 422;
      throw error;
    }
    return transcript;
  } catch (cause) {
    if (cause.status === 422) throw cause;
    const providerStatus = Number(cause?.status);
    const requestId = cause?.request_id || cause?.headers?.['x-request-id'];
    console.error('[voice-transcription-provider-failed]', { provider: 'gemini', status: providerStatus, code: cause?.code, requestId, message: cause?.message });
    let message = 'Voice transcription provider is temporarily unavailable. You can type the transcript manually.';
    let status = 502;
    let code = 'TRANSCRIPTION_UNAVAILABLE';
    if (providerStatus === 401 || providerStatus === 403) { message = 'Voice transcription authentication failed. Check GEMINI_API_KEY, or type the transcript manually.'; status = 503; code = 'AI_AUTH_FAILED'; }
    else if (providerStatus === 429) { message = cause?.code === 'credit_balance_exhausted' ? 'Voice transcription has no remaining Gemini quota. Add billing credits or type the transcript manually.' : 'Voice transcription is rate-limited. Try later or type the transcript manually.'; status = 503; code = cause?.code === 'credit_balance_exhausted' ? 'AI_CREDITS_EXHAUSTED' : 'AI_RATE_LIMITED'; }
    else if (providerStatus === 400 || providerStatus === 404) { message = `Voice transcription model "${process.env.GEMINI_MODEL}" is unavailable. You can type the transcript manually.`; status = 503; code = 'AI_MODEL_UNAVAILABLE'; }
    else if (cause?.code === 'ETIMEDOUT' || cause?.code === 'ECONNABORTED') { message = 'Voice transcription timed out. Please try again or type the transcript manually.'; status = 504; code = 'TRANSCRIPTION_TIMEOUT'; }
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




