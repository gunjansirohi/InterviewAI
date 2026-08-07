import { useEffect, useRef, useState } from 'react';
import AudioRecorder from './AudioRecorder';
import { transcribeRecording } from './voiceService';

export default function SpeechRecognition({ transcript, onTranscriptChange, onAudioReady, disabled = false }) {
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    requestRef.current?.abort();
  }, []);

  const processRecording = async (blob, browserTranscript = '') => {
    if (!mountedRef.current) return;
    setTranscribing(true); setError('');
    onAudioReady('');
    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    try {
      const result = await transcribeRecording(blob, browserTranscript, request.signal);
      if (mountedRef.current) {
        onTranscriptChange(result.transcript);
        onAudioReady(result.audioUrl);
      }
    } catch (requestError) {
      if (requestError.code === 'ERR_CANCELED') return;
      if (mountedRef.current) setError(requestError.response?.data?.message || 'Unable to transcribe the recording.');
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
        if (mountedRef.current) setTranscribing(false);
      }
    }
  };

  return (
    <section className="mt-7 rounded-xl bg-slate-50 p-4 sm:p-5">
      <h3 className="font-semibold text-slate-900">Your voice answer</h3>
      <p className="mt-1 text-sm text-slate-500">Record your response, then review or edit the transcript before submitting.</p>
      <div className="mt-4"><AudioRecorder onRecorded={processRecording} onError={setError} disabled={disabled || transcribing} /></div>
      {transcribing && <p role="status" className="mt-3 text-sm font-medium text-brand-600">Transcribing your answer...</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      <label className="mt-5 block text-sm font-medium text-slate-700">Transcript<textarea value={transcript} onChange={(event) => onTranscriptChange(event.target.value)} disabled={disabled || transcribing} rows={6} maxLength={10000} placeholder="Your transcript will appear here..." className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 leading-6 outline-none focus:border-brand-600 disabled:bg-slate-100" /></label>
    </section>
  );
}
