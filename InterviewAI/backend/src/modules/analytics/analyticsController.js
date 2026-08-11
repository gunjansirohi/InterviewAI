import { getDashboardAnalytics, getInterviewHistory, getLearningRoadmap, getSkillAnalytics } from './analyticsService.js';

function getUserId(req) {
  return req.user?._id || req.user?.id;
}

function sendError(res, status, message) {
  return res.status(status).json({ success: false, status: 'error', message });
}

export async function dashboard(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, 'Authentication user data is missing');
    console.info('[analytics-dashboard-request]', { requestId: req.id, userId: String(userId) });
    const analytics = await getDashboardAnalytics(userId);
    console.info('[analytics-dashboard-response]', { requestId: req.id, userId: String(userId), statistics: { totalInterviews: analytics.totalInterviews, completedSessions: analytics.completedSessions, averageScore: analytics.averageScore } });
    return res.status(200).json({ success: true, analytics });
  } catch (error) {
    console.error(`[analytics-dashboard] ${req.id}`, error?.stack || error);
    return next(error);
  }
}

export async function history(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, 'Authentication user data is missing');
    return res.status(200).json({ success: true, ...(await getInterviewHistory(userId, req.query)) });
  } catch (error) {
    console.error(`[analytics-history] ${req.id}`, error?.stack || error);
    return next(error);
  }
}

export async function skills(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, 'Authentication user data is missing');
    return res.status(200).json({ success: true, analytics: await getSkillAnalytics(userId) });
  } catch (error) {
    console.error(`[analytics-skills] ${req.id}`, error?.stack || error);
    return next(error);
  }
}

export async function roadmap(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, 'Authentication user data is missing');
    const roadmap = await getLearningRoadmap(userId);
    return res.status(200).json({
      success: true,
      roadmap,
      message: roadmap.length ? 'Roadmap fetched successfully' : 'No roadmap available',
    });
  } catch (error) {
    console.error(`[analytics-roadmap] ${req.id}`, error?.stack || error);
    return next(error);
  }
}
