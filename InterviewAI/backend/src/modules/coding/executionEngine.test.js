import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewCode } from './aiCodeReview.js';
import { executeCode, getExecutionProviderStatus, Judge0ExecutionProvider } from './executionEngine.js';
import { runTestCases } from './testCaseEngine.js';
import { generateLocalProblems } from './localProblemGenerator.js';
import { supportedLanguageIds } from './languages.js';

test('all advertised coding languages have local starter code', () => {
  assert.deepEqual(supportedLanguageIds, ['javascript', 'python', 'java', 'cpp', 'c', 'csharp', 'go']);
  for (const language of supportedLanguageIds) {
    const [problem] = generateLocalProblems({ language, difficulty: 'easy', topic: 'arrays', questionCount: 1 });
    assert.ok(problem.starterCode, `${language} should have starter code`);
  }
});

test('local coding batches contain unique questions and avoid recent titles', () => {
  const parameters = { language: 'javascript', difficulty: 'medium', topic: 'Dynamic Programming', questionCount: 4 };
  const firstBatch = generateLocalProblems(parameters);
  const firstTitles = firstBatch.map((problem) => problem.title);
  assert.equal(new Set(firstTitles).size, 4);
  const secondBatch = generateLocalProblems({ ...parameters, avoidTitles: firstTitles });
  const secondTitles = secondBatch.map((problem) => problem.title);
  assert.equal(new Set(secondTitles).size, 4);
  assert.ok(secondTitles.every((title) => !firstTitles.includes(title)));
  assert.ok(secondBatch.every((problem) => /medium Dynamic Programming/i.test(problem.statement)));
});

test('Judge0 sends C++ using language ID 54 and normalizes an accepted result', async () => {
  process.env.JUDGE0_URL = 'http://judge0.test';
  const previousFetch = globalThis.fetch;
  let submissionBody;
  globalThis.fetch = async (_url, options = {}) => {
    if (options.method === 'POST') {
      submissionBody = JSON.parse(options.body);
      return new Response(JSON.stringify({ token: 'submission-token' }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ stdout: '12\n', stderr: null, time: '0.01', memory: 2048, compile_output: null, message: null, status: { id: 3, description: 'Accepted' } }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const result = await new Judge0ExecutionProvider().execute({ language: 'cpp', code: 'int main() {}', stdin: '' });
    assert.equal(submissionBody.language_id, 54);
    assert.equal(submissionBody.memory_limit, 262144);
    assert.equal(result.output, '12');
    assert.equal(result.memoryUsage, 2048);
    assert.equal(result.runtimeError, '');
    assert.equal(result.status, 'Accepted');
  } finally { globalThis.fetch = previousFetch; }
});

test('Judge0 reports compiler diagnostics only as a compilation error', async () => {
  process.env.JUDGE0_URL = 'http://judge0.test';
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options = {}) => options.method === 'POST'
    ? new Response(JSON.stringify({ token: 'submission-token' }), { status: 201, headers: { 'content-type': 'application/json' } })
    : new Response(JSON.stringify({ stdout: null, stderr: null, time: null, memory: null, compile_output: 'Main.cpp: error: expected ;', message: null, status: { id: 6, description: 'Compilation Error' } }), { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    const result = await new Judge0ExecutionProvider().execute({ language: 'cpp', code: 'invalid', stdin: '' });
    assert.match(result.compilationError, /expected/);
    assert.equal(result.runtimeError, '');
    assert.equal(result.status, 'Compilation Error');
  } finally { globalThis.fetch = previousFetch; }
});

test('Judge0 connection failures return an actionable 503 error', async () => {
  process.env.JUDGE0_URL = 'http://localhost:2358';
  const previousFetch = globalThis.fetch;
  const previousConsoleError = console.error;
  globalThis.fetch = async () => { throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } }); };
  console.error = () => {};
  try {
    await assert.rejects(
      () => new Judge0ExecutionProvider().execute({ language: 'javascript', code: 'console.log(1)', stdin: '' }),
      (error) => error.status === 503 && error.code === 'JUDGE0_UNREACHABLE' && /localhost:2358/.test(error.message),
    );
  } finally {
    globalThis.fetch = previousFetch;
    console.error = previousConsoleError;
  }
});

test('execution provider status reports an unreachable Judge0 service', async () => {
  process.env.CODE_EXECUTION_PROVIDER = 'judge0';
  process.env.JUDGE0_URL = 'http://localhost:2358';
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } }); };
  try {
    const status = await getExecutionProviderStatus();
    assert.equal(status.available, false);
    assert.equal(status.code, 'JUDGE0_UNREACHABLE');
    assert.match(status.message, /ECONNREFUSED/);
  } finally { globalThis.fetch = previousFetch; }
});

test('development falls back to the local provider when Judge0 is unreachable', async () => {
  process.env.NODE_ENV = 'development';
  process.env.CODE_EXECUTION_PROVIDER = 'judge0';
  process.env.JUDGE0_URL = 'http://localhost:2358';
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } }); };
  try {
    const result = await executeCode({ language: 'javascript', code: 'console.log(42)', stdin: '' });
    assert.equal(result.status, 'Accepted');
    assert.equal(result.output.trim(), '42');
  } finally { globalThis.fetch = previousFetch; }
});

test('local JavaScript provider executes stdin and returns stdout', async () => {
  process.env.NODE_ENV = 'development';
  process.env.CODE_EXECUTION_PROVIDER = 'local';
  const code = "const fs = require('fs'); const values = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number); console.log(values.reduce((sum, value) => sum + value, 0));";
  const result = await executeCode({ language: 'javascript', code, stdin: '2 4 6' });
  assert.equal(result.output.trim(), '12');
  assert.equal(result.runtimeError, '');
  assert.equal(result.status, 'Accepted');
});

test('local provider preserves declarations and all leading JavaScript lines', async () => {
  process.env.NODE_ENV = 'development';
  process.env.CODE_EXECUTION_PROVIDER = 'local';
  const code = `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf8').trim();
const input = raw ? raw.split(/\\s+/).map(Number) : [];
if (input.length === 0) {
  console.log(0);
} else {
  console.log(input.reduce((sum, value) => sum + value, 0));
}`;
  const result = await executeCode({ language: 'javascript', code, stdin: '3 7' });
  assert.equal(result.output.trim(), '10');
  assert.equal(result.runtimeError, '');
});

test('local Java provider compiles Main.java and executes Main with stdin', async () => {
  process.env.NODE_ENV = 'development';
  process.env.CODE_EXECUTION_PROVIDER = 'local';
  const code = `import java.util.Scanner;

public class Main {
  public static void main(String[] args) {
    Scanner input = new Scanner(System.in);
    int first = input.nextInt();
    int second = input.nextInt();
    System.out.println(first + second);
  }
}`;
  const result = await executeCode({ language: 'java', code, stdin: '7 5' });
  assert.equal(result.output.trim(), '12');
  assert.equal(result.compilationError, '');
  assert.equal(result.runtimeError, '');
  assert.equal(result.status, 'Accepted');
  assert.ok(result.executionTime >= 0);
});

test('local Java provider returns javac diagnostics as a compilation error', async () => {
  process.env.NODE_ENV = 'development';
  process.env.CODE_EXECUTION_PROVIDER = 'local';
  const result = await executeCode({ language: 'java', code: 'public class Main { invalid }', stdin: '' });
  assert.equal(result.status, 'Compilation Error');
  assert.match(result.compilationError, /error:/i);
  assert.equal(result.runtimeError, '');
});

test('development code review fallback scores passing tests', async () => {
  process.env.NODE_ENV = 'development';
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const review = await reviewCode({ code: '// solution', testSummary: { correctness: 100, passedCount: 3, totalCount: 3 } });
    assert.equal(review.logicScore, 100);
    assert.match(review.strengths[0], /Passed all/);
  } finally {
    if (previousKey) process.env.GEMINI_API_KEY = previousKey;
  }
});

test('submission test engine accepts a valid JavaScript solution', async () => {
  process.env.NODE_ENV = 'development';
  process.env.CODE_EXECUTION_PROVIDER = 'local';
  const code = "const fs = require('fs'); const values = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number); console.log(values.reduce((sum, value) => sum + value, 0));";
  const summary = await runTestCases({
    language: 'javascript',
    code,
    testCases: [
      { input: '2 4 6', expectedOutput: '12' },
      { input: '-5 0 5 10', expectedOutput: '10' },
    ],
  });
  assert.equal(summary.passedCount, 2);
  assert.equal(summary.correctness, 100);
});

