export default function PerformanceSummary({ report }) {
  const label = report.overallScore >= 80 ? 'Strong performance' : report.overallScore >= 60 ? 'Developing performance' : 'Needs focused improvement';
  return <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm sm:p-8"><p className="text-sm font-semibold uppercase tracking-wide text-indigo-300">Performance summary</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">{label}</h1><p className="mt-2 text-slate-300">AI-generated feedback based on your recorded interview answers.</p></div><div className="text-5xl font-bold">{report.overallScore}<span className="text-xl text-slate-400">/100</span></div></div></section>;
}
