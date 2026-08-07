function FeedbackList({ title, items, marker, tone }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <ul className={`mt-2 space-y-1 text-sm ${tone}`}>
        {items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2"><span aria-hidden="true">{marker}</span><span>{item}</span></li>)}
      </ul>
    </div>
  );
}

export default function ATSResumeScoreCard({ analysis }) {
  if (!analysis) return null;
  const score = Math.max(0, Math.min(100, Math.round(Number(analysis.atsScore) || 0)));
  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5" aria-labelledby="ats-score-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 id="ats-score-heading" className="text-lg font-bold text-slate-900">ATS Score</h3><p className="text-sm text-slate-600">Sections, keywords, and resume quality</p></div>
        <div className="text-4xl font-bold text-brand-600">{score}<span className="text-base text-slate-500">/100</span></div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <FeedbackList title="Strengths" items={analysis.strengths} marker="✓" tone="text-emerald-700" />
        <FeedbackList title="Weaknesses" items={analysis.weaknesses} marker="•" tone="text-rose-700" />
        <FeedbackList title="Missing keywords" items={analysis.missingKeywords} marker="−" tone="text-amber-700" />
        <FeedbackList title="Suggestions" items={analysis.suggestions} marker="→" tone="text-brand-700" />
      </div>
    </section>
  );
}
