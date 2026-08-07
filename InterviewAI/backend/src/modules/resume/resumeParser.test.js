import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeExtractedText } from './resumeParser.js';

test('normalizes PDF font ligatures, spacing, and bullets without losing section lines', () => {
  const input = `PROFESSIONAL  CERTIFICATIONS\r\n  \u2022  Certi\uFB01ed Developer  \n\n\nIssuer`;
  const text = normalizeExtractedText(input);
  assert.equal(text, `PROFESSIONAL CERTIFICATIONS\n\u2022 Certified Developer\n\nIssuer`);
});

test('removes nearby duplicate PDF text while preserving section order', () => {
  const text = normalizeExtractedText('Projects\nProjects\nRoamly\nTech Stack: React\nCertifications\nCertificate Course');
  assert.equal(text, 'Projects\nRoamly\nTech Stack: React\nCertifications\nCertificate Course');
});

test('converts private-use and common PDF bullet glyphs to standard bullets', () => {
  const text = normalizeExtractedText('\uE12CFirst item\n\u25AA Second item\n- Third item\n\u2022 Fourth item');
  assert.equal(text, '\u2022 First item\n\u2022 Second item\n\u2022 Third item\n\u2022 Fourth item');
});
