import ResumeCard from './ResumeCard';

function Detail({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">{value || 'Not found'}</dd>
    </div>
  );
}

export default function ResumeProfile({ resume, deleting, reanalyzing, onDelete, onReanalyze }) {
  return (
    <section aria-labelledby="resume-profile-title">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-600">Resume Vault</p>
            <h2 id="resume-profile-title" className="mt-1 text-2xl font-bold text-slate-900">My Resume Profile</h2>
            <p className="mt-1 text-sm text-slate-500">Your saved resume and latest analysis.</p>
          </div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={onReanalyze} disabled={reanalyzing || deleting} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">{reanalyzing ? 'Analyzing...' : 'Run AI analysis'}</button><button type="button" onClick={onDelete} disabled={deleting || reanalyzing} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete saved resume'}</button></div>
        </div>
        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Resume overview</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Name" value={resume.name} />
          <Detail label="Email" value={resume.email} />
          <Detail label="Phone" value={resume.phone} />
          <Detail label="Resume" value={resume.resumeName || resume.originalFileName} />
          <Detail label="File reference" value={resume.fileUrl || resume.filePath} />
          <Detail label="Analysis date" value={resume.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(resume.createdAt)) : ''} />
        </dl>
      </div>
      <ResumeCard resume={resume} />
    </section>
  );
}
