import GeminiClient from '../../lib/geminiClient.js';
import { zodTextFormat } from '../../lib/geminiClient.js';
import { z } from 'zod';
import { isDuplicateQuestion } from './questionManager.js';

const schema = z.object({ question: z.string().min(5), category: z.string().min(1), difficulty: z.enum(['easy', 'medium', 'hard']) });

export async function generateFollowUpQuestion(context) {
  const askedQuestions = context.askedQuestions || context.previousConversation?.map(({ question }) => question) || [];
  if (!process.env.GEMINI_API_KEY) return generateUniqueLocalFollowUp(context, askedQuestions);
  try {
    const client = new GeminiClient({ apiKey: process.env.GEMINI_API_KEY, timeout: 30000, maxRetries: 1 });
    const rejectedQuestions = [];
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await client.responses.parse({
        model: process.env.GEMINI_MODEL,
        input: [
          { role: 'system', content: 'Generate one new follow-up interview question. Do not repeat or reword any question in askedQuestions. The new question must test a different concept.' },
          { role: 'user', content: JSON.stringify({ ...context, askedQuestions: [...askedQuestions, ...rejectedQuestions] }) },
        ],
        text: { format: zodTextFormat(schema, 'interview_follow_up') },
      });
      if (!response.output_parsed) throw new Error('The AI response did not contain a follow-up question');
      if (!isDuplicateQuestion(response.output_parsed.question, askedQuestions)) return response.output_parsed;
      rejectedQuestions.push(response.output_parsed.question);
      console.warn('[follow-up-duplicate-rejected]', { attempt });
    }
    throw new Error('The AI repeatedly generated a duplicate follow-up question');
  } catch (cause) {
    console.error('[follow-up-provider-failed]', { provider: 'gemini', status: cause?.status, code: cause?.code, requestId: cause?.request_id, message: cause?.message });
    if (process.env.NODE_ENV !== 'production') return generateUniqueLocalFollowUp(context, askedQuestions);
    const error = new Error(cause?.status === 429 ? 'Follow-up generation is unavailable because the AI provider is rate-limited or has no credits.' : 'Follow-up question generation is temporarily unavailable.');
    error.status = cause?.status === 429 ? 503 : 502; error.expose = true; error.code = cause?.status === 429 ? 'AI_RATE_LIMITED' : 'AI_UNAVAILABLE'; error.provider = 'gemini'; error.cause = cause; throw error;
  }
}

function generateUniqueLocalFollowUp(context, askedQuestions) {
  const question = createLocalFollowUp(context);
  if (!isDuplicateQuestion(question.question, askedQuestions)) return question;
  const fallback = { question: 'Which assumption in your approach would you validate first, and how would you adjust if it proved incorrect?', category: 'follow-up-depth', difficulty: context.difficulty || 'medium' };
  if (!isDuplicateQuestion(fallback.question, askedQuestions)) return fallback;
  const error = new Error('A unique follow-up question could not be generated');
  error.status = 409;
  throw error;
}

export function createLocalFollowUp({ answer, parentQuestion, role, interviewType = 'technical', difficulty, experienceLevel = 'mid', skills = [], projects = [] }) {
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const strongSignals = answer.match(/\b(because|trade-?offs?|architecture|performance|security|tests?|failures?|reliability|scale)\b/gi) || [];
  const strong = strongSignals.length >= 2 && wordCount >= 12;
  const skill = skills.find(Boolean);
  if (wordCount < 15) return { question: `Could you expand on your answer to "${parentQuestion}" with a specific example and outcome?`, category: 'clarification', difficulty: 'easy' };
  if (interviewType === 'hr' || interviewType === 'behavioral') return { question: 'What was your personal contribution, and what measurable outcome or lesson resulted from it?', category: 'hr-follow-up', difficulty: adaptiveDifficultyFor(experienceLevel, difficulty) };
  if (interviewType === 'dsa') return { question: 'What are the time and space complexities, and which edge case is most likely to break that approach?', category: 'dsa-depth', difficulty: strong ? 'hard' : difficulty };
  if (interviewType === 'project') return { question: `What would you change in ${projects[0]?.name || 'that project'} to improve reliability or scalability, and why?`, category: 'project-depth', difficulty: strong ? 'hard' : difficulty };
  if (interviewType === 'system-design') return { question: 'Which component becomes the first bottleneck at ten times the traffic, and how would you detect and address it?', category: 'system-design-depth', difficulty: 'hard' };
  if (strong) return { question: `What failure modes or trade-offs would you consider next${skill ? ` when applying ${skill}` : ''}, and how would you validate your decision?`, category: 'technical-depth', difficulty: 'hard' };
  const adaptiveDifficulty = experienceLevel === 'senior' && difficulty !== 'hard' ? 'hard' : difficulty;
  return { question: `Why did you choose that approach for a ${role}, and what alternative would you consider?`, category: 'follow-up', difficulty: adaptiveDifficulty };
}

function adaptiveDifficultyFor(experienceLevel, difficulty) {
  return experienceLevel === 'senior' && difficulty !== 'hard' ? 'hard' : difficulty;
}




