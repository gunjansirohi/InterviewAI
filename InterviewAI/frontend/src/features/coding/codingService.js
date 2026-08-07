import api from '../../services/api';

export async function startCodingInterview(settings) {
  const { data } = await api.post('/coding/start', settings);
  if (!Array.isArray(data.interviews) || data.interviews.length === 0) throw new Error('The server did not return any coding problems.');
  return data.interviews;
}
export async function getCodingInterview(id) { const { data } = await api.get(`/coding/${id}`); return data.interview; }
export async function getCodingBatch(batchId) { const { data } = await api.get(`/coding/batch/${batchId}`); return data.interviews; }
export async function runCode(id, payload) { const { data } = await api.post(`/coding/${id}/run`, payload); return data.execution; }
export async function submitCode(id, code) { const { data } = await api.post(`/coding/${id}/submit`, { code }); return { interview: data.interview, evaluation: data.evaluation }; }
export async function getCodingHistory() { const { data } = await api.get('/coding/history'); return data.interviews; }
