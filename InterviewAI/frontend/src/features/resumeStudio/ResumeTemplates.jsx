const templates = [{ id: 'classic', label: 'Classic' }, { id: 'modern', label: 'Modern' }, { id: 'minimal', label: 'Minimal' }];

export default function ResumeTemplates({ value, onChange }) {
  return <section><h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Template</h3><div className="mt-3 grid grid-cols-3 gap-3">{templates.map((template) => <button key={template.id} type="button" onClick={() => onChange(template.id)} className={`rounded-xl border p-3 text-sm font-semibold ${value === template.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}><span className={`mx-auto mb-2 block h-12 w-9 rounded border bg-white ${template.id === 'modern' ? 'border-t-8 border-t-brand-600' : template.id === 'minimal' ? 'border-slate-200' : 'border-t-4 border-t-slate-700'}`} />{template.label}</button>)}</div></section>;
}
