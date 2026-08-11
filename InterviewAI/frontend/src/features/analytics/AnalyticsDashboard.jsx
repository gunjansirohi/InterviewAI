import { useEffect, useState } from 'react';
import InterviewHistory from './InterviewHistory';
import PerformanceChart from './PerformanceChart';
import ProgressTimeline from './ProgressTimeline';
import SkillChart from './SkillChart';
import StatisticsCards from './StatisticsCards';
import StrongAreas from './StrongAreas';
import WeakAreas from './WeakAreas';
import { getAnalyticsDashboard, getSkillAnalytics } from './analyticsService';

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [skills, setSkills] = useState(null);
  const [error, setError] = useState('');

  const loadAnalytics = () => {
    let active = true;

    Promise.all([getAnalyticsDashboard(), getSkillAnalytics()]).then(([dashboard, skillData]) => {
      if (active) {
        setAnalytics(dashboard);
        setSkills(skillData);
      }
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load analytics.');
    });

    return () => {
      active = false;
    };
  };

  useEffect(() => {
    const cleanup = loadAnalytics();
    const handleFocus = () => loadAnalytics();
    window.addEventListener('focus', handleFocus);
    return () => {
      cleanup();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  if (error) return <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12"><div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div></main>;
  if (!analytics || !skills) return <main className="flex flex-1 items-center justify-center text-slate-500">Loading performance analytics...</main>;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
      <p className="font-semibold text-brand-600">Analytics</p><h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Performance overview</h1><p className="mt-2 text-slate-600">Track your interview results and focus your preparation.</p>
      <div className="mt-8"><StatisticsCards analytics={analytics} /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2"><PerformanceChart data={analytics.performanceTrend} /><SkillChart scores={skills.skillScores} /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3"><StrongAreas areas={skills.strongAreas} /><WeakAreas areas={skills.weakAreas} /><ProgressTimeline items={analytics.performanceTrend} /></div>
      <div className="mt-6"><InterviewHistory /></div>
    </main>
  );
}
