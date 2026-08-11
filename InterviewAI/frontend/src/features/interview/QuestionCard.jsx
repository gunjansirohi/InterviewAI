export default function QuestionCard({ question, answer, onAnswerChange, onNext, onSkip, saving, isLast, position, total }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-brand-600">Question {position} of {total}</span>
        <div className="flex gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{question.category}</span><span className="rounded-full bg-brand-50 px-3 py-1 capitalize text-brand-700">{question.difficulty}</span></div>
      </div>
      <h2 className="mt-6 text-2xl font-bold leading-9 text-slate-900">{question.question}</h2>
      <label className="mt-7 block text-sm font-medium text-slate-700">Your answer<textarea value={answer} onChange={(event) => onAnswerChange(event.target.value)} rows={8} maxLength={10000} placeholder="Write a clear, structured answer..." className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 leading-6 outline-none focus:border-brand-600" /></label>
      <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onSkip} disabled={saving} className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Skipping...' : 'Skip question'}</button><button type="button" onClick={onNext} disabled={saving || !answer.trim()} className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving...' : isLast ? 'Finish interview' : 'Save and continue'}</button></div>
    </article>
  );
}
