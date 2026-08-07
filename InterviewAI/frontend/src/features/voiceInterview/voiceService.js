import api from '../../services/api';

export async function transcribeRecording(blob, browserTranscript = '', signal) {
  const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const formData = new FormData();
  formData.append('audio', blob, `answer-${Date.now()}.${extension}`);
  if (browserTranscript.trim()) formData.append('browserTranscript', browserTranscript.trim());
  const { data } = await api.post('/voice/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data', 'X-InterviewAI-Feature': 'voice-interview' },
    signal,
  });
  return { transcript: data.transcript, audioUrl: data.audioUrl };
}

export async function saveVoiceAnswer(payload) {
  const { data } = await api.post('/interview/voice-answer', payload);
  return data.interview;
}
