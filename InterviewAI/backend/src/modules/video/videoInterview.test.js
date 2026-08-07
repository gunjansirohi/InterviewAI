import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import Interview from '../interview/Interview.js';

test('interview model accepts video answers and proctoring warnings', async () => {
  const interview = new Interview({
    userId: new mongoose.Types.ObjectId(), role: 'Developer', interviewType: 'technical', difficulty: 'medium',
    questions: [{ question: 'Explain an API.', category: 'technical', difficulty: 'medium' }],
    answers: [{ questionIndex: 0, answer: 'Video transcript', transcript: 'Video transcript', videoUrl: 'uploads/video/user/answer.webm', answerType: 'video' }],
    proctorWarnings: [{ type: 'tab_switch', message: 'Warning: Tab switching detected.', questionIndex: 0 }],
  });
  await interview.validate();
  assert.equal(interview.answers[0].answerType, 'video');
  assert.equal(interview.proctorWarnings.length, 1);
});
