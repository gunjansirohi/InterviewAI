import { useEffect, useState } from 'react';
import { improveResumeSection } from './resumeStudioService';

export default function AIImprovePanel({ summary, onApply }) {
  const [sectionType, setSectionType] = useState('summary');
  const [content, setContent] = useState(summary || '');
  const [targetRole, setTargetRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (sectionType === 'summary') setContent(summary || ''); }, [summary, sectionType]);

  const improve = async () => {
    if (!content.trim()) return setError('Add content to improve.');
    setLoading(true); setError('');
    try { const improved = await improveResumeSection({ sectionType, content, targetRole }); setContent(improved); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to improve this section.'); }
    finally { setLoading(false); }
  };

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold text-slate-900">AI Improve</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><select value={sectionType} onChange={(event) => setSectionType(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="summary">Summary</option><option value="experience">Experience</option><option value="project">Project</option><option value="skills">Skills</option></select><input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="Target role" className="rounded-lg border border-slate-300 px-3 py-2" /></div><textarea value={content} onChange={(event) => setContent(event.target.value)} rows={6} className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Paste section content here" />{error && <p className="mt-2 text-sm text-red-600">{error}</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={improve} disabled={loading} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Improving...' : 'Improve with AI'}</button><button type="button" onClick={() => onApply(sectionType, content)} disabled={!content.trim()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Apply to resume</button></div></section>;
}
