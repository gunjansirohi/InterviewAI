import { Link } from 'react-router-dom';

export default function InterviewResult({ interview }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
      <h2 className="mt-5 text-3xl font-bold text-slate-900">Interview completed</h2>
      <p className="mt-2 text-slate-600">All {interview.questions.length} answers were saved successfully.</p>
      <p className="mt-4 text-sm text-slate-500">Score: {interview.score ?? 'Evaluation not available yet'}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3"><Link to={`/evaluation/${interview._id}`} className="rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">Generate AI feedback</Link><Link to="/interview/setup" className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Start another</Link><Link to="/dashboard" className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Dashboard</Link></div>
    </section>
  );
}
