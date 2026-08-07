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

