import api from '../../services/api';

export async function uploadVideo(blob) {
  if (!(blob instanceof Blob) || blob.size === 0) throw new Error('The video recording is empty. Please record again.');
  if (blob.size > 50 * 1024 * 1024) throw new Error('The video recording exceeds the 50 MB upload limit. Record a shorter response.');

  const formData = new FormData();
  const extension = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('webm') ? 'webm' : 'bin';
  formData.append('video', blob, `answer-${Date.now()}.${extension}`);

  try {
    const { data } = await api.post('/video/upload', formData, {
      headers: { 'X-InterviewAI-Feature': 'video-interview' },
    });
    return data.videoUrl;
  } catch (error) {
    const message = error?.response?.data?.message || 'Unable to upload the video recording.';
    throw new Error(message);
  }
}

export async function saveVideoAnswer(payload) {
  const { data } = await api.post('/interview/video-answer', payload);
  return data.interview;
}

export async function reportProctorWarning(payload) {
  const { data } = await api.post('/interview/proctor-warning', payload);
  if (!data?.success) throw new Error(data?.message || 'Unable to record the warning.');
  return data.warningCount;
}

export async function requestFollowUp(payload) {
  const { data } = await api.post('/interview/follow-up', payload);
  return data.interview;
}

export async function skipVideoQuestion(payload) {
  const { data } = await api.post('/interview/skip-question', payload);
  if (!data?.success) throw new Error(data?.message || 'Unable to skip the question.');
  return data;
}

export async function endVideoInterview(interviewId, options = {}) {
  const { data } = await api.post('/interview/end', { interviewId, ...options });
  return data.interview;
}
