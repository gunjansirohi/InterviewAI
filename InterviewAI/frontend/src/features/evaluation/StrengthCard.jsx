export default function StrengthCard({ strengths }) {
  return <ListCard title="Strengths" items={strengths} color="text-emerald-700" marker="✓" empty="No specific strengths were identified." />;
}

export function ListCard({ title, items, color, marker, empty }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className={`text-xl font-bold ${color}`}>{title}</h2>{items.length ? <ul className="mt-4 space-y-3">{items.map((item) => <li key={item} className="flex gap-3 text-slate-700"><span className={color} aria-hidden="true">{marker}</span><span>{item}</span></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">{empty}</p>}</article>;
}
