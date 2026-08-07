import api from '../../services/api';

export async function evaluateInterview(interviewId) {
  const { data } = await api.post('/evaluation/evaluate', { interviewId });
  return data.report;
}

export async function getEvaluationReport(id) {
  const { data } = await api.get(`/evaluation/report/${id}`);
  return data.report;
}

export async function getEvaluationHistory() {
  const { data } = await api.get('/evaluation/history');
  return data.reports;
}
