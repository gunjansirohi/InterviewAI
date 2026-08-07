import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeForAts, atsSchema, normalizeAtsAnalysis } from './atsAnalyzer.js';

const resume = { personalInfo: { name: 'Example Candidate' }, summary: 'Built web applications.', skills: ['React', 'Node.js'] };

function fakeClient(result) {
  return { responses: { parse: async () => result } };
}

test('normalizes compatible AI ATS fields before validation', () => {
  const parsed = atsSchema.parse(normalizeAtsAnalysis({
    atsScore: '78',
    missing_keywords: ['TypeScript', 42, 'TypeScript'],
    strengths: ['Clear summary'],
    suggestions: ['Add metrics'],
  }));
  assert.deepEqual(parsed, { overallScore: 78, missingKeywords: ['TypeScript'], strengths: ['Clear summary'], improvements: ['Add metrics'] });
});

test('returns the ATS analysis format consumed by the frontend', async () => {
  const analysis = await analyzeForAts({
    resume, targetRole: 'Developer', jobDescription: '',
    client: fakeClient({ output_parsed: { overallScore: 78.4, missingKeywords: ['TypeScript'], strengths: ['Clear summary'], improvements: ['Add metrics'] } }),
  });
  assert.deepEqual(analysis, { overallScore: 78, missingKeywords: ['TypeScript'], strengths: ['Clear summary'], improvements: ['Add metrics'] });
});

test('maps AI provider rate limits to 429 instead of a generic 502', async () => {
  const client = { responses: { parse: async () => { throw Object.assign(new Error('quota exceeded'), { status: 429 }); } } };
  await assert.rejects(
    () => analyzeForAts({ resume, targetRole: 'Developer', jobDescription: '', client }),
    (error) => error.status === 429 && error.code === 'AI_PROVIDER_RATE_LIMITED',
  );
});
