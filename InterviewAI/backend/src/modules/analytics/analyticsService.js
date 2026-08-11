import Analytics from './Analytics.js';
import Interview from '../interview/Interview.js';
import InterviewReport from '../evaluation/InterviewReport.js';
import { escapeSearch } from './analyticsHelper.js';
import { calculateStatistics } from './statisticsEngine.js';
import { generateRoadmap } from './roadmapGenerator.js';

export async function getDashboardAnalytics(userId) {
  const [interviews, reports] = await Promise.all([
    Interview.find({ userId }).sort({ createdAt: 1 }).lean(),
    InterviewReport.find({ userId }).sort({ createdAt: 1 }).lean(),
  ]);
  const statistics = calculateStatistics(interviews, reports);
  console.info('[analytics-dashboard-statistics]', { userId: String(userId), interviewCount: interviews.length, reportCount: reports.length, statistics: { totalInterviews: statistics.totalInterviews, completedSessions: statistics.completedSessions, averageScore: statistics.averageScore } });
  await Analytics.findOneAndUpdate(
    { userId },
    { $set: { totalInterviews: statistics.totalInterviews, completedSessions: statistics.completedSessions, averageScore: statistics.averageScore, bestScore: statistics.bestScore, successRate: statistics.successRate, completionRate: statistics.completionRate, skillScores: statistics.skillScores, weakAreas: statistics.weakAreas, strongAreas: statistics.strongAreas, updatedAt: new Date() }, $setOnInsert: { userId } },
    { upsert: true, runValidators: true },
  );
  return { ...statistics, latestInterview: interviews.at(-1) || null, recentInterviews: interviews.slice(-5).reverse() };
}

export async function getInterviewHistory(userId, query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 10, 1), 50);
  const filter = { userId };
  for (const value of [query.dateFrom, query.dateTo].filter(Boolean)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
      const error = new Error('Date filters must use YYYY-MM-DD format');
      error.status = 400;
      throw error;
    }
  }
  if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
    const error = new Error('Start date cannot be after end date');
    error.status = 400;
    throw error;
  }
  if (query.search?.trim()) filter.role = { $regex: escapeSearch(query.search.trim()), $options: 'i' };
  if (['hr', 'technical', 'dsa', 'project', 'system-design', 'behavioral', 'mixed'].includes(query.interviewType)) filter.interviewType = query.interviewType;
  if (['easy', 'medium', 'hard'].includes(query.difficulty)) filter.difficulty = query.difficulty;
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
    if (query.dateTo) filter.createdAt.$lte = new Date(`${query.dateTo}T23:59:59.999Z`);
  }
  const [interviews, total] = await Promise.all([
    Interview.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Interview.countDocuments(filter),
  ]);
  return { interviews, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getSkillAnalytics(userId) {
  const reports = await InterviewReport.find({ userId }).sort({ createdAt: 1 }).lean();
  const statistics = calculateStatistics([], reports);
  return {
    skillScores: statistics.skillScores,
    weakAreas: statistics.weakAreas,
    strongAreas: statistics.strongAreas,
    trend: reports.map((report) => ({ date: report.createdAt, technical: report.technicalScore, communication: report.communicationScore, problemSolving: report.problemSolvingScore })),
  };
}

export async function getLearningRoadmap(userId) {
  if (!userId) return [];

  try {
    const reports = await InterviewReport.find({ userId }).sort({ createdAt: 1 }).lean();
    if (!reports.length) return [];

    const analytics = await Analytics.findOne({ userId }).lean();
    if (analytics?.learningRoadmap?.length && analytics.roadmapSourceReportCount === reports.length) return analytics.learningRoadmap;

    const learningRoadmap = await generateRoadmap(reports);
    await Analytics.findOneAndUpdate(
      { userId },
      { $set: { learningRoadmap, roadmapSourceReportCount: reports.length, updatedAt: new Date() }, $setOnInsert: { userId } },
      { upsert: true, new: true, runValidators: true },
    );
    return learningRoadmap;
  } catch (error) {
    console.error('[analytics-roadmap-service]', error?.stack || error);
    return [];
  }
}
