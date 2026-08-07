import { useAuth } from '../features/auth/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  return <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-16"><p className="font-semibold text-brand-600">Dashboard</p><h1 className="mt-2 text-4xl font-bold">Welcome, {user.name}</h1><p className="mt-4 text-slate-600">Your protected InterviewAI workspace is ready.</p></section>;
}
