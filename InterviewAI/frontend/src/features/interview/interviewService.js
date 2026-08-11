import api from '../../services/api';

export async function startInterview(settings) {
  const { data } = await api.post('/interview/start', settings);
  return data.interview;
}

export async function saveInterviewAnswer(payload) {
  const { data } = await api.post('/interview/answer', payload);
  return data.interview;
}

export async function getInterviewHistory() {
  const { data } = await api.get('/interview/history');
  return data.interviews;
}

export async function getInterview(id) {
  const { data } = await api.get(`/interview/${id}`);
  return data.interview;
}

export async function requestInterviewFollowUp(payload) {
  const { data } = await api.post('/interview/follow-up', payload);
  return data.interview;
}

export async function skipInterviewQuestion(payload) {
  const { data } = await api.post('/interview/skip-question', payload);
  if (!data?.success) throw new Error(data?.message || 'Unable to skip the question.');
  return data;
}
