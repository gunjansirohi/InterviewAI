import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalFollowUp } from './followUpGenerator.js';

test('short answers receive a clarification question', () => {
  const result = createLocalFollowUp({ answer: 'I used Node.js.', parentQuestion: 'Explain the backend.', role: 'Developer', difficulty: 'medium' });
  assert.equal(result.category, 'clarification');
  assert.match(result.question, /specific example/i);
});

test('strong technical answers receive a deeper adaptive question', () => {
  const result = createLocalFollowUp({ answer: 'I selected the architecture because reliability and performance trade-offs were tested under scale and failure conditions.', parentQuestion: 'Explain the design.', role: 'Senior Developer', difficulty: 'medium', experienceLevel: 'senior', skills: ['Node.js'] });
  assert.equal(result.difficulty, 'hard');
  assert.match(result.question, /failure modes|trade-offs/i);
});
