import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import AIImprovePanel from './AIImprovePanel';
import ATSScoreCard from './ATSScoreCard';
import ResumeDownload from './ResumeDownload';
import ResumeEditor from './ResumeEditor';
import ResumePreview from './ResumePreview';
import ResumeTemplates from './ResumeTemplates';
import ResumeVersionHistory from './ResumeVersionHistory';
import { analyzeStudioResume, createStudioResume, getStudioResume, listStudioResumes, updateStudioResume } from './resumeStudioService';

function emptyResume(user) {
  return { personalInfo: { name: user?.name || '', email: user?.email || '', phone: '', location: '', linkedIn: '', website: '' }, summary: '', skills: [], education: [], experience: [], projects: [], certifications: [], languages: [], template: 'classic', atsScore: null };
}

export default function ResumeBuilder() {
  const { user } = useAuth();
  const [resume, setResume] = useState(() => emptyResume(user));
  const [resumes, setResumes] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [versionKey, setVersionKey] = useState(0);

  useEffect(() => {
    let active = true;
    listStudioResumes().then(async (items) => {
      if (!active) return;
      setResumes(items);
      if (items[0]) setResume(await getStudioResume(items[0]._id));
      else setResume(emptyResume(user));
    }).catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load Resume Studio.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const save = async () => {
    if (!resume.personalInfo.name.trim() || !resume.personalInfo.email.trim()) return setError('Name and email are required.');
    setSaving(true); setError(''); setNotice('');
    try {
      const saved = resume._id ? await updateStudioResume(resume._id, resume) : await createStudioResume(resume);
      setResume(saved); setNotice('Resume saved successfully.'); setVersionKey((value) => value + 1);
      setResumes(await listStudioResumes());
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to save the resume.'); }
    finally { setSaving(false); }
  };

  const selectResume = async (id) => {
    if (!id) return;
    setLoading(true); setError(''); setAnalysis(null);
    try { setResume(await getStudioResume(id)); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load the resume.'); }
    finally { setLoading(false); }
  };

  const analyze = async () => {
    if (!resume._id) return setError('Save the resume before running ATS analysis.');
    if (!targetRole.trim()) return setError('Enter a target role for ATS analysis.');
    setAnalyzing(true); setError('');
    try { const result = await analyzeStudioResume({ resumeId: resume._id, targetRole, jobDescription }); setAnalysis(result); setResume((current) => ({ ...current, atsScore: result.overallScore })); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to analyze the resume.'); }
    finally { setAnalyzing(false); }
  };

  const applyImprovement = (sectionType, content) => {
    if (sectionType === 'summary') setResume((current) => ({ ...current, summary: content }));
    if (sectionType === 'skills') setResume((current) => ({ ...current, skills: content.split(/[,\n]/).map((item) => item.trim()).filter(Boolean) }));
    if (sectionType === 'project') setResume((current) => ({ ...current, projects: current.projects.length ? current.projects.map((item, index) => index === 0 ? { ...item, description: content } : item) : [{ name: '', description: content, technologies: [], link: '' }] }));
    if (sectionType === 'experience') setResume((current) => ({ ...current, experience: current.experience.length ? current.experience.map((item, index) => index === 0 ? { ...item, descriptions: content.split('\n').filter(Boolean) } : item) : [{ company: '', role: '', startDate: '', endDate: '', descriptions: content.split('\n').filter(Boolean) }] }));
    setNotice(`Improved ${sectionType} applied. Save to create a version.`);
  };

  if (loading) return <main className="flex flex-1 items-center justify-center text-slate-500">Loading Resume Studio...</main>;
  return <main className="mx-auto w-full max-w-[1500px] flex-1 px-6 py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-semibold text-brand-600">AI Resume Studio</p><h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Build your professional resume</h1></div><div className="flex flex-wrap gap-2">{resumes.length > 0 && <select value={resume._id || ''} onChange={(event) => selectResume(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="" disabled>Select resume</option>{resumes.map((item) => <option key={item._id} value={item._id}>{item.personalInfo.name} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(new Date(item.updatedAt))}</option>)}</select>}<button type="button" onClick={() => { setResume(emptyResume(user)); setAnalysis(null); setNotice('New resume draft created.'); }} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700">New resume</button><button type="button" onClick={save} disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save resume'}</button><ResumeDownload resumeId={resume._id} name={resume.personalInfo.name} /></div></div>{error && <div role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}{notice && <div role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}<div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(500px,0.85fr)]"><div className="space-y-6"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><ResumeTemplates value={resume.template} onChange={(template) => setResume({ ...resume, template })} /><div className="mt-7"><ResumeEditor resume={resume} onChange={setResume} /></div></section><AIImprovePanel summary={resume.summary} onApply={applyImprovement} /><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold text-slate-900">ATS and keyword analysis</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="Target role" className="rounded-lg border border-slate-300 px-3 py-2" /><button type="button" onClick={analyze} disabled={analyzing} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50">{analyzing ? 'Analyzing...' : 'Analyze ATS fit'}</button></div><textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} rows={5} placeholder="Optional job description for more precise keywords" className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2" /></section><ATSScoreCard analysis={analysis} /><ResumeVersionHistory resumeId={resume._id} refreshKey={versionKey} /></div><aside className="xl:sticky xl:top-6 xl:self-start"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">Live preview</h2><span className="text-sm capitalize text-slate-500">{resume.template} template</span></div><div className="overflow-auto rounded-xl bg-slate-200 p-3"><ResumePreview resume={resume} /></div></aside></div></main>;
}
