import api from '../../services/api';

export async function transcribeRecording(blob, browserTranscript = '', signal) {
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error('Microphone audio not detected. Record your response again.');
  }
  const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const formData = new FormData();
  formData.append('audio', blob, `answer-${Date.now()}.${extension}`);
  if (browserTranscript.trim()) formData.append('browserTranscript', browserTranscript.trim());
  console.info('[transcription-upload-request]', { bytes: blob.size, mimeType: blob.type || `audio/${extension}`, hasBrowserTranscript: Boolean(browserTranscript.trim()), extension });
  const { data } = await api.post('/voice/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data', 'X-InterviewAI-Feature': 'voice-interview' },
    signal,
  });
  console.info('[transcription-upload-response]', { transcriptCharacters: data?.transcript?.length || 0, source: data?.transcriptionSource });
  return { transcript: data.transcript, audioUrl: data.audioUrl };
}

export async function saveVoiceAnswer(payload) {
  const { data } = await api.post('/interview/voice-answer', payload);
  return data.interview;
}
