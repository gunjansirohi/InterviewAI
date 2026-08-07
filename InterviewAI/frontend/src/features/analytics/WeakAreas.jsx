export default function WeakAreas({ areas }) {
  return <AreaCard title="Weak areas" areas={areas} tone="amber" empty="No recurring weak areas identified." />;
}

export function AreaCard({ title, areas, tone, empty }) {
  const style = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700';
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold text-slate-900">{title}</h2>{areas.length ? <div className="mt-4 flex flex-wrap gap-2">{areas.map((area) => <span key={area} className={`rounded-full px-3 py-1.5 text-sm font-medium ${style}`}>{area}</span>)}</div> : <p className="mt-4 text-sm text-slate-500">{empty}</p>}</article>;
}
