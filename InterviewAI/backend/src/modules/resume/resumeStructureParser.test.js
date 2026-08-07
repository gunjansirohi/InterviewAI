import assert from 'node:assert/strict';
import test from 'node:test';
import { extractProjectsFromSection, extractSkillsFromSection, parseResumeSections } from './resumeStructureParser.js';

test('separates skills from project technologies and groups project details', () => {
  const sections = parseResumeSections(`Skills
JavaScript, Communication, JavaScript
Projects
Roamly
Tech Stack: React.js, Node.js, Express.js, JavaScript, Google Gemini AI, Google Maps API, OpenWeather
\u2022 Developed a full-stack AI-powered travel planning application.
\u2022 Integrated Google Gemini AI.
\u2022 Implemented interactive Google Maps.
Education
Bachelor of Engineering`);
  assert.deepEqual(extractSkillsFromSection(sections.skills), ['JavaScript', 'Communication']);
  assert.deepEqual(extractProjectsFromSection(sections.projects), [{
    name: 'Roamly',
    technologies: ['React.js', 'Node.js', 'Express.js', 'JavaScript', 'Google Gemini AI', 'Google Maps API', 'OpenWeather'],
    descriptions: [
      'Developed a full-stack AI-powered travel planning application.',
      'Integrated Google Gemini AI.',
      'Implemented interactive Google Maps.',
    ],
  }]);
});

test('supports every project technology label and removes duplicates', () => {
  for (const label of ['Tech Stack', 'Technologies', 'Technology Stack', 'Tools Used', 'Tools', 'Built With', 'Built Using', 'Technologies Used']) {
    const projects = extractProjectsFromSection(parseResumeSections(`Projects\nExample\n${label}: React, Node.js, React`).projects);
    assert.deepEqual(projects[0].technologies, ['React', 'Node.js']);
  }
});
