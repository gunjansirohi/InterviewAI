import api from '../../services/api';

export async function uploadResume(file, onProgress) {
  const formData = new FormData();
  formData.append('resume', file);
  const { data } = await api.post('/resume/upload', formData, {
    headers: { 'X-InterviewAI-Feature': 'resume-analysis' },
    onUploadProgress: ({ loaded, total }) => {
      if (total) onProgress?.(Math.round((loaded * 100) / total));
    },
  });
  return data.resume;
}

export async function getResumeProfile() {
  const { data } = await api.get('/resume/profile', {
    headers: { 'Cache-Control': 'no-cache' },
  });
  return data.resume;
}

export async function reanalyzeResumeProfile() {
  const { data } = await api.post('/resume/reanalyze', undefined, {
    headers: { 'X-InterviewAI-Feature': 'resume-analysis' },
  });
  return data.resume;
}

export async function deleteResumeProfile() {
  await api.delete('/resume/profile');
}
