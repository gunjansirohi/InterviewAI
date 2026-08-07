import assert from 'node:assert/strict';
import test from 'node:test';
import { improveSection } from './aiResumeWriter.js';

function fakeClient(result) {
  return { responses: { parse: async () => result } };
}

test('returns the non-empty improved content expected by the Resume Studio frontend', async () => {
  const improvedContent = await improveSection({
    sectionType: 'summary', content: 'Built web apps.', targetRole: 'Developer',
    client: fakeClient({ output_parsed: { improvedContent: 'Built reliable web applications.' } }),
  });
  assert.equal(improvedContent, 'Built reliable web applications.');
});

test('maps AI authentication and rate-limit failures to meaningful statuses', async () => {
  await assert.rejects(
    () => improveSection({ sectionType: 'summary', content: 'Text', targetRole: '', client: fakeClient(Promise.reject(Object.assign(new Error('bad key'), { status: 401 }))) }),
    (error) => error.status === 401 && error.code === 'AI_PROVIDER_AUTHENTICATION_FAILED',
  );
  await assert.rejects(
    () => improveSection({ sectionType: 'summary', content: 'Text', targetRole: '', client: { responses: { parse: async () => { throw Object.assign(new Error('limited'), { status: 429 }); } } } }),
    (error) => error.status === 429 && error.code === 'AI_PROVIDER_RATE_LIMITED',
  );
});

test('rejects malformed or empty AI responses as an internal provider error', async () => {
  await assert.rejects(
    () => improveSection({ sectionType: 'summary', content: 'Text', targetRole: '', client: fakeClient({ output_parsed: { improvedContent: '   ' } }) }),
    (error) => error.status === 500 && error.code === 'RESUME_IMPROVEMENT_PROVIDER_FAILED',
  );
});
