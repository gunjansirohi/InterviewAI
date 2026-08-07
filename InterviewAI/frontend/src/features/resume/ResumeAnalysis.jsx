import { useEffect, useState } from 'react';
import ResumeProfile from './ResumeProfile';
import ResumeUpload from './ResumeUpload';
import { deleteResumeProfile, getResumeProfile, reanalyzeResumeProfile } from './resumeService';

export default function ResumeAnalysis() {
  const [resume, setResume] = useState(null);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getResumeProfile().then((savedResume) => {
      if (active) setHasSavedProfile(Boolean(savedResume));
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Could not check your saved resume.');
    }).finally(() => {
      if (active) setChecking(false);
    });
    return () => { active = false; };
  }, []);

  const viewProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const savedResume = await getResumeProfile();
      setResume(savedResume);
      setHasSavedProfile(Boolean(savedResume));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load your resume profile.');
    } finally {
      setLoading(false);
    }
  };

  const deleteProfile = async () => {
    setDeleting(true);
    setError('');
    try {
      await deleteResumeProfile();
      setResume(null);
      setHasSavedProfile(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not delete your resume profile.');
    } finally {
      setDeleting(false);
    }
  };

  const reanalyzeProfile = async () => {
    setReanalyzing(true);
    setError('');
    try {
      const updatedResume = await reanalyzeResumeProfile();
      setResume(updatedResume);
      setHasSavedProfile(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not run AI resume analysis.');
    } finally {
      setReanalyzing(false);
    }
  };

  if (checking) return <p role="status" className="mt-8 text-sm text-slate-500">Checking for your saved resume...</p>;

  return (
    <div className="mt-8">
      {hasSavedProfile && !resume && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-brand-600">Resume Vault</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">My Resume Profile</h2>
          <p className="mt-2 text-sm text-slate-500">You already have an analyzed resume saved. View it instead of uploading it again.</p>
          <button type="button" onClick={viewProfile} disabled={loading} className="mt-5 rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Loading profile...' : 'View My Resume Profile'}</button>
        </section>
      )}
      {!hasSavedProfile && !resume && (
        <ResumeUpload
          onAnalysisStart={() => setLoading(true)}
          onAnalysisComplete={() => setLoading(false)}
          onUploaded={(result) => { setResume(result); setHasSavedProfile(true); setError(''); }}
          onExistingProfile={(result) => { setResume(result); setHasSavedProfile(true); }}
          onReset={() => { setResume(null); setError(''); }}
        />
      )}
      {loading && !hasSavedProfile && <p role="status" className="mt-4 text-sm text-slate-500">Analyzing your new resume...</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      {resume && <ResumeProfile resume={resume} deleting={deleting} reanalyzing={reanalyzing} onDelete={deleteProfile} onReanalyze={reanalyzeProfile} />}
    </div>
  );
}
