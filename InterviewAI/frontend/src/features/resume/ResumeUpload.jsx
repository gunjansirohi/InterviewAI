import { useRef, useState } from 'react';
import { uploadResume } from './resumeService';

const allowedTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const allowedExtensions = ['.pdf', '.docx'];
const maximumBytes = 5 * 1024 * 1024;

export default function ResumeUpload({ onAnalysisStart, onAnalysisComplete, onUploaded, onExistingProfile, onReset }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const selectFile = (event) => {
    const selected = event.target.files?.[0];
    setError('');
    if (!selected) return;
    const extension = selected.name.slice(selected.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(extension) || (selected.type && !allowedTypes.includes(selected.type))) {
      setFile(null);
      setError('Choose a PDF or DOCX file.');
      return;
    }
    if (!selected.size) {
      setFile(null);
      setError('The selected resume is empty.');
      return;
    }
    if (selected.size > maximumBytes) {
      setFile(null);
      setError('The resume must be 5 MB or smaller.');
      return;
    }
    onReset?.();
    setFile(selected);
    setProgress(0);
  };

  const submit = async (event) => {
    event?.preventDefault();
    if (!file) return setError('Choose a resume before uploading.');
    onReset?.();
    onAnalysisStart?.();
    setUploading(true);
    setProgress(0);
    setError('');
    try {
      const resume = await uploadResume(file, setProgress);
      onUploaded(resume);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (requestError) {
      const response = requestError.response?.data;
      if (response?.code === 'RESUME_PROFILE_EXISTS' && response.resume) {
        onExistingProfile?.(response.resume);
      }
      setError(response?.message || 'Resume upload failed. Please try again.');
    } finally {
      setUploading(false);
      onAnalysisComplete?.();
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Resume analysis</h2>
      <p className="mt-1 text-sm text-slate-500">Upload a PDF or DOCX resume to extract your professional profile.</p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex-1 cursor-pointer rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:border-brand-600">
          <span className="block truncate">{file?.name || 'Choose your resume'}</span>
          <input ref={inputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={selectFile} disabled={uploading} className="sr-only" />
        </label>
        <button type="submit" disabled={!file || uploading} className="rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
          {uploading ? 'Analyzing...' : 'Upload resume'}
        </button>
      </form>
      {uploading && <div className="mt-4" aria-label={`Upload ${progress}% complete`}><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-right text-xs text-slate-500">{progress < 100 ? `Uploading ${progress}%` : 'Analyzing resume...'}</p></div>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}

