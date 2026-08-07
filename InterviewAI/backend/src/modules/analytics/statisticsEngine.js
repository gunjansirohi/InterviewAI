import { average, mostFrequent } from './analyticsHelper.js';

export function calculateStatistics(interviews, reports) {
  const scores = reports.map((report) => report.overallScore);
  const reportByInterview = new Map(reports.map((report) => [report.interviewId.toString(), report]));
  const performanceTrend = interviews
    .map((interview) => ({ interview, report: reportByInterview.get(interview._id.toString()) }))
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

  return {
    totalInterviews: interviews.length,
    averageScore: average(scores),
    bestScore: scores.length ? Math.max(...scores) : 0,
    successRate: scores.length ? Math.round((scores.filter((score) => score >= 60).length / scores.length) * 1000) / 10 : 0,
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
