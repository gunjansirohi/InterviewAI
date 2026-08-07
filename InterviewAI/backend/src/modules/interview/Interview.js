import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  category: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  isFollowUp: { type: Boolean, default: false },
  parentQuestionIndex: { type: Number, default: null },
}, { _id: false });

const answerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true, min: 0 },
  answer: { type: String, default: '' },
  audioUrl: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  transcript: { type: String, default: '' },
  answerType: { type: String, enum: ['text', 'voice', 'video'], default: 'text' },
  status: { type: String, enum: ['answered', 'skipped'], default: 'answered' },
  answeredAt: { type: Date, default: Date.now },
  skippedAt: { type: Date, default: null },
  reason: { type: String, default: '' },
  questionId: { type: String, default: '' },
  questionText: { type: String, default: '' },
}, { _id: false });

const proctorWarningSchema = new mongoose.Schema({
  type: { type: String, enum: ['multiple_faces', 'no_face', 'looking_away', 'tab_switch', 'fullscreen_exit', 'silence', 'no_response'], required: true },
  message: { type: String, required: true, maxlength: 200 },
  questionIndex: { type: Number, min: 0, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const interviewSessionWarningSchema = new mongoose.Schema({
  reason: { type: String, required: true, trim: true },
  message: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const interviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, required: true, trim: true },
  interviewType: { type: String, enum: ['hr', 'technical', 'dsa', 'project', 'system-design', 'behavioral', 'mixed'], required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  experienceLevel: { type: String, enum: ['entry', 'mid', 'senior'], default: 'mid' },
  questions: { type: [questionSchema], required: true },
  askedQuestions: { type: [String], default: [] },
  answers: { type: [answerSchema], default: [] },
  proctorWarnings: { type: [proctorWarningSchema], default: [] },
  warnings: { type: [interviewSessionWarningSchema], default: [] },
  warningCount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['active', 'completed', 'terminated'], default: 'active' },
  endedAt: { type: Date, default: null },
  score: { type: Number, default: null, min: 0, max: 100 },
  createdAt: { type: Date, default: Date.now, immutable: true, index: true },
});

const Interview = mongoose.model('Interview', interviewSchema);
export default Interview;
