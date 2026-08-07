import { executeCode } from './executionEngine.js';

export async function runTestCases({ language, code, testCases }) {
  const results = [];
  for (let index = 0; index < testCases.length; index += 1) {
    const testCase = testCases[index];
    const execution = await executeCode({ language, code, stdin: testCase.input });
    const passed = !execution.compilationError && !execution.runtimeError && normalize(execution.output) === normalize(testCase.expectedOutput);
    results.push({ index, passed, executionTime: execution.executionTime, memoryUsage: execution.memoryUsage, output: execution.output, compilationError: execution.compilationError, runtimeError: execution.runtimeError });
    if (execution.compilationError) break;
  }
  const passedCount = results.filter((result) => result.passed).length;
  return {
    results,
    passedCount,
    totalCount: testCases.length,
    correctness: Math.round((passedCount / testCases.length) * 100),
    executionTime: sum(results.map((result) => result.executionTime)),
    memoryUsage: max(results.map((result) => result.memoryUsage)),
  };
}

function normalize(value = '') { return value.replace(/\r\n/g, '\n').trim(); }
function sum(values) { const numbers = values.filter((value) => Number.isFinite(value)); return numbers.length ? Math.round(numbers.reduce((total, value) => total + value, 0) * 1000) / 1000 : null; }
function max(values) { const numbers = values.filter((value) => Number.isFinite(value)); return numbers.length ? Math.max(...numbers) : null; }
