import mongoose from 'mongoose';
import { supportedLanguageIds } from './languages.js';

const exampleSchema = new mongoose.Schema({ input: String, output: String, explanation: String }, { _id: false });
const testCaseSchema = new mongoose.Schema({ input: String, expectedOutput: String, hidden: { type: Boolean, default: true } }, { _id: false });

const codingInterviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  batchId: { type: String, required: true, index: true },
  questionNumber: { type: Number, required: true, min: 1 },
  language: { type: String, enum: supportedLanguageIds, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  topic: { type: String, required: true, trim: true },
  problem: {
    title: { type: String, required: true },
    statement: { type: String, required: true },
    examples: { type: [exampleSchema], default: [] },
    constraints: { type: [String], default: [] },
  },
  starterCode: { type: String, required: true },
  submittedCode: { type: String, default: '' },
  executionOutput: { type: mongoose.Schema.Types.Mixed, default: null },
  testCases: { type: [testCaseSchema], required: true, select: false },
  score: { type: Number, default: null, min: 0, max: 100 },
  createdAt: { type: Date, default: Date.now, immutable: true, index: true },
});

const CodingInterview = mongoose.model('CodingInterview', codingInterviewSchema);
export default CodingInterview;
