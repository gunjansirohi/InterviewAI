import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Loader from '../../components/Loader';
import InterviewResult from '../interview/InterviewResult';
import { getInterview } from '../interview/interviewService';
import { requestInterviewFollowUp } from '../interview/interviewService';
import AIInterviewerAvatar from '../interview/AIInterviewerAvatar';
import SpeechRecognition from './SpeechRecognition';
import TextToSpeech from './TextToSpeech';
import { saveVoiceAnswer } from './voiceService';

export default function VoiceInterviewRoom() {
  const { id } = useParams();
  const location = useLocation();
  const [interview, setInterview] = useState(location.state?.interview || null);
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(!location.state?.interview);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (interview) return;
    let active = true;
    getInterview(id).then((result) => { if (active) setInterview(result); }).catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load this interview.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, interview]);

  const answeredIndexes = useMemo(() => new Set(interview?.answers.map((item) => item.questionIndex) || []), [interview]);
  const currentIndex = interview?.questions.findIndex((_question, index) => !answeredIndexes.has(index)) ?? -1;
  const complete = Boolean(interview) && currentIndex === -1;

  const submit = async () => {
    if (!transcript.trim()) return;
    setSaving(true); setError('');
    try {
      const updated = await saveVoiceAnswer({ interviewId: id, questionIndex: currentIndex, transcript, audioUrl });
      setInterview(await requestInterviewFollowUp({ interviewId: id, questionIndex: currentIndex }).catch(() => updated));
      setTranscript('');
      setAudioUrl('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save your voice answer.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (!interview) return <PageError message={error || 'Interview not found.'} />;
  const question = interview.questions[currentIndex];

  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <div className="mb-6"><p className="font-semibold text-brand-600">Voice interview</p><h1 className="mt-1 text-3xl font-bold text-slate-900">{interview.role}</h1></div>
      {complete ? <InterviewResult interview={interview} /> : <>
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-brand-600 transition-all" style={{ width: `${(currentIndex / interview.questions.length) * 100}%` }} /></div>
        {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <article className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 md:grid-cols-[220px_1fr]">
          <AIInterviewerAvatar speaking={speaking} compact />
          <div><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-semibold text-brand-600">Question {currentIndex + 1} of {interview.questions.length}</span><TextToSpeech key={currentIndex} text={question.question} onSpeakingChange={setSpeaking} /></div>
          <h2 className="mt-6 text-2xl font-bold leading-9 text-slate-900">{question.question}</h2>
          <SpeechRecognition transcript={transcript} onTranscriptChange={setTranscript} onAudioReady={setAudioUrl} disabled={saving} />
          <div className="mt-5 flex justify-end"><button type="button" onClick={submit} disabled={saving || !transcript.trim()} className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving...' : currentIndex === interview.questions.length - 1 ? 'Finish interview' : 'Submit and continue'}</button></div></div>
        </article>
      </>}
    </section>
  );
}

function PageError({ message }) {
  return <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-12"><div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{message}</div></div>;
}
