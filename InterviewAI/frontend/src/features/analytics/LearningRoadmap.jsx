export default function LearningRoadmap({ items, loading, error }) {
  const hasItems = Array.isArray(items) && items.length > 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">AI learning roadmap</h2>
      <p className="mt-1 text-sm text-slate-500">Prioritized from your interview feedback</p>
      {loading ? (
        <p className="mt-5 text-sm font-medium text-brand-600">Generating your roadmap...</p>
      ) : error ? (
        <div className="mt-5">
          <p role="alert" className="text-sm text-red-600">{error}</p>
          <p className="mt-2 text-sm text-slate-500">No roadmap available.</p>
        </div>
      ) : hasItems ? (
        <ol className="mt-5 grid gap-4 sm:grid-cols-2">
          {items.map((item, index) => (
            <li key={`${item.title}-${index}`} className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-slate-900">{index + 1}. {item.title}</h3>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold capitalize text-slate-600">{item.priority}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-brand-600">{item.focusArea}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {item.actions.map((action) => <li key={action}>{action}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 text-sm text-slate-500">No roadmap available.</p>
      )}
    </section>
  );
}
