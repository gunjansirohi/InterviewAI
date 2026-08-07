import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return <AuthForm title="Welcome back" submitLabel="Sign in" form={form} setForm={setForm} onSubmit={handleSubmit} error={error} submitting={submitting} footer={<>New to InterviewAI? <Link className="font-semibold text-brand-600" to="/register">Create an account</Link></>} />;
}

function AuthForm({ title, submitLabel, form, setForm, onSubmit, error, submitting, footer }) {
  const update = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }));
  return <section className="mx-auto w-full max-w-md flex-1 px-6 py-16"><form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-3xl font-bold">{title}</h1>{error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}<label className="block text-sm font-medium">Email<input name="email" type="email" autoComplete="email" required value={form.email} onChange={update} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" /></label><label className="block text-sm font-medium">Password<input name="password" type="password" autoComplete="current-password" required minLength={8} value={form.password} onChange={update} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" /></label><button disabled={submitting} className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Please wait...' : submitLabel}</button><p className="text-center text-sm text-slate-600">{footer}</p></form></section>;
}
