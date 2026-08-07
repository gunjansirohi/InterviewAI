import { useEffect, useState } from 'react';
import { getResumeVersions } from './resumeStudioService';

export default function ResumeVersionHistory({ resumeId, refreshKey }) {
  const [versions, setVersions] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!resumeId) return;
    let active = true;
    getResumeVersions(resumeId).then((items) => { if (active) setVersions(items); }).catch(() => { if (active) setError('Unable to load versions.'); });
    return () => { active = false; };
  }, [resumeId, refreshKey]);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold text-slate-900">Version history</h2>{error ? <p className="mt-3 text-sm text-red-600">{error}</p> : versions.length ? <ol className="mt-4 space-y-3">{versions.slice(0, 8).map((version) => <li key={version._id} className="flex justify-between text-sm"><span className="font-medium text-slate-700">Version {version.versionNumber}</span><time className="text-slate-500">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(version.createdAt))}</time></li>)}</ol> : <p className="mt-3 text-sm text-slate-500">Save the resume to create versions.</p>}</section>;
}
