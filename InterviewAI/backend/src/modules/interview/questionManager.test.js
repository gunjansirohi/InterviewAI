import assert from 'node:assert/strict';
import test from 'node:test';
import { isDuplicateQuestion, uniqueQuestions } from './questionManager.js';

test('detects exact and near-duplicate interview questions', () => {
  const asked = ['Explain React hooks.', 'What is the virtual DOM?'];
  assert.equal(isDuplicateQuestion('Explain React hooks.', asked), true);
  assert.equal(isDuplicateQuestion('What are React hooks?', asked), true);
  assert.equal(isDuplicateQuestion('How would you optimize a MongoDB query?', asked), false);
});

test('keeps only unique questions from a generated batch', () => {
  const questions = uniqueQuestions([
    { question: 'Explain React hooks.' },
    { question: 'What are React hooks?' },
    { question: 'How would you test an API?' },
  ]);
  assert.deepEqual(questions.map(({ question }) => question), ['Explain React hooks.', 'How would you test an API?']);
});
