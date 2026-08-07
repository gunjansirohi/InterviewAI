import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function PerformanceChart({ data }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold text-slate-900">Performance trend</h2><p className="mt-1 text-sm text-slate-500">Overall scores across evaluated interviews</p>{data.length ? <div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.map((item) => ({ ...item, label: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(item.date)) }))}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 12 }} /><Tooltip /><Line type="monotone" dataKey="overallScore" name="Score" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div> : <Empty message="Complete and evaluate interviews to see your trend." />}</article>;
}

function Empty({ message }) { return <div className="mt-5 flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{message}</div>; }
