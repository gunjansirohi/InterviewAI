export default function AIInterviewerAvatar({ speaking = false, compact = false }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 text-white shadow-xl ${compact ? 'p-4' : 'p-6'}`} aria-label={speaking ? 'AI interviewer is speaking' : 'AI interviewer is listening'}>
      <div className="absolute -right-10 -top-10 size-32 rounded-full bg-brand-500/20 blur-2xl" />
      <div className="relative mx-auto w-fit">
        <div className="mx-auto h-3 w-16 rounded-t-full bg-brand-400/80" />
        <div className="relative h-28 w-32 rounded-[2rem] border border-slate-600 bg-gradient-to-b from-slate-700 to-slate-900 shadow-inner">
          <div className="absolute left-5 right-5 top-7 flex justify-between">
            <span className={`h-4 w-7 rounded-full bg-cyan-300 shadow-[0_0_14px_#67e8f9] ${speaking ? 'animate-pulse' : ''}`} />
            <span className={`h-4 w-7 rounded-full bg-cyan-300 shadow-[0_0_14px_#67e8f9] ${speaking ? 'animate-pulse' : ''}`} />
          </div>
          <div className={`absolute bottom-6 left-1/2 h-2 -translate-x-1/2 rounded-full bg-brand-400 transition-all ${speaking ? 'w-14 animate-pulse' : 'w-8'}`} />
          <span className="absolute -left-3 top-10 h-10 w-3 rounded-l-full bg-slate-600" />
          <span className="absolute -right-3 top-10 h-10 w-3 rounded-r-full bg-slate-600" />
        </div>
        <div className="mx-auto h-5 w-8 bg-slate-600" />
        <div className="mx-auto h-8 w-24 rounded-t-2xl border-x border-t border-slate-600 bg-slate-800" />
      </div>
      <div className="relative mt-3 text-center"><p className="font-semibold">ARIA · AI Interviewer</p><p className="text-xs text-slate-300">{speaking ? 'Asking your next question…' : 'Listening carefully'}</p></div>
    </div>
  );
}
