const keywordGroups = {
  'programming languages': ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Ruby', 'PHP'],
  frameworks: ['React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', '.NET'],
  databases: ['MongoDB', 'PostgreSQL', 'MySQL', 'SQL', 'Redis', 'DynamoDB'],
  tools: ['Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Jenkins', 'Terraform'],
};

const sectionPatterns = {
  Education: /^\s*(education|academic background)\s*[:|]?\s*$/im,
  Skills: /^\s*(skills|technical skills|core competencies)\s*[:|]?\s*$/im,
  Projects: /^\s*(projects|project experience)\s*[:|]?\s*$/im,
  Experience: /^\s*(experience|work experience|professional experience|employment)\s*[:|]?\s*$/im,
  Certifications: /^\s*((?:professional\s+)?certifications?|certificates?|credentials?|licenses?(?:\s+and\s+certifications?)?|courses?(?:\s+and\s+certifications?)?|training(?:\s+and\s+certifications?)?)\s*[:|]?\s*$/im,
};

const actionVerbPattern = /\b(achieved|built|created|delivered|designed|developed|drove|implemented|improved|increased|launched|led|managed|optimized|reduced|resolved|scaled|streamlined)\b/gi;
const bulletPattern = /^\s*(?:[-*•???]|\d+[.)])\s+/gm;
const certificationContentPattern = /\b(?:certified|certification|certificate|credential|professional certificate|nanodegree|licen[cs]e)\b/i;
const quantifiedPattern = /(?:\b\d+(?:\.\d+)?%|[$?€£]\s?\d|\b\d+\+?\s*(?:users|clients|projects|requests|hours|days|months|years|members|services|applications)\b)/gi;

function containsKeyword(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, 'i').test(text);
}

export function calculateAtsAnalysis(resumeText) {
  const presentSections = Object.entries(sectionPatterns)
    .filter(([name, pattern]) => pattern.test(resumeText) || (name === 'Certifications' && certificationContentPattern.test(resumeText)))
    .map(([name]) => name);
  const missingSections = Object.keys(sectionPatterns).filter((name) => !presentSections.includes(name));
  const matchedGroups = Object.entries(keywordGroups).map(([group, keywords]) => ({ group, matches: keywords.filter((keyword) => containsKeyword(resumeText, keyword)) }));
  const matchedKeywords = matchedGroups.flatMap(({ matches }) => matches);
  const missingKeywords = matchedGroups.flatMap(({ matches }, index) => matches.length ? [] : keywordGroups[Object.keys(keywordGroups)[index]].slice(0, 2));
  const bulletCount = (resumeText.match(bulletPattern) || []).length;
  const actionVerbCount = (resumeText.match(actionVerbPattern) || []).length;
  const quantifiedCount = (resumeText.match(quantifiedPattern) || []).length;

  const sectionScore = presentSections.length * 6;
  const keywordScore = matchedGroups.reduce((score, { matches }) => score + Math.min(7.5, matches.length * 2.5), 0);
  const qualityScore = (presentSections.length >= 4 ? 10 : presentSections.length * 2)
    + Math.min(10, bulletCount * 2)
    + Math.min(10, actionVerbCount * 2)
    + Math.min(10, quantifiedCount * 5);
  const atsScore = Math.max(0, Math.min(100, Math.round(sectionScore + keywordScore + qualityScore)));

  const strengths = [
    presentSections.length >= 4 ? 'Uses clear, ATS-readable section headings.' : '',
    matchedKeywords.length >= 5 ? `Includes ${matchedKeywords.length} recognizable technical keywords.` : '',
    bulletCount >= 3 ? 'Uses bullet points to make achievements easy to scan.' : '',
    actionVerbCount >= 3 ? 'Uses strong action verbs.' : '',
    quantifiedCount >= 2 ? 'Includes quantifiable achievements.' : '',
  ].filter(Boolean);
  const weaknesses = [
    missingSections.length ? `Missing or unclear sections: ${missingSections.join(', ')}.` : '',
    matchedKeywords.length < 5 ? 'Technical keyword coverage is limited.' : '',
    bulletCount < 3 ? 'Few ATS-friendly bullet points were detected.' : '',
    actionVerbCount < 3 ? 'Achievement statements need more strong action verbs.' : '',
    quantifiedCount < 2 ? 'Few measurable outcomes were detected.' : '',
  ].filter(Boolean);
  const suggestions = [
    missingSections.length ? `Add clearly labeled ${missingSections.join(', ')} section${missingSections.length === 1 ? '' : 's'} where applicable.` : '',
    bulletCount < 3 ? 'Use concise bullet points for projects and experience.' : '',
    actionVerbCount < 3 ? 'Begin achievement bullets with specific action verbs.' : '',
    quantifiedCount < 2 ? 'Add truthful metrics such as percentages, scale, time saved, or users supported.' : '',
    'Tailor technical keywords to the target job description without adding unsupported skills.',
  ].filter(Boolean);

  return { atsScore, strengths, weaknesses, missingKeywords: [...new Set(missingKeywords)].slice(0, 8), suggestions };
}

