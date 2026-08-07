import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInterviewHistory } from './analyticsService';

const emptyFilters = { search: '', interviewType: '', difficulty: '', dateFrom: '', dateTo: '' };

export default function InterviewHistory() {
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true; setLoading(true); setError('');
    getInterviewHistory({ ...filters, page, limit: 8 }).then((data) => { if (active) setResult(data); }).catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load interview history.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, page]);

  const update = ({ target }) => setDraft((current) => ({ ...current, [target.name]: target.value }));
  const search = (event) => { event.preventDefault(); setPage(1); setFilters(draft); };
  const clear = () => { setDraft(emptyFilters); setFilters(emptyFilters); setPage(1); };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Interview history</h2>
      <form onSubmit={search} className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
        <input name="search" value={draft.search} onChange={update} placeholder="Search role" className="rounded-lg border border-slate-300 px-3 py-2 text-sm lg:col-span-2" />
        <select name="interviewType" value={draft.interviewType} onChange={update} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">All types</option><option value="hr">HR</option><option value="technical">Technical</option><option value="dsa">DSA</option><option value="project">Project Discussion</option><option value="system-design">System Design</option><option value="behavioral">Behavioral (legacy)</option><option value="mixed">Mixed (legacy)</option></select>
        <select name="difficulty" value={draft.difficulty} onChange={update} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">All difficulties</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
        <input aria-label="From date" name="dateFrom" type="date" value={draft.dateFrom} onChange={update} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input aria-label="To date" name="dateTo" type="date" value={draft.dateTo} onChange={update} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <div className="flex gap-2 lg:col-span-6"><button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Apply filters</button><button type="button" onClick={clear} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Clear</button></div>
      </form>
      {error && <p role="alert" className="mt-5 text-sm text-red-600">{error}</p>}
      {loading ? <p className="mt-6 text-sm text-slate-500">Loading interviews...</p> : result?.interviews.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-slate-200 text-slate-500"><tr><th className="pb-3 font-medium">Role</th><th className="pb-3 font-medium">Type</th><th className="pb-3 font-medium">Difficulty</th><th className="pb-3 font-medium">Date</th><th className="pb-3 font-medium">Score</th><th className="pb-3 font-medium">Report</th></tr></thead><tbody>{result.interviews.map((interview) => <tr key={interview._id} className="border-b border-slate-100"><td className="py-4 font-semibold text-slate-800">{interview.role}</td><td className="py-4 capitalize text-slate-600">{interview.interviewType}</td><td className="py-4 capitalize text-slate-600">{interview.difficulty}</td><td className="py-4 text-slate-600">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(interview.createdAt))}</td><td className="py-4 font-semibold text-slate-800">{interview.score ?? '—'}</td><td className="py-4">{interview.score === null ? <span className="text-slate-400">Not evaluated</span> : <Link to={`/report/${interview._id}`} className="font-semibold text-brand-600">View</Link>}</td></tr>)}</tbody></table></div> : !loading && <p className="mt-6 text-sm text-slate-500">No interviews match these filters.</p>}
      {result?.pagination.pages > 1 && <div className="mt-5 flex items-center justify-between"><button type="button" onClick={() => setPage((value) => value - 1)} disabled={page === 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-sm text-slate-500">Page {page} of {result.pagination.pages}</span><button type="button" onClick={() => setPage((value) => value + 1)} disabled={page === result.pagination.pages} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">Next</button></div>}
    </section>
  );
}
