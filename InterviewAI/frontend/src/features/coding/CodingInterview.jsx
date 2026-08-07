import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import AIReviewPanel from './AIReviewPanel';
import CodingResult from './CodingResult';
import MonacoEditor from './MonacoEditor';
import OutputPanel from './OutputPanel';
import ProblemPanel from './ProblemPanel';
import TestCasePanel from './TestCasePanel';
import { getCodingBatch, getCodingInterview, runCode, submitCode } from './codingService';

export default function CodingInterview() {
  const { id } = useParams();
  const location = useLocation();
  const [interview, setInterview] = useState(location.state?.interview || null);
  const [code, setCodeState] = useState(location.state?.interview?.starterCode || '');
  const codeRef = useRef(location.state?.interview?.starterCode || '');
  const [codeEdited, setCodeEdited] = useState(false);
  const setCode = (nextCode) => { codeRef.current = nextCode; setCodeState(nextCode); setCodeEdited(true); setExecution(null); setError(nextCode.trim() ? '' : 'Please write your code before running.'); };
  const [input, setInput] = useState(location.state?.interview?.publicTestCases?.[0]?.input || '');
  const [execution, setExecution] = useState(null);
  const [result, setResult] = useState(null);
  const [nextInterview, setNextInterview] = useState(null);
  const [loading, setLoading] = useState(!location.state?.interview);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { const timer = setInterval(() => setElapsed((value) => value + 1), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (interview?._id === id) return;
    let active = true;
    setLoading(true); setResult(null); setNextInterview(null); setExecution(null); setElapsed(0); setError('');
    getCodingInterview(id).then((item) => { if (active) { const loadedCode = item.starterCode || ''; setInterview(item); codeRef.current = loadedCode; setCodeState(loadedCode); setCodeEdited(false); setInput(item.publicTestCases?.[0]?.input || ''); } }).catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load the coding interview.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, interview]);

  const validateCode = () => {
    if (!codeRef.current.trim() || !codeEdited) {
      setExecution(null);
      setError('Please write your code before running.');
      return false;
    }
    return true;
  };
  const run = async () => { if (!validateCode()) return; setRunning(true); setExecution(null); setError(''); try { setExecution(await runCode(id, { code: codeRef.current, sourceCode: codeRef.current, language: interview.language, input, testCases: interview.publicTestCases || [], problemId: id })); } catch (requestError) { setError(requestError.response?.data?.error || requestError.response?.data?.message || 'Code execution failed.'); } finally { setRunning(false); } };
  const submit = async () => {
    if (!validateCode()) return;
    setSubmitting(true); setError('');
    try { const submitted = await submitCode(id, codeRef.current); setResult(submitted); const batch = await getCodingBatch(submitted.interview.batchId); setNextInterview(batch.find((item) => item.questionNumber === submitted.interview.questionNumber + 1) || null); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to submit the solution.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <main className="flex flex-1 items-center justify-center text-slate-500">Loading coding workspace...</main>;
  if (!interview) return <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12"><div className="rounded-lg bg-red-50 p-4 text-red-700">{error || 'Coding interview not found.'}</div></main>;
  if (result) return <CodingResult interview={result.interview} evaluation={result.evaluation} nextInterview={nextInterview} />;

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  return <main className="flex flex-1 flex-col bg-slate-100"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3"><div><span className="font-bold text-slate-900">{interview.language.toUpperCase()}</span><span className="ml-3 text-sm text-slate-500">Question {interview.questionNumber}</span></div><div className="font-mono text-sm font-semibold text-slate-600" aria-label="Interview timer">{minutes}:{seconds}</div></header>{error && <div role="alert" className="mx-4 mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="flex min-h-0 flex-1 flex-col lg:flex-row"><aside className="h-[500px] overflow-auto border-r border-slate-200 bg-white lg:h-auto lg:w-[40%] lg:min-w-[300px] lg:max-w-[65%] lg:resize-x"><ProblemPanel interview={interview} /></aside><section className="min-w-0 flex-1 p-4"><div className="h-[460px] overflow-hidden rounded-xl border border-slate-700"><MonacoEditor language={interview.language} value={code} onChange={setCode} /></div><div className="mt-4 grid gap-4 xl:grid-cols-2"><TestCasePanel testCases={interview.publicTestCases} input={input} onInputChange={setInput} /><OutputPanel execution={execution} loading={running} /></div><div className="mt-4 flex flex-wrap justify-end gap-3"><button type="button" onClick={run} disabled={running || submitting || !code.trim()} className="rounded-lg border border-brand-600 px-5 py-3 font-semibold text-brand-700 disabled:opacity-50">{running ? 'Running...' : 'Run code'}</button><button type="button" onClick={submit} disabled={running || submitting || !code.trim()} className="rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{submitting ? 'Running hidden tests and reviewing...' : 'Submit solution'}</button></div><AIReviewPanel evaluation={null} /></section></div></main>;
}
