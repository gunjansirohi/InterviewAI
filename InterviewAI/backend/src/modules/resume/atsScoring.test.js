import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateAtsAnalysis } from './atsScoring.js';

test('ATS scoring rewards complete sections, keywords, bullets, action verbs, and metrics', () => {
  const strong = calculateAtsAnalysis(`
Skills
JavaScript React MongoDB Docker AWS Git
Projects
- Built a React platform used by 500 users.
Experience
- Improved API performance by 35%.
- Led 4 projects and reduced deployment time by 20%.
Education
Bachelor of Technology
Certifications
AWS Certified Developer
`);
  const weak = calculateAtsAnalysis('Developer seeking opportunities.');
  assert.ok(strong.atsScore > weak.atsScore);
  assert.ok(strong.atsScore >= 0 && strong.atsScore <= 100);
  assert.ok(weak.weaknesses.length > 0);
  assert.ok(weak.suggestions.length > 0);
});

test('ATS recognizes certification content even when PDF columns disrupt the heading', () => {
  const result = calculateAtsAnalysis('Skills Experience\nJavaScript\nCloud Practitioner Certificate - Example Academy');
  assert.ok(!result.weaknesses.some((item) => /Certifications/.test(item)));
  assert.ok(!result.suggestions.some((item) => /Certifications/.test(item)));
});
