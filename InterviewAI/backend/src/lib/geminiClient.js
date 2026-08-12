import { readFile } from 'node:fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { toJSONSchema } from 'zod';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
let cachedModel;

function toGeminiResponseSchema(jsonSchema) {
  if (!jsonSchema || typeof jsonSchema !== 'object') return undefined;

  const schema = {};
  for (const key of ['type', 'description', 'format', 'nullable', 'enum', 'minimum', 'maximum', 'minItems', 'maxItems']) {
    if (jsonSchema[key] !== undefined) schema[key] = jsonSchema[key];
  }
  if (jsonSchema.properties) {
    schema.properties = Object.fromEntries(Object.entries(jsonSchema.properties)
      .map(([key, value]) => [key, toGeminiResponseSchema(value)]));
  }
  if (jsonSchema.items) schema.items = toGeminiResponseSchema(jsonSchema.items);
  if (Array.isArray(jsonSchema.required)) schema.required = jsonSchema.required;
  return schema;
}

export function zodTextFormat(schema) {
  return {
    parse: (value) => schema.parse(value),
    responseSchema: toGeminiResponseSchema(toJSONSchema(schema)),
  };
}

export function normalizeGeminiModelName(value = '') {
  return String(value).trim().replace(/^models\/+?/i, '');
}

function statusFrom(error) {
  const directStatus = Number(error?.status || error?.response?.status);
  if (directStatus) return directStatus;
  const statusInMessage = String(error?.message || '').match(/(?:\[|\b)([45]\d{2})(?:\s|\]|\b)/)?.[1];
  return statusInMessage ? Number(statusInMessage) : undefined;
}

function safeErrorMessage(error) {
  return String(error?.message || 'Unknown Gemini API error')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(process.env.GEMINI_API_KEY || /$^/, '[REDACTED]');
}
function modelPriority(model, configuredModelName) {
  const name = normalizeGeminiModelName(model.name);
  if (name === configuredModelName) return -100;
  if (name === 'gemini-flash-latest') return 0;
  if (name === 'gemini-pro-latest') return 1;
  if (/^gemini-[\d.]+-flash(?:-lite)?$/.test(name)) return 2;
  if (/^gemini-/.test(name) && !/(?:tts|image|audio|live|robotics|computer-use|research)/.test(name)) return 5;
  if (/^gemma-/.test(name)) return 20;
  return 50;
}

function supportsTextGeneration(model) {
  const name = normalizeGeminiModelName(model.name);
  return model.supportedGenerationMethods?.includes('generateContent')
    && !/(?:tts|image|audio|live|robotics|computer-use|research)/i.test(name);
}

function parseJsonResponse(responseText) {
  const cleaned = responseText.trim();
  try {
    return JSON.parse(cleaned);
  } catch (initialError) {
    const error = new Error(`Gemini response must contain only valid JSON: ${initialError.message}`);
    error.code = 'GEMINI_INVALID_JSON_RESPONSE';
    error.responsePreview = cleaned.slice(0, 500);
    throw error;
  }
}

function validateGeminiConfiguration(modelName, { requireModel = true, apiKey = process.env.GEMINI_API_KEY } = {}) {
  console.info('[gemini-configuration]', {
    apiKeyConfigured: Boolean(apiKey),
    configuredModel: normalizeGeminiModelName(process.env.GEMINI_MODEL) || 'auto-discovery',
    selectedModel: modelName || null,
  });
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not loaded');
    error.status = 503;
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }
  if (requireModel && (typeof modelName !== 'string' || !modelName.trim())) {
    const error = new Error('Gemini model name is empty or undefined');
    error.status = 503;
    error.code = 'GEMINI_MODEL_NOT_CONFIGURED';
    throw error;
  }
}

function normalizeError(error, { operation, model }) {
  error.status = statusFrom(error);
  if (!error.code) {
    const message = String(error.message || '');
    if (/quota|rate limit|resource exhausted/i.test(message)) error.code = 'rate_limit_exceeded';
    else if (/API key|permission denied|unauthenticated/i.test(message)) error.code = 'authentication_error';
    else if (/timeout|timed out/i.test(message)) error.code = 'ETIMEDOUT';
  }
  console.error('[gemini-api-failed]', {
    provider: 'gemini', model, operation, status: error.status, code: error.code,
    message: safeErrorMessage(error),
  });
  return error;
}

async function listGeminiModels(apiKey) {
  const models = [];
  let pageToken;
  do {
    const url = new URL(`${GEMINI_API_BASE_URL}/models`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url);
    console.info('[gemini-api-response]', { operation: 'list-models', status: response.status });
    if (!response.ok) {
      const body = await response.text();
      const error = new Error(`Gemini ListModels failed (${response.status}): ${body}`);
      error.status = response.status;
      error.code = 'GEMINI_LIST_MODELS_FAILED';
      throw error;
    }

    const body = await response.json();
    models.push(...(body.models || []));
    pageToken = body.nextPageToken;
  } while (pageToken);
  return models;
}

export default class GeminiClient {
  constructor({ apiKey, client } = {}) {
    if (!apiKey) {
      const error = new Error('GEMINI_API_KEY is not loaded');
      error.status = 503;
      error.code = 'AI_NOT_CONFIGURED';
      throw error;
    }
    this.apiKey = apiKey;
    this.client = client || new GoogleGenerativeAI(apiKey);
    console.info('[gemini-client-initialized]', { apiKeyConfigured: Boolean(apiKey), sdk: '@google/generative-ai' });
    this.responses = { parse: (request) => this.parse(request) };
    this.audio = { transcriptions: { create: (request) => this.transcribe(request) } };
  }

  async discoverModel() {
    validateGeminiConfiguration(cachedModel, { requireModel: false, apiKey: this.apiKey });
    if (cachedModel) {
      console.info('Selected Gemini model:', cachedModel);
      return cachedModel;
    }
    try {
      const models = await listGeminiModels(this.apiKey);
      console.info('Available Gemini models:', models.map(({ name, supportedGenerationMethods = [] }) => ({
        name, supportedMethods: supportedGenerationMethods,
      })));

      const configuredModelName = normalizeGeminiModelName(process.env.GEMINI_MODEL);
      const generateContentModels = models
        .filter(supportsTextGeneration)
        .sort((left, right) => modelPriority(left, configuredModelName) - modelPriority(right, configuredModelName));
      if (!generateContentModels.length) {
        const error = new Error('Gemini ListModels returned no model supporting generateContent');
        error.status = 503;
        error.code = 'GEMINI_NO_GENERATE_CONTENT_MODEL';
        throw error;
      }

      const configuredModel = generateContentModels.find(({ name }) => normalizeGeminiModelName(name) === configuredModelName);
      const candidates = configuredModel
        ? [configuredModel, ...generateContentModels.filter((item) => item !== configuredModel)]
        : generateContentModels;
      const failures = [];

      for (const candidate of candidates) {
        const candidateName = normalizeGeminiModelName(candidate.name);
        if (!candidateName) continue;
        try {
          const model = this.client.getGenerativeModel({ model: candidateName });
          await model.generateContent('Reply with exactly OK.');
          console.info('[gemini-api-response]', { operation: 'model-validation', model: candidateName, status: 200 });
          cachedModel = candidateName;
          console.info('Selected Gemini model:', cachedModel);
          return cachedModel;
        } catch (cause) {
          const error = normalizeError(cause, { operation: 'model-validation', model: candidateName });
          failures.push({ model: candidateName, status: error.status, code: error.code, message: safeErrorMessage(error) });
        }
      }

      const details = failures.map(({ model, status, message }) => `${model} (${status || 'unknown'}): ${message}`).join('; ');
      const error = new Error(`No listed Gemini model could generate content. ${details}`);
      error.status = failures.at(-1)?.status || 503;
      error.code = 'GEMINI_NO_AVAILABLE_MODEL';
      error.modelFailures = failures;
      throw error;
    } catch (cause) {
      throw normalizeError(cause, { operation: 'model-discovery', model: normalizeGeminiModelName(process.env.GEMINI_MODEL) || 'auto-discovery' });
    }
  }

  async parse({ input, text, normalize }) {
    const modelName = await this.discoverModel();
    validateGeminiConfiguration(modelName, { apiKey: this.apiKey });
    const prompt = input.map(({ role, content }) => `${role.toUpperCase()}:\n${content}`).join('\n\n');
    try {
      const generationConfig = {
        responseMimeType: 'application/json',
        // Schema-constrained JSON prevents malformed partial JSON responses. The
        // parser and Zod validation below remain the safety boundary.
        ...(text?.format?.responseSchema ? { responseSchema: text.format.responseSchema } : {}),
      };
      const model = this.client.getGenerativeModel({ model: modelName, generationConfig });
      const result = await model.generateContent(`${prompt}\n\nReturn only one valid JSON value matching the requested structure. Do not include Markdown, code fences, explanations, or any text outside the JSON.`);
      const responseText = result.response.text();
      console.info('[gemini-api-response]', { operation: 'structured-generation', model: modelName, status: 200, responseCharacters: responseText.length });
      const parsed = parseJsonResponse(responseText);
      // Providers occasionally return a valid JSON shape that needs small
      // compatibility cleanup before the caller's validation schema runs.
      const normalized = typeof normalize === 'function' ? normalize(parsed) : parsed;
      try {
        return { output_parsed: text?.format?.parse ? text.format.parse(normalized) : normalized };
      } catch (error) {
        // Keep enough non-secret provider output for callers to diagnose schema mismatches.
        error.responsePreview = responseText.slice(0, 1000);
        throw error;
      }
    } catch (cause) {
      cachedModel = undefined;
      throw normalizeError(cause, { operation: 'structured-generation', model: modelName });
    }
  }

  async transcribe({ file }) {
    const modelName = await this.discoverModel();
    try {
      const data = await readFile(file.path);
      const model = this.client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        'Transcribe this audio accurately. Return only the spoken words, without commentary or formatting.',
        { inlineData: { data: data.toString('base64'), mimeType: file.mimetype || 'audio/webm' } },
      ]);
      return { text: result.response.text() };
    } catch (cause) {
      cachedModel = undefined;
      throw normalizeError(cause, { operation: 'audio-transcription', model: modelName });
    }
  }
}

export async function testGeminiConnection() {
  const client = new GeminiClient({ apiKey: process.env.GEMINI_API_KEY });
  const model = await client.discoverModel();
  return { connected: true, model };
}









