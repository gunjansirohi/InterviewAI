const headings = new Map([
  ['summary', 'summary'], ['professional summary', 'summary'], ['profile', 'summary'], ['objective', 'summary'],
  ['skills', 'skills'], ['technical skills', 'skills'], ['core competencies', 'skills'],
  ['projects', 'projects'], ['project', 'projects'], ['project experience', 'projects'], ['personal projects', 'projects'], ['academic projects', 'projects'],
  ['education', 'education'], ['academic background', 'education'],
  ['experience', 'experience'], ['work experience', 'experience'], ['professional experience', 'experience'], ['employment', 'experience'],
  ['certifications', 'certifications'], ['certificates', 'certifications'], ['professional certifications', 'certifications'], ['courses', 'certifications'],
  ['achievements', 'achievements'], ['awards', 'achievements'], ['honors', 'achievements'],
]);

const bulletPattern = /^(?:[\uE000-\uF8FF\u2022\u25CF\u25AA\u25E6\u25B8\u25BA\u25C6\u2219\u00B7]|-|\*)\s*/;
const technologyLabelPattern = /^(?<label>tech\s*stack|technology\s*stack|technologies(?:\s+used)?|tools(?:\s+used)?|built\s+(?:with|using))\s*:\s*(?<technologies>.*)$/i;

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanItem(value) {
  return value.replace(bulletPattern, '').replace(/\s+/g, ' ').trim();
}

export function parseResumeSections(text) {
  const sections = Object.fromEntries(['general', ...new Set(headings.values())].map((name) => [name, []]));
  let current = 'general';
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const headingKey = cleanItem(line).replace(/[:|]+$/, '').trim().toLocaleLowerCase();
    if (headings.has(headingKey)) {
      current = headings.get(headingKey);
      continue;
    }
    sections[current].push({ text: cleanItem(line), isBullet: bulletPattern.test(line) });
  }
  console.info('[resume-analysis-sections]', Object.fromEntries(Object.entries(sections).filter(([, lines]) => lines.length).map(([name, lines]) => [name, lines.length])));
  return sections;
}

export function extractSkillsFromSection(lines = []) {
  const values = lines.flatMap(({ text }) => text
    .replace(/^(?:skills|technical skills)\s*:\s*/i, '')
    .split(/[,|;/]/)
    .map((item) => item.trim())
    .filter(Boolean));
  return unique(values);
}

function splitTechnologies(value) {
  return unique(value.split(/[,|;/]/).map((item) => item.trim()).filter(Boolean));
}

function isProbableProjectName(line, current) {
  if (line.isBullet || technologyLabelPattern.test(line.text)) return false;
  const wordCount = line.text.split(/\s+/).length;
  if (!current) return true;
  return wordCount <= 12 && (current.technologies.length > 0 || current.descriptions.length > 0);
}

export function extractProjectsFromSection(lines = []) {
  const projects = [];
  let current = null;
  const saveCurrent = () => {
    if (!current?.name) return;
    current.technologies = unique(current.technologies);
    current.descriptions = unique(current.descriptions);
    projects.push(current);
  };

  for (const line of lines) {
    const technologyMatch = line.text.match(technologyLabelPattern);
    if (technologyMatch) {
      if (!current) current = { name: 'Unnamed project', technologies: [], descriptions: [] };
      const technologies = splitTechnologies(technologyMatch.groups.technologies);
      console.info('[resume-project-technology-keywords]', {
        project: current.name,
        label: technologyMatch.groups.label,
        technologies,
      });
      current.technologies.push(...technologies);
      continue;
    }
    if (isProbableProjectName(line, current)) {
      saveCurrent();
      const inlineStack = line.text.match(/^(.+?)\s+(?:-|\u2013|\u2014|\|)\s+(.+)$/);
      current = {
        name: inlineStack?.[1]?.trim() || line.text,
        technologies: inlineStack ? splitTechnologies(inlineStack[2]) : [],
        descriptions: [],
      };
      console.info('[resume-project-text-detected]', { project: current.name, text: line.text });
      continue;
    }
    if (!current) current = { name: line.text, technologies: [], descriptions: [] };
    else if (line.text) current.descriptions.push(line.text);
  }
  saveCurrent();

  console.info('[resume-project-final-technologies]', projects.map(({ name, technologies }) => ({ name, technologies })));
  console.info('[resume-project-descriptions]', projects.map(({ name, descriptions }) => ({ name, descriptions })));
  return projects.slice(0, 12);
}

