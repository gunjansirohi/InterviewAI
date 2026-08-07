export default function OutputPanel({ execution, loading }) {
  return (
    <section className="rounded-xl bg-slate-950 p-4 text-sm text-slate-200">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Output console</h3>
        {execution && <span className="text-xs text-slate-400">{execution.executionTime ?? '—'}s · {execution.memoryUsage ?? '—'} KB</span>}
      </div>
      {loading ? <p className="mt-3 text-indigo-300">Executing in secure sandbox...</p> : execution ? (
        <div className="mt-3 space-y-2 font-mono">
          <pre className="whitespace-pre-wrap text-emerald-300">{execution.output || '(no output)'}</pre>
          {execution.stderr && !execution.runtimeError && !execution.compilationError && <pre className="whitespace-pre-wrap text-amber-300">{execution.stderr}</pre>}
          {execution.compilationError && <pre className="whitespace-pre-wrap text-red-300">{execution.compilationError}</pre>}
          {execution.runtimeError && <pre className="whitespace-pre-wrap text-red-300">{execution.runtimeError}</pre>}
          <p className="text-xs text-slate-500">Status: {execution.status}</p>
        </div>
      ) : <p className="mt-3 text-slate-500">Run your code to see output.</p>}
    </section>
  );
}
