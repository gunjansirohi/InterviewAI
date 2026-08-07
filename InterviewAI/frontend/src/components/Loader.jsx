export default function Loader() {
  return <div className="flex items-center justify-center p-8" role="status" aria-label="Loading"><div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" /><span className="sr-only">Loading...</span></div>;
}
