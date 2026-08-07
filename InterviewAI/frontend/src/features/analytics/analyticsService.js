import api from '../../services/api';

export async function getAnalyticsDashboard() {
  const { data } = await api.get('/analytics/dashboard');
  return data.analytics;
}

export async function getInterviewHistory(params = {}) {
  const { data } = await api.get('/analytics/history', { params });
  return { interviews: data.interviews, pagination: data.pagination };
}

export async function getSkillAnalytics() {
  const { data } = await api.get('/analytics/skills');
  return data.analytics;
}

export async function getLearningRoadmap() {
  try {
    const { data } = await api.get('/analytics/roadmap');
    return Array.isArray(data?.roadmap) ? data.roadmap : [];
  } catch (error) {
    console.error('Unable to load learning roadmap', error);
    return [];
  }
}
