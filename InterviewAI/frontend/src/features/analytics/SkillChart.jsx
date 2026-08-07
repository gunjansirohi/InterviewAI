import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';

export default function SkillChart({ scores }) {
  const data = [{ skill: 'Technical', score: scores.technical }, { skill: 'Communication', score: scores.communication }, { skill: 'Problem solving', score: scores.problemSolving }];
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold text-slate-900">Skill profile</h2><p className="mt-1 text-sm text-slate-500">Average category performance</p><div className="mt-3 h-72"><ResponsiveContainer width="100%" height="100%"><RadarChart data={data} outerRadius="68%"><PolarGrid /><PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} /><Radar dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.28} /></RadarChart></ResponsiveContainer></div></article>;
}
