import { NavLink } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

const navClass = ({ isActive }) => `transition-colors hover:text-brand-600 ${isActive ? 'font-semibold text-brand-600' : 'text-slate-600'}`;

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4" aria-label="Main navigation">
        <NavLink to="/" className="text-xl font-bold">Interview<span className="text-brand-600">AI</span></NavLink>
        <div className="flex flex-wrap items-center gap-4">
          <NavLink to="/" className={navClass}>Home</NavLink>
          {isAuthenticated ? <>
            <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
            <NavLink to="/analytics" className={navClass}>Analytics</NavLink>
            <NavLink to="/resume-studio" className={navClass}>Resume Studio</NavLink>
            <NavLink to="/coding" className={navClass}>Coding</NavLink>
            <NavLink to="/interview/setup" className={navClass}>Interview</NavLink>
            <NavLink to="/evaluations" className={navClass}>Reports</NavLink>
            <button type="button" onClick={logout} className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700">Logout</button>
          </> : <>
            <NavLink to="/login" className={navClass}>Login</NavLink>
            <NavLink to="/register" className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">Register</NavLink>
          </>}
        </div>
      </nav>
    </header>
  );
}
