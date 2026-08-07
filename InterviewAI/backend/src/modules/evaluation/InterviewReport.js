import mongoose from 'mongoose';

const interviewReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true, unique: true },
  overallScore: { type: Number, required: true, min: 0, max: 100 },
  technicalScore: { type: Number, required: true, min: 0, max: 100 },
  communicationScore: { type: Number, required: true, min: 0, max: 100 },
  problemSolvingScore: { type: Number, required: true, min: 0, max: 100 },
  confidenceScore: { type: Number, required: true, min: 0, max: 100 },
  answerQualityScore: { type: Number, required: true, min: 0, max: 100 },
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] },
  suggestions: { type: [String], default: [] },
  totalQuestions: { type: Number, default: 0, min: 0 },
  answeredQuestions: { type: Number, default: 0, min: 0 },
  skippedQuestions: { type: Number, default: 0, min: 0 },
  proctoringWarningCount: { type: Number, default: 0, min: 0 },
  proctoringWarnings: { type: [mongoose.Schema.Types.Mixed], default: [] },
  proctoringScoreAdjustment: { type: Number, default: 0, max: 0 },
  createdAt: { type: Date, default: Date.now, immutable: true, index: true },
});

const InterviewReport = mongoose.model('InterviewReport', interviewReportSchema);
export default InterviewReport;
