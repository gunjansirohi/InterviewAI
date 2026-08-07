export default function ATSScoreCard({ analysis }) {
  if (!analysis) return <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Run an ATS analysis to see your score and keyword recommendations.</div>;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-slate-900">ATS analysis</h2><p className="text-sm text-slate-500">Role alignment and resume quality</p></div><div className="text-3xl font-bold text-brand-600">{analysis.overallScore}<span className="text-sm text-slate-400">/100</span></div></div><Feedback title="Missing keywords" items={analysis.missingKeywords} tone="amber" /><Feedback title="Strengths" items={analysis.strengths} tone="emerald" /><Feedback title="Improvements" items={analysis.improvements} tone="brand" /></section>;
}

function Feedback({ title, items, tone }) {
  const color = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-brand-700';
  return <div className="mt-5"><h3 className={`text-sm font-semibold ${color}`}>{title}</h3>{items.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-1 text-sm text-slate-400">None identified.</p>}</div>;
}
