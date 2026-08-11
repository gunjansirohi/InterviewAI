import { useCallback, useEffect, useState } from 'react';
import Loader from '../../components/Loader';
import { useAuth } from '../auth/AuthContext';
import { getDashboardStatistics, getUserProfile } from './dashboardService';
import ProfileCard from './ProfileCard';
import StatsCard from './StatsCard';
import ResumeAnalysis from '../resume/ResumeAnalysis';

export default function Dashboard() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      setError('');
      const [user, analytics] = await Promise.all([getUserProfile(), getDashboardStatistics()]);
      setProfile(user);
      setStatistics(analytics);
      updateUser(user);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load your dashboard.');
    }
  }, [updateUser]);

  useEffect(() => {
    void loadDashboard();
    const refreshStatistics = () => void loadDashboard();
    window.addEventListener('focus', refreshStatistics);
    window.addEventListener('interview-evaluation-complete', refreshStatistics);
    return () => {
      window.removeEventListener('focus', refreshStatistics);
      window.removeEventListener('interview-evaluation-complete', refreshStatistics);
    };
  }, [loadDashboard]);

  if (error) return <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-16"><div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div></div>;
  if (!profile || !statistics) return <Loader />;

  const totalInterviews = statistics.totalInterviews ?? 0;
  const completedSessions = statistics.completedSessions ?? 0;
  const averageScore = statistics.averageScore ?? 0;
  const statisticCards = [
    { label: 'Total interviews', value: totalInterviews, helperText: totalInterviews ? 'Interview sessions created' : 'No interviews created yet' },
    { label: 'Completed sessions', value: completedSessions, helperText: completedSessions ? 'Completed interview sessions' : 'No sessions recorded yet' },
    { label: 'Average score', value: `${averageScore}/100`, helperText: completedSessions ? 'Average from saved evaluations' : 'Scores will appear here' },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <p className="font-semibold text-brand-600">Dashboard</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Welcome back, {profile.name}</h1>
      <p className="mt-2 text-slate-600">Review your profile and interview progress.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_2fr]">
        <ProfileCard user={profile} />
        <div className="grid gap-4 sm:grid-cols-3">
          {statisticCards.map((statistic) => <StatsCard key={statistic.label} {...statistic} />)}
        </div>
      </div>

      <ResumeAnalysis />

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Recent activity</h2>
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
          <p className="font-medium text-slate-700">No recent activity</p>
          <p className="mt-1 text-sm text-slate-500">Your interview sessions will appear here once available.</p>
        </div>
      </section>
    </section>
  );
}
