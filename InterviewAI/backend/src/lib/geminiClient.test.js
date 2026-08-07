import assert from 'node:assert/strict';
import test from 'node:test';
import GeminiClient from './geminiClient.js';

test('model discovery validates generateContent and falls back from an unavailable configured model', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  const originalError = console.error;
  const originalConfiguredModel = process.env.GEMINI_MODEL;
  const logs = [];
  const attemptedModels = [];

  process.env.GEMINI_MODEL = 'models/unavailable-generator';
  globalThis.fetch = async (url) => {
    assert.equal(url.pathname, '/v1beta/models');
    assert.equal(url.searchParams.get('key'), 'test-key');
    return new Response(JSON.stringify({ models: [
      { name: 'models/embedding-only', supportedGenerationMethods: ['embedContent'] },
      { name: 'models/unavailable-generator', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/available-generator', supportedGenerationMethods: ['countTokens', 'generateContent'] },
    ] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const fakeSdkClient = {
    getGenerativeModel: ({ model }) => ({
      generateContent: async () => {
        attemptedModels.push(model);
        if (model === 'unavailable-generator') throw Object.assign(new Error('Model is unavailable'), { status: 404 });
        return { response: { text: () => 'OK' } };
      },
    }),
  };
  console.info = (...args) => logs.push(args);
  console.error = () => undefined;
  t.after(() => {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
    console.error = originalError;
    if (originalConfiguredModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalConfiguredModel;
  });

  const client = new GeminiClient({ apiKey: 'test-key', client: fakeSdkClient });
  assert.equal(await client.discoverModel(), 'available-generator');
  assert.deepEqual(attemptedModels, ['unavailable-generator', 'available-generator']);
  assert.ok(logs.some(([message]) => message === 'Available Gemini models:'));
  assert.ok(logs.some(([message, model]) => message === 'Selected Gemini model:' && model === 'available-generator'));
});
