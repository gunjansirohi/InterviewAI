const axes = [
  { key: 'technicalScore', label: 'Technical', angle: -90 },
  { key: 'communicationScore', label: 'Communication', angle: 30 },
  { key: 'problemSolvingScore', label: 'Problem solving', angle: 150 },
];

function point(angle, radius) {
  const radians = (angle * Math.PI) / 180;
  return [100 + Math.cos(radians) * radius, 100 + Math.sin(radians) * radius];
}

export default function SkillRadarChart({ scores }) {
  const polygon = (radius) => axes.map(({ angle }) => point(angle, radius).join(',')).join(' ');
  const values = axes.map(({ key, angle }) => point(angle, (scores[key] / 100) * 70).join(',')).join(' ');
  return <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-slate-900">Performance radar</h2><svg viewBox="0 0 200 210" className="mx-auto mt-4 w-full max-w-sm" role="img" aria-label="Radar chart of interview category scores"><polygon points={polygon(70)} fill="none" stroke="#cbd5e1" /><polygon points={polygon(35)} fill="none" stroke="#e2e8f0" />{axes.map(({ angle }) => { const [x, y] = point(angle, 70); return <line key={angle} x1="100" y1="100" x2={x} y2={y} stroke="#e2e8f0" />; })}<polygon points={values} fill="#4f46e5" fillOpacity="0.22" stroke="#4f46e5" strokeWidth="2" />{axes.map(({ key, label, angle }) => { const [x, y] = point(angle, 88); return <text key={key} x={x} y={y} textAnchor="middle" className="fill-slate-600 text-[8px]">{label}</text>; })}</svg></article>;
}
