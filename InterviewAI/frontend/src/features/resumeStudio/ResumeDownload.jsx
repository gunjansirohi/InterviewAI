import { useState } from 'react';
import { downloadResumePdf } from './resumeStudioService';

export default function ResumeDownload({ resumeId, name }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const download = async () => {
    setLoading(true); setError('');
    try { const blob = await downloadResumePdf(resumeId); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${name || 'resume'}.pdf`; anchor.click(); URL.revokeObjectURL(url); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to download the PDF.'); }
    finally { setLoading(false); }
  };
  return <div><button type="button" onClick={download} disabled={!resumeId || loading} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50">{loading ? 'Preparing PDF...' : 'Download PDF'}</button>{error && <p className="mt-2 text-xs text-red-600">{error}</p>}</div>;
}
