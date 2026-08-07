import assert from 'node:assert/strict';
import test from 'node:test';
import { generateLocalQuestions, generateQuestions } from './questionGenerator.js';

const parameters = {
  skills: ['JavaScript', 'React'],
  projects: [{ name: 'InterviewAI' }],
  role: 'Frontend Developer',
  interviewType: 'mixed',
  difficulty: 'medium',
  questionCount: 5,
};

test('local interview generator returns the requested personalized question count', () => {
  const questions = generateLocalQuestions(parameters);
  assert.equal(questions.length, 5);
  assert.ok(questions.some((item) => /JavaScript|InterviewAI|Frontend Developer/.test(item.question)));
  assert.ok(questions.every((item) => item.difficulty === 'medium'));
});

test('development interview generation works without a Gemini key', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousEnvironment = process.env.NODE_ENV;
  delete process.env.GEMINI_API_KEY;
  process.env.NODE_ENV = 'development';
  try {
    const questions = await generateQuestions(parameters);
    assert.equal(questions.length, parameters.questionCount);
  } finally {
    if (previousKey) process.env.GEMINI_API_KEY = previousKey;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});

test('all AI interviewer modes generate mode-specific local questions', () => {
  for (const interviewType of ['hr', 'technical', 'dsa', 'project', 'system-design']) {
    const questions = generateLocalQuestions({ ...parameters, interviewType, questionCount: 3 });
    assert.equal(questions.length, 3);
    assert.ok(questions.every((question) => question.category === interviewType));
  }
});


