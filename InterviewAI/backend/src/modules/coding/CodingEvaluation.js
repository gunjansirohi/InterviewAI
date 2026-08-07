import mongoose from 'mongoose';

const codingEvaluationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  codingInterviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingInterview', required: true, unique: true },
  correctness: { type: Number, required: true, min: 0, max: 100 },
  executionTime: { type: Number, default: null },
  memoryUsage: { type: Number, default: null },
  logicScore: { type: Number, required: true, min: 0, max: 100 },
  readabilityScore: { type: Number, required: true, min: 0, max: 100 },
  namingScore: { type: Number, required: true, min: 0, max: 100 },
  optimizationScore: { type: Number, required: true, min: 0, max: 100 },
  timeComplexity: { type: String, required: true },
  spaceComplexity: { type: String, required: true },
  strengths: { type: [String], default: [] },
  improvements: { type: [String], default: [] },
  finalScore: { type: Number, required: true, min: 0, max: 100 },
  testResults: { type: [mongoose.Schema.Types.Mixed], default: [] },
  createdAt: { type: Date, default: Date.now, immutable: true },
});

const CodingEvaluation = mongoose.model('CodingEvaluation', codingEvaluationSchema);
export default CodingEvaluation;
