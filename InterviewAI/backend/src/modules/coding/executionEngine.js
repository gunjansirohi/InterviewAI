import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultJudge0LanguageIds } from './languages.js';

const ansiPattern = /\u001b\[[0-9;]*m/g;

const pendingStatuses = new Set([1, 2]);

class ExecutionProvider {
  async execute(_request) { throw new Error('execute() must be implemented by an execution provider'); }
}

class DisabledExecutionProvider extends ExecutionProvider {
  async execute() {
    const error = new Error('Code execution is disabled. Set CODE_EXECUTION_PROVIDER=local for development or configure Judge0.');
    error.status = 503;
    error.expose = true;
    error.code = 'EXECUTION_NOT_CONFIGURED';
    throw error;
  }
}

class LocalExecutionProvider extends ExecutionProvider {
  async execute({ language, code, stdin = '' }) {
    if (process.env.NODE_ENV === 'production') {
      const error = new Error('The local execution provider cannot be used in production; configure Judge0 instead.');
      error.status = 503; error.expose = true; error.code = 'UNSAFE_EXECUTION_PROVIDER'; throw error;
    }

    const directory = await mkdtemp(join(tmpdir(), 'interviewai-code-'));
    const startedAt = performance.now();
    try {
          const result = await executeLocally({ directory, language, code, stdin });
      const executionTime = Math.round((performance.now() - startedAt) * 100) / 100;
      return {
        output: sanitizeOutput(result.stdout),
        stderr: sanitizeOutput(result.stderr || ''),
        executionTime,
        memoryUsage: null,
        compilationError: sanitizeOutput(result.compilationError || ''),
        runtimeError: sanitizeOutput(result.runtimeError || ''),
        status: result.compilationError ? 'Compilation Error' : result.runtimeError ? 'Runtime Error' : 'Accepted',
      };
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}

class Judge0ExecutionProvider extends ExecutionProvider {
  constructor() {
    super();
    if (!process.env.JUDGE0_URL) {
      const error = new Error('Judge0 is selected but JUDGE0_URL is not configured.');
      error.status = 503; error.expose = true; error.code = 'JUDGE0_NOT_CONFIGURED'; throw error;
    }
    this.baseUrl = process.env.JUDGE0_URL.replace(/\/$/, '');
    this.languageIds = parseLanguageIds();
  }

  headers() {
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.JUDGE0_AUTH_TOKEN) headers['X-Auth-Token'] = process.env.JUDGE0_AUTH_TOKEN;
    return headers;
  }

  async execute({ language, code, stdin = '' }) {
    const languageId = this.languageIds[language];
    if (!languageId) {
      const error = new Error(`No Judge0 language ID is configured for ${language}.`); error.status = 503; error.expose = true; error.code = 'JUDGE0_LANGUAGE_NOT_CONFIGURED'; throw error;
    }
    try {
      const createResponse = await fetch(`${this.baseUrl}/submissions?base64_encoded=false&wait=false`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin,
          cpu_time_limit: positiveNumber(process.env.CODE_CPU_TIME_LIMIT, 5),
          wall_time_limit: positiveNumber(process.env.CODE_WALL_TIME_LIMIT, 10),
          memory_limit: positiveNumber(process.env.CODE_MEMORY_LIMIT_KB, 262144),
          max_file_size: positiveNumber(process.env.CODE_MAX_FILE_SIZE_KB, 1024),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!createResponse.ok) throw await judge0HttpError(createResponse, 'rejected the submission');
      const { token } = await createResponse.json();
      if (!token) throw new Error('Execution provider did not return a submission token');

      for (let attempt = 0; attempt < 30; attempt += 1) {
        await delay(400);
        const resultResponse = await fetch(`${this.baseUrl}/submissions/${encodeURIComponent(token)}?base64_encoded=false&fields=stdout,time,memory,stderr,compile_output,message,status`, { headers: this.headers(), signal: AbortSignal.timeout(10000) });
        if (!resultResponse.ok) throw await judge0HttpError(resultResponse, 'result request failed');
        const result = await resultResponse.json();
        if (!pendingStatuses.has(result.status?.id)) return normalizeResult(result);
      }
      const pollingError = new Error('Judge0 did not finish the submission within the polling limit.');
      pollingError.status = 504; pollingError.expose = true; pollingError.code = 'EXECUTION_TIMEOUT'; throw pollingError;
    } catch (cause) {
      if (cause.status) throw cause;
      const timedOut = cause.name === 'TimeoutError' || cause.name === 'AbortError';
      const networkCode = cause?.cause?.code || cause?.code;
      const unreachable = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET'].includes(networkCode) || cause.name === 'TypeError';
      const message = timedOut
        ? `Judge0 at ${this.baseUrl} timed out. Check that the execution service is healthy.`
        : unreachable
          ? `Cannot connect to Judge0 at ${this.baseUrl}${networkCode ? ` (${networkCode})` : ''}. Start the service or correct JUDGE0_URL.`
          : 'Judge0 execution is temporarily unavailable. Check the backend logs for the provider error.';
      console.error('[code-execution]', {
        provider: 'judge0',
        baseUrl: this.baseUrl,
        language,
        languageId,
        errorName: cause.name,
        errorCode: networkCode,
        errorMessage: cause.message,
      });
      const error = new Error(message);
      error.status = timedOut ? 504 : 503;
      error.expose = true;
      error.code = timedOut ? 'EXECUTION_TIMEOUT' : unreachable ? 'JUDGE0_UNREACHABLE' : 'EXECUTION_UNAVAILABLE';
      error.provider = 'judge0';
      error.cause = cause;
      throw error;
    }
  }
}

export function getExecutionProvider() {
  const providerName = process.env.CODE_EXECUTION_PROVIDER || 'disabled';
  if (providerName === 'judge0') {
    if (process.env.NODE_ENV !== 'production') {
      return new LocalExecutionProvider();
    }
    return new Judge0ExecutionProvider();
  }
  if (providerName === 'local') return new LocalExecutionProvider();
  return new DisabledExecutionProvider();
}

export async function executeCode(request) {
  const provider = getExecutionProvider();
  try {
    return await provider.execute(request);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && process.env.CODE_EXECUTION_PROVIDER === 'judge0' && error?.code === 'JUDGE0_UNREACHABLE') {
      console.warn('[coding-execution-fallback]', { language: request.language, reason: error.message });
      return new LocalExecutionProvider().execute(request);
    }
    throw error;
  }
}

export async function getExecutionProviderStatus() {
  const providerName = process.env.CODE_EXECUTION_PROVIDER || 'disabled';
  if (providerName !== 'judge0') return { available: providerName === 'local', provider: providerName };
  if (!process.env.JUDGE0_URL) return { available: false, provider: 'judge0', code: 'JUDGE0_NOT_CONFIGURED', message: 'JUDGE0_URL is not configured.' };
  const provider = new Judge0ExecutionProvider();
  const baseUrl = provider.baseUrl;
  try {
    const response = await fetch(`${baseUrl}/languages`, { headers: provider.headers(), signal: AbortSignal.timeout(3000) });
    if (!response.ok) return { available: false, provider: 'judge0', url: baseUrl, code: 'JUDGE0_UNHEALTHY', message: `Judge0 health check returned HTTP ${response.status}.` };
    return { available: true, provider: 'judge0', url: baseUrl };
  } catch (cause) {
    const errorCode = cause?.cause?.code || cause?.code;
    return { available: false, provider: 'judge0', url: baseUrl, code: 'JUDGE0_UNREACHABLE', message: `Cannot connect to Judge0${errorCode ? ` (${errorCode})` : ''}.` };
  }
}

function normalizeResult(result) {
  const statusId = Number(result.status?.id);
  const compilationError = statusId === 6 ? result.compile_output || result.stderr || result.message || 'Compilation failed.' : result.compile_output || '';
  const runtimeFailure = statusId === 5 || (statusId >= 7 && statusId <= 14);
  return {
    output: sanitizeOutput(result.stdout || ''),
    stderr: sanitizeOutput(result.stderr || ''),
    executionTime: result.time === null || result.time === undefined ? null : Number(result.time),
    memoryUsage: result.memory ?? null,
    compilationError: sanitizeOutput(compilationError),
    runtimeError: sanitizeOutput(runtimeFailure ? result.stderr || result.message || result.status?.description || 'Execution failed.' : ''),
    status: result.status?.description || 'Unknown',
  };
}

function sanitizeOutput(value = '') {
  return String(value).replace(ansiPattern, '').trim();
}

async function judge0HttpError(response, action) {
  let details = '';
  try { details = (await response.text()).slice(0, 500); } catch { /* response body is optional */ }
  const error = new Error(`Judge0 ${action} (${response.status})${details ? `: ${details}` : ''}`);
  error.status = response.status === 429 ? 503 : 502;
  error.expose = true;
  error.code = response.status === 429 ? 'EXECUTION_RATE_LIMITED' : 'EXECUTION_PROVIDER_ERROR';
  return error;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function parseLanguageIds() {
  try { return { ...defaultJudge0LanguageIds, ...JSON.parse(process.env.JUDGE0_LANGUAGE_IDS || '{}') }; }
  catch { const error = new Error('JUDGE0_LANGUAGE_IDS must be valid JSON'); error.status = 500; throw error; }
}

function delay(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }

async function executeLocally({ directory, language, code, stdin }) {
  const executable = (name) => join(directory, process.platform === 'win32' ? `${name}.exe` : name);
  const configurations = {
    javascript: { file: 'Main.js', command: process.env.NODE_EXECUTABLE || process.env.NODE_COMMAND || process.execPath, args: (file) => [file] },
    python: { file: 'main.py', command: process.env.PYTHON_COMMAND || process.env.PYTHON_EXECUTABLE || 'python', args: (file) => [file] },
    java: {
      file: 'Main.java',
      compile: { command: process.env.JAVAC_COMMAND || 'javac', args: (file) => [file] },
      command: process.env.JAVA_COMMAND || 'java',
      args: (_file, workingDirectory) => ['-cp', workingDirectory, 'Main'],
    },
    c: {
      file: 'Main.c',
      compile: { command: process.env.C_COMPILER || 'gcc', args: (file) => [file, '-O2', '-o', executable('Main')] },
      command: executable('Main'), args: () => [],
    },
    cpp: {
      file: 'Main.cpp',
      compile: { command: process.env.CPP_COMPILER || 'g++', args: (file) => [file, '-std=c++17', '-O2', '-o', executable('Main')] },
      command: executable('Main'), args: () => [],
    },
    csharp: {
      file: 'Main.cs',
      compile: { command: process.env.CSHARP_COMPILER || 'csc', args: (file) => ['/nologo', `/out:${executable('Main')}`, file] },
      command: executable('Main'), args: () => [],
    },
    go: { file: 'Main.go', command: process.env.GO_COMMAND || 'go', args: (file) => ['run', file] },
  };
  const configuration = configurations[language];
  if (!configuration) {
    return { stdout: '', runtimeError: `Local execution for ${language} is not available. Configure Judge0 to run this language.` };
  }

  const file = join(directory, configuration.file);
  await writeFile(file, code, 'utf8');
  const writtenCode = await readFile(file, 'utf8');
  if (writtenCode !== code) {
    const error = new Error('Code runner failed to preserve the submitted source while creating the temporary file.');
    error.status = 500; error.expose = true; error.code = 'SOURCE_WRITE_MISMATCH'; throw error;
  }
  logSourceSnapshot({ language, file, code: writtenCode });
  if (configuration.compile) {
    const compilation = await runProcess(configuration.compile.command, configuration.compile.args(file), { cwd: directory, stdin: '' });
    if (compilation.runtimeError) return { stdout: compilation.stdout, stderr: compilation.stderr, compilationError: compilation.runtimeError };
  }
  return runProcess(configuration.command, configuration.args(file, directory), { cwd: directory, stdin });
}

function logSourceSnapshot({ language, file, code }) {
  if (process.env.CODE_EXECUTION_DEBUG !== 'true') return;
  const hash = createHash('sha256').update(code, 'utf8').digest('hex');
  console.debug('[code-execution-debug]', { language, file, characters: code.length, lines: code.split(/\r?\n/).length, sha256: hash });
  console.debug(`[code-execution-debug] exact source start\n${code}\n[code-execution-debug] exact source end`);
}

function runProcess(command, args, { cwd, stdin }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let exceededOutputLimit = false;
    const append = (current, chunk) => {
      const next = current + chunk.toString();
      if (next.length > 100000) { exceededOutputLimit = true; child.kill(); }
      return next.slice(0, 100000);
    };
    child.stdout.on('data', (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = append(stderr, chunk); });
    child.on('error', (error) => resolve({ stdout, stderr, runtimeError: error.code === 'ENOENT' ? `The ${command} runtime is not installed or not on PATH.` : error.message }));
    const timer = setTimeout(() => child.kill(), 5000);
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      const timedOut = signal && !exceededOutputLimit;
      const runtimeError = exceededOutputLimit ? 'Program output exceeded 100 KB.' : timedOut ? 'Program exceeded the 5 second time limit.' : exitCode === 0 ? '' : stderr || `Program exited with code ${exitCode}.`;
      resolve({ stdout, stderr, runtimeError });
    });
    child.stdin.end(stdin);
  });
}

export { DisabledExecutionProvider, ExecutionProvider, Judge0ExecutionProvider, LocalExecutionProvider };
