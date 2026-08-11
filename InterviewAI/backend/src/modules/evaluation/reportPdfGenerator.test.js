import assert from 'node:assert/strict';
import test from 'node:test';
import { generateEvaluationReportPdf } from './reportPdfGenerator.js';

test('evaluation PDF generator produces a PDF for a saved report', async () => {
  const pdf = await generateEvaluationReportPdf({
    candidate: { name: 'Test Candidate' },
    interview: { role: 'Software Engineer', interviewType: 'technical', difficulty: 'medium', createdAt: new Date(), questions: [{ question: 'How would you secure an API?' }], answers: [{ questionIndex: 0, answer: 'I would authenticate users and validate input.', transcript: '', status: 'answered' }] },
    report: { createdAt: new Date(), overallScore: 75, technicalScore: 80, communicationScore: 70, problemSolvingScore: 74, confidenceScore: 72, answerQualityScore: 76, strengths: ['Explained API authentication.'], weaknesses: ['Could discuss authorization.'], suggestions: ['Describe authorization checks.'], proctoringWarningCount: 0, proctoringWarnings: [], proctoringScoreAdjustment: 0 },
  });
  assert.ok(pdf.subarray(0, 4).equals(Buffer.from('%PDF')));
});
