import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWarningEvent, getCurrentQuestionIndex, resolveInterviewTerminationStatus } from './interviewService.js';

test('buildWarningEvent returns a normalized warning payload', () => {
  const warning = buildWarningEvent({ reason: 'silence', message: 'Please answer the question.' });

  assert.equal(warning.reason, 'silence');
  assert.equal(warning.message, 'Please answer the question.');
  assert.ok(warning.timestamp instanceof Date);
});

test('resolveInterviewTerminationStatus differentiates manual and automatic endings', () => {
  assert.equal(resolveInterviewTerminationStatus(false), 'completed');
  assert.equal(resolveInterviewTerminationStatus(true), 'terminated');
});

test('getCurrentQuestionIndex advances past skipped questions', () => {
  const interview = {
    questions: [{ question: 'Q1' }, { question: 'Q2' }, { question: 'Q3' }],
    answers: [
      { questionIndex: 0, status: 'answered' },
      { questionIndex: 1, status: 'skipped', skippedAt: new Date(), reason: 'candidate_skipped' },
    ],
  };

  assert.equal(getCurrentQuestionIndex(interview), 2);
});
