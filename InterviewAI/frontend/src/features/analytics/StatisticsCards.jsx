const statistics = [
  ['Total interviews', 'totalInterviews', ''],
  ['Average score', 'averageScore', '/100'],
  ['Best score', 'bestScore', '/100'],
  ['Success rate', 'successRate', '%'],
];

export default function StatisticsCards({ analytics }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{statistics.map(([label, key, suffix]) => <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{analytics[key]}<span className="text-base font-medium text-slate-400">{suffix}</span></p></article>)}</div>;
}
