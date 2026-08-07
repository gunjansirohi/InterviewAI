import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', profilePicture: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const update = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }));
  const handleSubmit = async (event) => {
    event.preventDefault(); setError(''); setSubmitting(true);
    try { await register(form); navigate('/dashboard', { replace: true }); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to create your account.'); }
    finally { setSubmitting(false); }
  };

  return <section className="mx-auto w-full max-w-md flex-1 px-6 py-16"><form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-3xl font-bold">Create an account</h1>{error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}<Field label="Name" name="name" value={form.name} onChange={update} autoComplete="name" minLength={2} /><Field label="Email" name="email" type="email" value={form.email} onChange={update} autoComplete="email" /><Field label="Password" name="password" type="password" value={form.password} onChange={update} autoComplete="new-password" minLength={8} /><label className="block text-sm font-medium">Profile picture URL <span className="text-slate-400">(optional)</span><input name="profilePicture" type="url" value={form.profilePicture} onChange={update} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" /></label><button disabled={submitting} className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{submitting ? 'Creating account...' : 'Create account'}</button><p className="text-center text-sm text-slate-600">Already registered? <Link className="font-semibold text-brand-600" to="/login">Sign in</Link></p></form></section>;
}

function Field({ label, type = 'text', ...props }) {
  return <label className="block text-sm font-medium">{label}<input type={type} required {...props} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" /></label>;
}
