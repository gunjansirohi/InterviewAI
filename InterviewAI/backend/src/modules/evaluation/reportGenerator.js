import Interview from '../interview/Interview.js';
import InterviewReport from './InterviewReport.js';
import { evaluateTranscript } from './evaluationService.js';

export async function generateInterviewReport(interview) {
  const existingReport = await InterviewReport.findOne({ interviewId: interview._id, userId: interview.userId });
  if (existingReport) return existingReport;

  const transcript = buildEvaluationTranscript(interview);
  // An interview may legitimately contain only skipped or empty answers.  Keep
  // the report request valid: the evaluator receives the interview context and
  // an empty evidence set, so it can give transparent no-response feedback.
  console.info('[evaluation-transcript-built]', {
    interviewId: String(interview._id),
    questionCount: interview.questions.length,
    evaluableResponses: transcript.length,
    skippedResponses: (interview.answers || []).filter((answer) => answer.status === 'skipped').length,
    proctorWarningCount: interview.proctorWarnings?.length || 0,
  });

  const evaluation = await evaluateTranscript({
    role: interview.role,
    interviewType: interview.interviewType,
    difficulty: interview.difficulty,
    transcript,
  });
  const proctoringWarnings = (interview.proctorWarnings || []).map(({ type, message, questionIndex, createdAt }) => ({ type, message, questionIndex, createdAt }));
  const proctoringScoreAdjustment = -Math.min(20, proctoringWarnings.length * 2);
  evaluation.overallScore = Math.max(0, evaluation.overallScore + proctoringScoreAdjustment);
  const report = await InterviewReport.findOneAndUpdate(
    { interviewId: interview._id },
    { $setOnInsert: { userId: interview.userId, interviewId: interview._id, ...evaluation, totalQuestions: interview.questions.length, answeredQuestions: transcript.length, skippedQuestions: (interview.answers || []).filter((answer) => answer.status === 'skipped').length, proctoringWarningCount: proctoringWarnings.length, proctoringWarnings, proctoringScoreAdjustment } },
    { upsert: true, new: true, runValidators: true },
  );
  // Evaluation completes a session as well. This covers the text interview
  // flow, which has no separate explicit end request after its last answer.
  await Interview.updateOne(
    { _id: interview._id, userId: interview.userId },
    { $set: { score: report.overallScore, status: 'completed', endedAt: interview.endedAt || new Date() } },
  );
  return report;
}

export function buildEvaluationTranscript(interview) {
  const answers = new Map((interview.answers || []).map((answer) => [answer.questionIndex, answer]));
  return interview.questions.flatMap((question, index) => {
    const answer = answers.get(index);
    if (!answer || answer.status === 'skipped') return [];
    const answerText = typeof answer.transcript === 'string' && answer.transcript.trim()
      ? answer.transcript.trim()
      : typeof answer.answer === 'string' ? answer.answer.trim() : '';
    if (!answerText) return [];
    return [{
      question: question.question,
      category: question.category,
      difficulty: question.difficulty,
      answer: answerText,
    }];
  });
}
