import GeminiClient from '../../lib/geminiClient.js';
import { zodTextFormat } from '../../lib/geminiClient.js';
import { z } from 'zod';
import { buildInterviewPrompt } from './promptTemplates.js';
import { uniqueQuestions } from './questionManager.js';

const generatedQuestionsSchema = z.object({
  questions: z.array(z.object({
    question: z.string().min(1),
    category: z.string().min(1),
    difficulty: z.enum(['easy', 'medium', 'hard']),
  })).min(1).max(20),
});

export async function generateQuestions(parameters) {
  if (!process.env.GEMINI_API_KEY) {
    if (process.env.NODE_ENV !== 'production') return uniqueQuestions(generateLocalQuestions(parameters)).slice(0, parameters.questionCount);
    const error = new Error('Interview question service is not configured'); error.status = 503; error.expose = true; error.code = 'AI_NOT_CONFIGURED'; throw error;
  }

  const client = new GeminiClient({ apiKey: process.env.GEMINI_API_KEY, timeout: 45000, maxRetries: 2 });
  try {
    const rejectedQuestions = [];
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await client.responses.parse({
        model: process.env.GEMINI_MODEL,
        input: [
          { role: 'system', content: 'You create fair, job-relevant interview questions from supplied candidate data. Follow the requested output schema exactly.' },
          { role: 'user', content: buildInterviewPrompt({ ...parameters, askedQuestions: [...(parameters.askedQuestions || []), ...rejectedQuestions] }) },
        ],
        text: { format: zodTextFormat(generatedQuestionsSchema, 'interview_questions') },
      });
      const output = response.output_parsed;
      if (!output || output.questions.length !== parameters.questionCount) throw new Error('The AI returned an unexpected number of questions');
      const unique = uniqueQuestions(output.questions, parameters.askedQuestions);
      if (unique.length === parameters.questionCount) return unique;
      rejectedQuestions.push(...output.questions.map(({ question }) => question));
      console.warn('[interview-question-duplicates-rejected]', { attempt, requested: parameters.questionCount, accepted: unique.length });
    }
    throw new Error('The AI repeatedly generated duplicate interview questions');
  } catch (cause) {
    const providerStatus = Number(cause?.status);
    const requestId = cause?.request_id || cause?.headers?.['x-request-id'];
    console.error('[interview-question-provider-failed]', { provider: 'gemini', status: providerStatus, code: cause?.code, requestId, message: cause?.message });
    if (process.env.NODE_ENV !== 'production') return generateLocalQuestions(parameters);
    let message = 'Interview question provider is temporarily unavailable. Please try again.';
    let status = 502;
    let code = 'AI_UNAVAILABLE';
    if (providerStatus === 401 || providerStatus === 403) { message = 'Interview question provider authentication failed. Check GEMINI_API_KEY.'; status = 503; code = 'AI_AUTH_FAILED'; }
    else if (providerStatus === 429) { message = cause?.code === 'credit_balance_exhausted' ? 'Interview question generation has no remaining Gemini quota. Add billing credits or try later.' : 'Interview question generation is rate-limited. Please try again later.'; status = 503; code = cause?.code === 'credit_balance_exhausted' ? 'AI_CREDITS_EXHAUSTED' : 'AI_RATE_LIMITED'; }
    else if (providerStatus === 400 || providerStatus === 404) { message = `Interview question model "${process.env.GEMINI_MODEL}" is unavailable for this API key.`; status = 503; code = 'AI_MODEL_UNAVAILABLE'; }
    const error = new Error(message);
    error.status = status;
    error.expose = true;
    error.code = code;
    error.provider = 'gemini';
    error.requestId = requestId;
    error.cause = cause;
    throw error;
  }
}

export function generateLocalQuestions({ skills = [], projects = [], role, interviewType, difficulty, questionCount }) {
  const skill = skills.find(Boolean) || 'your primary technical skill';
  const project = projects.find((item) => item?.name)?.name || 'a recent project';
  const technical = [
    `Explain the architecture of ${project} and the trade-offs you would make for a ${role} system.`,
    `How would you use ${skill} to solve a performance bottleneck in a ${role} application?`,
    `Compare REST APIs and GraphQL for a product that needs flexible data access.`,
    `How would you design a database schema for a feature that must scale quickly?`,
    `Describe how you would test and monitor a web service before releasing it.`,
    `What is the difference between a queue and a stream in a distributed system?`,
    `How would you explain a data structure concept clearly to a teammate?`,
  ];
  const hr = [
    'Tell me about yourself and what motivates you in your career.',
    'What are your greatest strengths and one area you are still improving?',
    'Why should we hire you for this role?',
    'Where do you see yourself in five years, and how does this role fit that plan?',
    'Describe a time you worked with a team and handled a disagreement constructively.',
    'What motivates you to join this company specifically?',
  ];
  const behavioral = [
    'Describe a difficult problem you solved and the steps you took to resolve it.',
    'Tell me about a time you had to work in a team under pressure and how you contributed.',
    'Describe a situation where you had to make a difficult decision with incomplete information.',
    'Tell me about a time you failed and what you learned from it.',
    'Describe a time you had to lead or influence others without direct authority.',
  ];
  const dsa = [
    'Choose a data structure for an efficient search solution and explain the time and space complexity.',
    'Explain how you identify edge cases before implementing an algorithm.',
    'Compare breadth-first and depth-first search, including when you would choose each.',
    'How would you optimize a correct but slow solution, and how would you prove its complexity?',
    'Describe an approach to a dynamic programming problem, including state and transition design.',
  ];
  const projectDiscussion = [
    `Walk me through ${project}, its goal, architecture, and your specific contribution.`,
    `What was the hardest engineering decision in ${project}, and what alternatives did you reject?`,
    `How did you test and monitor ${project}, and how did you handle failures?`,
    `What would you redesign in ${project} if usage increased tenfold?`,
    `Which outcome from ${project} best demonstrates your impact?`,
  ];
  const systemDesign = [
    `Design a scalable service relevant to a ${role}; begin with requirements and constraints.`,
    'How would you choose data storage, schema, indexes, and consistency guarantees for that system?',
    'Explain the API boundaries, caching strategy, and asynchronous processing in your design.',
    'How would the system handle traffic spikes, partial failures, observability, and recovery?',
    'Identify the main security threats and engineering trade-offs in your design.',
  ];
  const pools = {
    hr,
    behavioral,
    technical,
    dsa,
    project: projectDiscussion,
    'system-design': systemDesign,
  };
  const pool = interviewType === 'mixed' ? technical.flatMap((question, index) => [question, behavioral[index % behavioral.length]]) : pools[interviewType] || technical;
  return Array.from({ length: questionCount }, (_, index) => ({
    question: pool[index % pool.length] + (index >= pool.length ? ` Focus on example ${index + 1}.` : ''),
    category: interviewType === 'mixed' ? (index % 2 === 0 ? 'technical' : 'behavioral') : interviewType,
    difficulty,
  }));
}




