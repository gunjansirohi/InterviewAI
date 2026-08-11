import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Loader from '../../components/Loader';
import InterviewResult from './InterviewResult';
import QuestionCard from './QuestionCard';
import { getInterview, saveInterviewAnswer, skipInterviewQuestion } from './interviewService';

export default function InterviewRoom() {
  const { id } = useParams();
  const location = useLocation();
  const [interview, setInterview] = useState(location.state?.interview || null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(!location.state?.interview);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (interview) return;
    let active = true;
    getInterview(id).then((result) => { if (active) setInterview(result); }).catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load this interview.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, interview]);

  const answeredIndexes = useMemo(() => new Set(interview?.answers.map((item) => item.questionIndex) || []), [interview]);
  useEffect(() => {
    if (!interview) return;
    const nextIndex = interview.questions.findIndex((_question, index) => !answeredIndexes.has(index));
    setCurrentIndex(nextIndex === -1 ? interview.questions.length : nextIndex);
  }, [interview, answeredIndexes]);

  const saveAndContinue = async () => {
    setSaving(true); setError('');
    try {
      const updated = await saveInterviewAnswer({ interviewId: id, questionIndex: currentIndex, answer });
      setInterview(updated);
      setAnswer('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save your answer.');
    } finally {
      setSaving(false);
    }
  };

  const skipAndContinue = async () => {
    setSaving(true); setError('');
    try {
      const response = await skipInterviewQuestion({ interviewId: id, questionIndex: currentIndex, reason: 'candidate_skipped' });
      setInterview(response.interview);
      setAnswer('');
      setCurrentIndex(response.nextQuestionIndex === -1 ? response.interview.questions.length : response.nextQuestionIndex);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to skip the question.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (error && !interview) return <PageMessage message={error} />;
  if (!interview) return <PageMessage message="Interview not found." />;
  const complete = answeredIndexes.size >= interview.questions.length;

  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="font-semibold text-brand-600">{interview.interviewType} interview</p><h1 className="mt-1 text-3xl font-bold text-slate-900">{interview.role}</h1></div><span className="capitalize text-sm text-slate-500">{interview.difficulty} difficulty</span></div>
      {!complete && <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200" aria-label={`${currentIndex} of ${interview.questions.length} questions complete`}><div className="h-full bg-brand-600 transition-all" style={{ width: `${(currentIndex / interview.questions.length) * 100}%` }} /></div>}
      {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {complete ? <InterviewResult interview={interview} /> : <QuestionCard question={interview.questions[currentIndex]} answer={answer} onAnswerChange={setAnswer} onNext={saveAndContinue} onSkip={skipAndContinue} saving={saving} isLast={currentIndex === interview.questions.length - 1} position={currentIndex + 1} total={interview.questions.length} />}
    </section>
  );
}

function PageMessage({ message }) {
  return <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-12"><div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{message}</div></div>;
}
