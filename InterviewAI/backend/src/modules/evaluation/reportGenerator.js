import Interview from '../interview/Interview.js';
import InterviewReport from './InterviewReport.js';
import { evaluateTranscript } from './evaluationService.js';

export async function generateInterviewReport(interview) {
  const existingReport = await InterviewReport.findOne({ interviewId: interview._id, userId: interview.userId });
  if (existingReport) return existingReport;

  const transcript = buildEvaluationTranscript(interview);
  if (!transcript.length) {
    const error = new Error('Complete at least one interview answer before requesting an evaluation');
    error.status = 400;
    throw error;
  }

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
  await Interview.updateOne({ _id: interview._id }, { $set: { score: report.overallScore } });
  return report;
}

export function buildEvaluationTranscript(interview) {
  const answers = new Map((interview.answers || []).map((answer) => [answer.questionIndex, answer]));
  return interview.questions.flatMap((question, index) => {
    const answer = answers.get(index);
    if (!answer || answer.status === 'skipped') return [];
    return [{
      question: question.question,
      category: question.category,
      difficulty: question.difficulty,
      answer: answer.transcript || answer.answer || '',
    }];
  });
}
