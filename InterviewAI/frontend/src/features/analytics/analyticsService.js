import api from '../../services/api';

export async function getAnalyticsDashboard() {
  const { data } = await api.get('/analytics/dashboard');
  const analyticsPayload = data?.analytics ?? data;
  console.log('[analytics-dashboard] API response', analyticsPayload);
  return analyticsPayload;
}

export async function getInterviewHistory(params = {}) {
  const { data } = await api.get('/analytics/history', { params });
  return { interviews: data.interviews, pagination: data.pagination };
}

export async function getSkillAnalytics() {
  const { data } = await api.get('/analytics/skills');
  return data.analytics;
}
