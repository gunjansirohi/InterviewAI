import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Loader from '../../components/Loader';
import { evaluateInterview, getEvaluationHistory, getEvaluationReport } from './evaluationService';
import InterviewReport from './InterviewReport';

export default function EvaluationDashboard() {
  const { interviewId, reportId } = useParams();
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const request = interviewId ? evaluateInterview(interviewId) : reportId ? getEvaluationReport(reportId) : getEvaluationHistory();
    request.then((result) => {
      if (!active) return;
      if (Array.isArray(result)) setHistory(result);
      else setReport(result);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load interview feedback.');
    });
    return () => { active = false; };
  }, [interviewId, reportId]);

  if (error) return <Page><div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div></Page>;
  if (!report && !history) return <Loader />;
  if (report) return <Page><div className="mb-6 flex items-center justify-between gap-4"><div><p className="font-semibold text-brand-600">Interview feedback</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Professional evaluation report</h1></div><Link to="/evaluations" className="text-sm font-semibold text-brand-600">View history</Link></div><InterviewReport report={report} /></Page>;

  return <Page><p className="font-semibold text-brand-600">Evaluation history</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Your interview reports</h1>{history.length ? <div className="mt-7 grid gap-4 sm:grid-cols-2">{history.map((item) => <Link key={item._id} to={`/report/${item._id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-600"><div className="flex justify-between gap-3"><div><h2 className="font-bold text-slate-900">{item.interviewId?.role || 'Interview'}</h2><p className="mt-1 text-sm capitalize text-slate-500">{item.interviewId?.interviewType} · {item.interviewId?.difficulty}</p></div><span className="text-2xl font-bold text-brand-600">{item.overallScore}</span></div><p className="mt-4 text-xs text-slate-400">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(item.createdAt))}</p></Link>)}</div> : <div className="mt-7 rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">No evaluation reports yet.</div>}</Page>;
}

function Page({ children }) {
  return <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">{children}</section>;
}
