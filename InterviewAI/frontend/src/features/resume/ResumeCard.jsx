import ATSResumeScoreCard from './ATSResumeScoreCard';

function Section({ title, children, empty, emptyText = 'Not found in the resume.' }) {
  return <section><h3 className="text-base font-semibold text-slate-900">{title}</h3><div className="mt-3">{empty ? <p className="text-sm text-slate-500">{emptyText}</p> : children}</div></section>;
}

function uniqueValues(values = []) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values.filter((value) => {
    const normalized = String(value || '').replace(/^[\u2022\u25CF\u25AA\u25E6\s-]+/, '').replace(/\s+/g, ' ').trim();
    const key = normalized.toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((value) => String(value).replace(/^[\u2022\u25CF\u25AA\u25E6\s-]+/, '').replace(/\s+/g, ' ').trim());
}

const skillCategories = [
  ['Programming Languages', /^(?:java|python|c(?:\+\+|#)?|javascript|typescript|go|golang|ruby|php|kotlin|swift)$/i],
  ['Web Development', /^(?:html5?|css3?|react(?:\.js)?|next(?:\.js)?|node(?:\.js)?|express(?:\.js)?|angular|vue(?:\.js)?|django|flask|spring(?: boot)?|rest(?:ful)? api(?:s)?)$/i],
  ['Database', /(?:mongo(?:db)?|sql|postgres(?:ql)?|mysql|sqlite|redis|firebase|dynamodb|oracle)/i],
  ['Core Computer Science', /(?:data structures?(?:\s*&\s*algorithms?)?|algorithms?|dsa|oops?|object-oriented programming|dbms|operating systems?|computer networks?)/i],
  ['Tools', /^(?:git|github|gitlab|docker|kubernetes|postman|figma|jira|linux|aws|azure|gcp)$/i],
  ['Soft Skills', /(?:problem solving|adaptability|communication|teamwork|leadership|collaboration|critical thinking|time management)/i],
];

function categorizeSkills(skills) {
  const remaining = [...skills];
  const categories = skillCategories.flatMap(([label, pattern]) => {
    const items = remaining.filter((skill) => pattern.test(skill));
    for (const item of items) remaining.splice(remaining.indexOf(item), 1);
    return items.length ? [{ label, items }] : [];
  });
  return remaining.length ? [...categories, { label: 'Additional Skills', items: remaining }] : categories;
}

function ProjectCard({ project }) {
  const technologies = uniqueValues(project.technologies);
  const descriptions = uniqueValues(project.descriptions);
  return <div className="rounded-xl bg-slate-50 p-4"><h4 className="text-base font-semibold text-slate-900">{project.name || 'Unnamed project'}</h4>{technologies.length > 0 && <div className="mt-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Technologies</p><p className="mt-1 text-sm leading-6 text-slate-700">{technologies.join(', ')}</p></div>}{descriptions.length > 0 && <div className="mt-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p><ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{descriptions.map((description, index) => <li key={`${description}-${index}`}>{description}</li>)}</ul></div>}</div>;
}

function EducationEntry({ item }) {
  const degree = item.degree || 'Degree not listed';
  const field = item.field && !degree.toLocaleLowerCase().includes(item.field.toLocaleLowerCase()) ? ` in ${item.field}` : '';
  return <article><p className="text-sm font-medium leading-6 text-slate-900">{degree}{field}</p>{item.institution && <p className="mt-1 text-sm leading-6 text-slate-700">{item.institution}</p>}{item.dates && <p className="mt-1 text-sm leading-6 text-slate-600">{item.dates}</p>}</article>;
}

export default function ResumeCard({ resume }) {
  const analysis = resume.extractedInformation || {};
  const skills = uniqueValues(analysis.skills);
  const categorizedSkills = categorizeSkills(skills);
  const certifications = uniqueValues(resume.certifications || analysis.certifications || []);
  return <article className="mt-6 space-y-9 bg-white px-1 py-2 sm:px-2"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-900">{resume.analysisProvider === 'local' ? 'Basic resume profile' : 'AI resume profile'}</h2><p className="mt-1 text-sm text-slate-500">{resume.originalFileName}</p></div><time className="text-sm text-slate-500">Analyzed {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(resume.createdAt))}</time></div>{resume.analysisWarning && <p role="status" className="bg-amber-50 p-3 text-sm text-amber-900">{resume.analysisWarning}</p>}<ATSResumeScoreCard analysis={analysis.atsAnalysis} /><Section title="Summary" empty={!analysis.summary}><p className="leading-7 text-slate-700">{analysis.summary}</p></Section><Section title="Skills" empty={!skills.length}><div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">{categorizedSkills.map(({ label, items }) => <div key={label}><h4 className="text-sm font-medium text-slate-900">{label}</h4><ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700">{items.map((skill) => <li key={skill}>{skill}</li>)}</ul></div>)}</div></Section><Section title="Projects" empty={!analysis.projects?.length}><div className="grid gap-4 sm:grid-cols-2">{analysis.projects.map((project, index) => <ProjectCard key={`${project.name}-${index}`} project={project} />)}</div></Section><Section title="Education" empty={!analysis.education?.length}><div className="space-y-5">{analysis.education.map((item, index) => <EducationEntry key={`${item.institution}-${index}`} item={item} />)}</div></Section><Section title="Certifications" empty={!certifications.length} emptyText="No certifications detected"><ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700">{certifications.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></Section><Section title="Experience" empty={!analysis.experience?.length}><div className="space-y-5">{analysis.experience.map((item, index) => <div key={`${item.company}-${index}`}><h4 className="text-sm font-medium text-slate-900">{item.role || 'Role not listed'}</h4><p className="mt-1 text-sm text-slate-600">{[item.company, item.dates].filter(Boolean).join(' - ')}</p>{item.highlights?.length > 0 && <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-600">{item.highlights.map((highlight, highlightIndex) => <li key={`${highlight}-${highlightIndex}`}>{highlight}</li>)}</ul>}</div>)}</div></Section><Section title="Strengths" empty={!analysis.strengths?.length}><ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700">{analysis.strengths.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></Section><Section title="Weaknesses" empty={!analysis.weaknesses?.length}><ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700">{analysis.weaknesses.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></Section><Section title="Suggestions" empty={!analysis.improvementSuggestions?.length}><ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700">{analysis.improvementSuggestions.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></Section></article>;
}
