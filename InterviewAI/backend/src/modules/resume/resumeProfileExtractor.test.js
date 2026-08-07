import assert from 'node:assert/strict';
import test from 'node:test';
import { detectResumeSections, extractCertifications, extractResumeProfileMetadata } from './resumeProfileExtractor.js';

test('extracts contact information and bullet certifications from a labeled section', () => {
  const profile = extractResumeProfileMetadata(`Jane Candidate
jane@example.com | +91 98765 43210
Skills
JavaScript
Professional Certifications
\u2022 Front-End Developer Professional Certificate \u2014 Example Platform
\u2022 Generative AI Certificate
  Example Academy
Experience
Engineer at Example
`);
  assert.equal(profile.name, 'Jane Candidate');
  assert.equal(profile.email, 'jane@example.com');
  assert.match(profile.phone, /98765/);
  assert.deepEqual(profile.certifications, [
    'Front-End Developer Professional Certificate \u2014 Example Platform',
    'Generative AI Certificate Example Academy',
  ]);
});

test('recognizes certification-related headings case-insensitively and same-line content', () => {
  const text = `SUMMARY
Engineer
COURSES: Advanced Database Course - Learning Platform
TRAINING
- Cloud Practitioner Training | Example Institute
PROJECTS
Inventory application`;
  assert.deepEqual(detectResumeSections(text), ['summary', 'certifications', 'projects']);
  assert.deepEqual(extractCertifications(text), [
    'Advanced Database Course - Learning Platform',
    'Cloud Practitioner Training | Example Institute',
  ]);
});

test('recovers certification keywords when multi-column extraction disrupts headings', () => {
  const text = `Skills Experience
JavaScript Developer
Data Engineering Certificate, Example Learning
Certified Cloud Associate \u2014 Example Cloud`;
  assert.deepEqual(extractCertifications(text), [
    'Data Engineering Certificate, Example Learning',
    'Certified Cloud Associate \u2014 Example Cloud',
  ]);
});

test('returns no certifications when certification-related content is absent', () => {
  const text = `Sam Candidate
Skills
JavaScript
Experience
Built web applications`;
  assert.deepEqual(extractCertifications(text), []);
});


test('stops certifications at major headings and rejects project implementation details', () => {
  const text = `Summary
Full-stack developer
Certifications
- AI Assistant Certificate - Learning Academy
Achievements
- Won a coding competition
Projects
Roamly
Tech Stack: React.js, Node.js, Express.js
- Developed a travel planning application
- Implemented Google Maps API integration
- Google Gemini AI project description
Education
Bachelor of Engineering`;

  assert.deepEqual(detectResumeSections(text), [
    'summary', 'certifications', 'achievements', 'projects', 'education',
  ]);
  assert.deepEqual(extractCertifications(text), [
    'AI Assistant Certificate - Learning Academy',
  ]);
});

test('does not treat provider names or project API descriptions as certificates', () => {
  const text = `Projects
AI Assistant
- Built an application using OpenAI and Google APIs
- Tech Stack: React and Node.js
Experience
Implemented API integration for a client`;
  assert.deepEqual(extractCertifications(text), []);
});

test('normalizes compressed certificate titles after PDF text cleaning', () => {
  const text = `Certifications
\u2022 OpenAIGPTs:CreatingYourOwnCustomAIAssistant|Certificate
\u2022 MetaFront-EndDeveloperProfessionalCertificate`;
  assert.deepEqual(extractCertifications(text), [
    'OpenAI GPTs: Creating Your Own Custom AI Assistant Certificate',
    'Meta Front-End Developer Professional Certificate',
  ]);
});
