import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalAnalysis, normalizeResumeAnalysis, resumeAnalysisSchema } from './resumeService.js';

test('accepts partial AI output by defaulting fields with no resume evidence', () => {
  const parsed = resumeAnalysisSchema.parse({
    projects: [{ name: 'Sample App', technologies: ['React'] }],
    education: [{ institution: 'Example University', degree: 'Bachelor of Technology', dates: '2020 - 2024' }],
    atsAnalysis: { atsScore: 78 },
  });
  assert.equal(parsed.education[0].field, '');
  assert.deepEqual(parsed.improvementSuggestions, []);
  assert.deepEqual(parsed.atsAnalysis.suggestions, []);
});

test('normalizes array and categorized skills into a unique flat string array before validation', () => {
  const parsed = resumeAnalysisSchema.parse(normalizeResumeAnalysis({
    skills: ['Java', 'Python', 'React.js', 'Node.js', ' Java '],
    atsAnalysis: { atsScore: 80 },
  }));
  assert.deepEqual(parsed.skills, ['Java', 'Python', 'React.js', 'Node.js']);

  const categorized = resumeAnalysisSchema.parse(normalizeResumeAnalysis({
    skills: { programming: ['Java', 'Python', 42], frontend: ['React', 'Java'] },
    atsAnalysis: { atsScore: 80 },
  }));
  assert.deepEqual(categorized.skills, ['Java', 'Python', 'React']);

  const invalid = resumeAnalysisSchema.parse(normalizeResumeAnalysis({ skills: 'Java', atsAnalysis: { atsScore: 80 } }));
  assert.deepEqual(invalid.skills, []);
});

test('local resume fallback extracts labeled sections and feedback', () => {
  const analysis = createLocalAnalysis(`
Professional Summary
Backend engineer building reliable web applications with React and Node.js.
Skills
JavaScript, React, Node.js, MongoDB
Projects
InterviewAI - React, Node.js, MongoDB
Education
Bachelor of Technology - Example University - 2020 - 2024
Experience
Software Engineer - Example Company - 2024 - Present
`);

  assert.match(analysis.summary, /Backend engineer/);
  assert.ok(analysis.skills.includes('React'));
  assert.equal(analysis.projects[0].name, 'InterviewAI');
  assert.ok(analysis.education.length > 0);
  assert.ok(analysis.experience.length > 0);
  assert.ok(analysis.strengths.length > 0);
  assert.ok(analysis.improvementSuggestions.length > 0);
  assert.ok(analysis.atsAnalysis.atsScore >= 0 && analysis.atsAnalysis.atsScore <= 100);
  assert.ok(analysis.atsAnalysis.strengths.length > 0);
  assert.ok(analysis.atsAnalysis.suggestions.length > 0);
});


test('local project extraction stops before certifications and achievements', () => {
  const analysis = createLocalAnalysis(`Projects
Roamly - React, Node.js
Tech Stack: React, Node.js
Certifications
Cloud Developer Certificate
Achievements
Winner of coding challenge
Education
Bachelor of Engineering`);
  const projectText = analysis.projects.map((item) => item.name).join(' ');
  assert.doesNotMatch(projectText, /Certificate|Winner/i);
});
