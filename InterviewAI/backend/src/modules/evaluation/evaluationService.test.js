import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalEvaluation, evaluateTranscript } from './evaluationService.js';
import { buildEvaluationTranscript } from './reportGenerator.js';

const context = {
  role: 'Software Engineer',
  interviewType: 'technical',
  difficulty: 'medium',
  transcript: [
    { question: 'How would you design an API?', category: 'technical', difficulty: 'medium', answer: 'First I would define the data model and API contract, then add tests because failure handling and security are important.' },
    { question: 'How would you debug it?', category: 'technical', difficulty: 'medium', answer: 'I would inspect logs, reproduce the result, test each system boundary, and therefore isolate the failing component.' },
  ],
};

test('local evaluation returns valid scores and feedback', () => {
  const evaluation = createLocalEvaluation(context);
  for (const score of [evaluation.overallScore, evaluation.technicalScore, evaluation.communicationScore, evaluation.problemSolvingScore]) assert.ok(score >= 0 && score <= 100);
  assert.ok(evaluation.confidenceScore >= 0 && evaluation.confidenceScore <= 100);
  assert.ok(evaluation.answerQualityScore >= 0 && evaluation.answerQualityScore <= 100);
  assert.ok(evaluation.strengths.length);
  assert.ok(evaluation.weaknesses.length);
  assert.ok(evaluation.suggestions.length);
});

test('development evaluation works without Gemini configuration', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousEnvironment = process.env.NODE_ENV;
  delete process.env.GEMINI_API_KEY;
  process.env.NODE_ENV = 'development';
  try { assert.ok((await evaluateTranscript(context)).overallScore >= 0); }
  finally {
    if (previousKey) process.env.GEMINI_API_KEY = previousKey;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});

test('evaluation transcript supports text and voice answers', () => {
  const transcript = buildEvaluationTranscript({
    questions: [
      { question: 'Text?', category: 'behavioral', difficulty: 'easy' },
      { question: 'Voice?', category: 'technical', difficulty: 'medium' },
    ],
    answers: [
      { questionIndex: 0, answer: 'A text response', transcript: '' },
      { questionIndex: 1, answer: 'Stored voice response', transcript: 'A voice transcript' },
    ],
  });
  assert.equal(transcript[0].answer, 'A text response');
  assert.equal(transcript[1].answer, 'A voice transcript');
});

test('empty and skipped responses produce an empty evidence set without failing evaluation', async () => {
  const transcript = buildEvaluationTranscript({
    questions: [{ question: 'Question?', category: 'technical', difficulty: 'medium' }],
    answers: [{ questionIndex: 0, answer: '', transcript: '', status: 'skipped' }],
  });
  assert.deepEqual(transcript, []);

  const previousKey = process.env.GEMINI_API_KEY;
  const previousEnvironment = process.env.NODE_ENV;
  delete process.env.GEMINI_API_KEY;
  process.env.NODE_ENV = 'development';
  try {
    const evaluation = await evaluateTranscript({ ...context, transcript });
    assert.ok(evaluation.overallScore >= 0 && evaluation.overallScore <= 100);
  } finally {
    if (previousKey) process.env.GEMINI_API_KEY = previousKey;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});

test('local evaluation clearly separates correct, partial, and irrelevant answers', () => {
  const question = 'How would you design a secure REST API?';
  const correct = createLocalEvaluation({ ...context, transcript: [{ question, answer: 'First I would define API resources and a database schema, validate input, authenticate users, authorize actions, add rate limiting, and cover the system with integration tests because security failures must be measured.' }] });
  const partial = createLocalEvaluation({ ...context, transcript: [{ question, answer: 'I would create an API and add authentication.' }] });
  const irrelevant = createLocalEvaluation({ ...context, transcript: [{ question, answer: 'Purple clouds play guitar at breakfast.' }] });

  assert.ok(correct.overallScore >= 80, `expected excellent score, received ${correct.overallScore}`);
  assert.ok(partial.overallScore >= 20 && partial.overallScore < correct.overallScore, `expected partial score, received ${partial.overallScore}`);
  assert.ok(irrelevant.overallScore <= 20, `expected irrelevant score, received ${irrelevant.overallScore}`);
  assert.equal(irrelevant.strengths.length, 0);
});

