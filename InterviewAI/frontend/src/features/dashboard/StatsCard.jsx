export default function StatsCard({ label, value, helperText }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value ?? '—'}</p>
      {helperText && <p className="mt-2 text-sm text-slate-500">{helperText}</p>}
    </article>
  );
}
