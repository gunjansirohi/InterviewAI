import { average, mostFrequent } from './analyticsHelper.js';

const PASS_THRESHOLD = 60;

function isValidScore(score) {
  return Number.isFinite(score) && score >= 0 && score <= 100;
}

export function calculateStatistics(interviews, reports) {
  const reportsByInterview = new Map(reports.map((report) => [report.interviewId.toString(), report]));
  const interviewById = new Map(interviews.map((interview) => [interview._id.toString(), interview]));

  // A saved report is a completed evaluation.  Include it even for legacy text
  // sessions which were evaluated before their interview status was persisted.
  // Require a matching interview so an orphaned report cannot affect a user's
  // dashboard.
  const completedReports = reports.filter((report) => interviewById.has(report.interviewId.toString()));
  const completedInterviewIds = new Set([
    ...interviews.filter((interview) => interview.status === 'completed').map((interview) => interview._id.toString()),
    ...completedReports.map((report) => report.interviewId.toString()),
  ]);

  // Scores are calculated from saved evaluations with a valid numeric score.
  const completedScores = completedReports
    .map((report) => report.overallScore)
    .filter(isValidScore);

  const totalInterviews = interviews.length;
  const completedSessions = completedInterviewIds.size;

  const performanceTrend = interviews
    .map((interview) => ({ interview, report: reportsByInterview.get(interview._id.toString()) }))
    .filter(({ report }) => report)
    .map(({ interview, report }) => ({
      interviewId: interview._id,
      role: interview.role,
      date: interview.createdAt,
      overallScore: report.overallScore,
      technicalScore: report.technicalScore,
      communicationScore: report.communicationScore,
      problemSolvingScore: report.problemSolvingScore,
    }));

  const averageScore = average(completedScores);
  const bestScore = completedScores.length ? Math.max(...completedScores) : 0;

  // Success rate is only meaningful for sessions that have a saved score.
  const successfulSessions = completedScores.filter((score) => score >= PASS_THRESHOLD).length;
  const successRate = completedScores.length
    ? Math.round((successfulSessions / completedScores.length) * 1000) / 10
    : 0;

  // Completion rate is completed sessions over all created interview sessions.
  const completionRate = totalInterviews
    ? Math.round((completedSessions / totalInterviews) * 1000) / 10
    : 0;

  return {
    totalInterviews,
    completedSessions,
    averageScore,
    bestScore,
    successRate,
    completionRate,
    skillScores: {
      technical: average(reports.map((report) => report.technicalScore)),
      communication: average(reports.map((report) => report.communicationScore)),
      problemSolving: average(reports.map((report) => report.problemSolvingScore)),
    },
    weakAreas: mostFrequent(reports.map((report) => report.weaknesses)),
    strongAreas: mostFrequent(reports.map((report) => report.strengths)),
    performanceTrend,
  };
}
