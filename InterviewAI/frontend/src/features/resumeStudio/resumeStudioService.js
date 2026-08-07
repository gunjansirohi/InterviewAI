import api from '../../services/api';

export async function createStudioResume(payload) { const { data } = await api.post('/resume-studio/create', payload); return data.resume; }
export async function updateStudioResume(id, payload) { const { data } = await api.put(`/resume-studio/update/${id}`, payload); return data.resume; }
export async function listStudioResumes() { const { data } = await api.get('/resume-studio'); return data.resumes; }
export async function getStudioResume(id) { const { data } = await api.get(`/resume-studio/${id}`); return data.resume; }
export async function improveResumeSection(payload) { const { data } = await api.post('/resume-studio/improve', payload); return data.improvedContent; }
export async function analyzeStudioResume(payload) { const { data } = await api.post('/resume-studio/analyze', payload); return data.analysis; }
export async function getResumeVersions(id) { const { data } = await api.get(`/resume-studio/history/${id}`); return data.versions; }
export async function downloadResumePdf(id) { const response = await api.get(`/resume-studio/pdf/${id}`, { responseType: 'blob' }); return response.data; }
