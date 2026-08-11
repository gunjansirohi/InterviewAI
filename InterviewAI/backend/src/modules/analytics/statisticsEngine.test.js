import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateStatistics } from './statisticsEngine.js';

function makeInterview(id, status = 'completed') {
  return {
    _id: { toString: () => id },
    role: `Role ${id}`,
    createdAt: new Date(`2024-01-${String(id).padStart(2, '0')}`),
    status,
  };
}

function makeReport(interviewId, overallScore, extra = {}) {
  return {
    interviewId: { toString: () => interviewId },
    overallScore,
    technicalScore: extra.technicalScore ?? overallScore,
    communicationScore: extra.communicationScore ?? overallScore,
    problemSolvingScore: extra.problemSolvingScore ?? overallScore,
    strengths: extra.strengths ?? [],
    weaknesses: extra.weaknesses ?? [],
  };
}

test('returns zeros when there are no interviews and no reports', () => {
  const stats = calculateStatistics([], []);
  assert.equal(stats.totalInterviews, 0);
  assert.equal(stats.completedSessions, 0);
  assert.equal(stats.averageScore, 0);
  assert.equal(stats.bestScore, 0);
  assert.equal(stats.successRate, 0);
  assert.equal(stats.completionRate, 0);
});

test('a saved evaluation completes a legacy interview session', () => {
  const interviews = [
    makeInterview(1, 'active'),
    makeInterview(2, 'terminated'),
    makeInterview(3, 'active'),
  ];
  // Reports exist for sessions whose legacy status was never persisted.
  const reports = [
    makeReport(1, 90),
    makeReport(2, 85),
  ];
  const stats = calculateStatistics(interviews, reports);
  assert.equal(stats.totalInterviews, 3);
  assert.equal(stats.completedSessions, 2);
  assert.equal(stats.averageScore, 87.5);
  assert.equal(stats.bestScore, 90);
  assert.equal(stats.successRate, 100);
  assert.equal(stats.completionRate, 66.7);
});

test('1 completed interview with a passing score', () => {
  const interviews = [makeInterview(10, 'completed')];
  const reports = [makeReport(10, 76)];
  const stats = calculateStatistics(interviews, reports);
  assert.equal(stats.totalInterviews, 1);
  assert.equal(stats.completedSessions, 1);
  assert.equal(stats.averageScore, 76);
  assert.equal(stats.bestScore, 76);
  assert.equal(stats.completionRate, 100);
  assert.equal(stats.successRate, 100);
});

test('1 completed interview with a failing score', () => {
  const interviews = [makeInterview(10, 'completed')];
  const reports = [makeReport(10, 45)];
  const stats = calculateStatistics(interviews, reports);
  assert.equal(stats.completedSessions, 1);
  assert.equal(stats.averageScore, 45);
  assert.equal(stats.bestScore, 45);
  assert.equal(stats.completionRate, 100);
  assert.equal(stats.successRate, 0);
});

test('multiple completed interviews with different scores', () => {
  const interviews = [
    makeInterview(1, 'completed'),
    makeInterview(2, 'completed'),
    makeInterview(3, 'completed'),
    makeInterview(4, 'active'), // not completed
  ];
  const reports = [
    makeReport(1, 70),
    makeReport(2, 85),
    makeReport(3, 55),
    makeReport(4, 95), // saved evaluation completes this legacy active session
  ];
  const stats = calculateStatistics(interviews, reports);
  assert.equal(stats.totalInterviews, 4);
  assert.equal(stats.completedSessions, 4);
  assert.equal(stats.averageScore, 76.3); // (70 + 85 + 55 + 95) / 4
  assert.equal(stats.bestScore, 95);
  assert.equal(stats.completionRate, 100);
  assert.equal(stats.successRate, 75); // 3 successful scored sessions / 4
});

test('includes saved evaluations even when a legacy interview is terminated', () => {
  const interviews = [
    makeInterview(1, 'completed'),
    makeInterview(2, 'terminated'),
  ];
  const reports = [
    makeReport(1, 60),
    makeReport(2, 100),
  ];
  const stats = calculateStatistics(interviews, reports);
  assert.equal(stats.completedSessions, 2);
  assert.equal(stats.averageScore, 80);
  assert.equal(stats.bestScore, 100);
  assert.equal(stats.successRate, 100);
  assert.equal(stats.completionRate, 100);
});

test('ignores invalid/non-finite scores from completed interviews', () => {
  const interviews = [makeInterview(1, 'completed')];
  const reports = [{ ...makeReport(1, null), overallScore: null }];
  const stats = calculateStatistics(interviews, reports);
  assert.equal(stats.completedSessions, 1);
  assert.equal(stats.averageScore, 0);
  assert.equal(stats.bestScore, 0);
  assert.equal(stats.successRate, 0);
});
