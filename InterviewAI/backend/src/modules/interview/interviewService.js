import Interview from './Interview.js';
import { isDuplicateQuestion } from './questionManager.js';

export function buildWarningEvent({ reason, message = '' }) {
  return { reason, message, timestamp: new Date() };
}

export function resolveInterviewTerminationStatus(isAutoTerminated) {
  return isAutoTerminated ? 'terminated' : 'completed';
}

export function getCurrentQuestionIndex(interview) {
  const answeredKeys = new Set((interview?.answers || []).map((item) => Number(item.questionIndex)));
  for (let index = 0; index < (interview?.questions?.length || 0); index += 1) {
    if (!answeredKeys.has(index)) return index;
  }
  return -1;
}

export async function createInterview({ userId, role, interviewType, difficulty, experienceLevel, questions }) {
  return Interview.create({ userId, role, interviewType, difficulty, experienceLevel, questions, askedQuestions: questions.map(({ question }) => question) });
}

export async function saveAnswer({ userId, interviewId, questionIndex, answer, audioUrl = '', videoUrl = '', transcript = '', answerType = 'text' }) {
  const interview = await Interview.findOne({ _id: interviewId, userId });
  if (!interview) return null;
  if (questionIndex >= interview.questions.length) {
    const error = new Error('Question index is outside this interview');
    error.status = 400;
    throw error;
  }

  const existingAnswer = interview.answers.find((item) => item.questionIndex === questionIndex);
  if (existingAnswer) {
    existingAnswer.answer = answer;
    existingAnswer.audioUrl = audioUrl;
    existingAnswer.videoUrl = videoUrl;
    existingAnswer.transcript = transcript;
    existingAnswer.answerType = answerType;
    existingAnswer.status = 'answered';
    existingAnswer.answeredAt = new Date();
    existingAnswer.skippedAt = null;
    existingAnswer.reason = '';
  } else {
    interview.answers.push({ questionIndex, answer, audioUrl, videoUrl, transcript, answerType, status: 'answered', answeredAt: new Date() });
  }
  await interview.save();
  return interview;
}

export async function addProctorWarning({ userId, interviewId, warning }) {
  const interview = await Interview.findOne({ _id: interviewId, userId });
  if (!interview) return null;

  const warningPayload = { ...warning, createdAt: new Date() };
  interview.proctorWarnings.push(warningPayload);
  interview.warningCount = interview.proctorWarnings.length;
  interview.warnings.push(buildWarningEvent({ reason: warning.type, message: warning.message }));
  await interview.save();
  return interview;
}

export async function skipQuestion({ userId, interviewId, questionIndex, reason = 'candidate_skipped' }) {
  const interview = await Interview.findOne({ _id: interviewId, userId });
  if (!interview) return null;
  if (interview.status !== 'active') return { interview, skipped: false, reason: 'inactive' };
  if (questionIndex < 0 || questionIndex >= interview.questions.length) {
    const error = new Error('Question index is outside this interview');
    error.status = 400;
    throw error;
  }

  const existing = interview.answers.find((item) => item.questionIndex === questionIndex);
  if (existing?.status === 'skipped') return { interview, skipped: false, reason: 'already_skipped' };

  interview.answers.push({
    questionIndex,
    answer: '',
    audioUrl: '',
    videoUrl: '',
    transcript: '',
    answerType: 'text',
    answeredAt: new Date(),
    status: 'skipped',
    skippedAt: new Date(),
    reason,
    questionId: interview.questions[questionIndex]?._id || '',
    questionText: interview.questions[questionIndex]?.question || '',
  });
  interview.askedQuestions = [...new Set([...(interview.askedQuestions || []), interview.questions[questionIndex]?.question].filter(Boolean))];
  await interview.save();
  return { interview, skipped: true, reason: 'skipped' };
}

export async function insertFollowUpQuestion({ userId, interviewId, questionIndex, question }) {
  const interview = await Interview.findOne({ _id: interviewId, userId });
  if (!interview) return null;
  const parent = interview.questions[questionIndex];
  if (!parent || parent.isFollowUp || !interview.answers.some((answer) => answer.questionIndex === questionIndex)) return { interview, added: false };
  if (interview.questions.filter((item) => item.isFollowUp).length >= 3) return { interview, added: false };
  const askedQuestions = interview.askedQuestions?.length ? interview.askedQuestions : interview.questions.map(({ question: text }) => text);
  if (isDuplicateQuestion(question?.question, askedQuestions)) return { interview, added: false };
  interview.questions.splice(questionIndex + 1, 0, { ...question, isFollowUp: true, parentQuestionIndex: questionIndex });
  interview.askedQuestions = [...askedQuestions, question.question];
  await interview.save();
  return { interview, added: true };
}

export async function endInterviewSession({ userId, interviewId, isAutoTerminated = false }) {
  const interview = await Interview.findOne({ _id: interviewId, userId });
  if (!interview) return null;

  const processedQuestions = new Set(interview.answers.map((answer) => answer.questionIndex));
  if (!processedQuestions.size && interview.status === 'active') {
    const error = new Error('Answer at least one question before ending the interview');
    error.status = 400;
    throw error;
  }

  interview.status = resolveInterviewTerminationStatus(isAutoTerminated);
  interview.endedAt = new Date();
  await interview.save();
  return interview;
}

export function getInterviewHistory(userId) {
  return Interview.find({ userId }).sort({ createdAt: -1 });
}

export function getInterviewById(userId, interviewId) {
  return Interview.findOne({ _id: interviewId, userId });
}
