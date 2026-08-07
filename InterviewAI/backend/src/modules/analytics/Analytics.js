import mongoose from 'mongoose';

const roadmapItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  focusArea: { type: String, required: true },
  actions: { type: [String], default: [] },
  priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
}, { _id: false });

const analyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalInterviews: { type: Number, default: 0, min: 0 },
  averageScore: { type: Number, default: 0, min: 0, max: 100 },
  bestScore: { type: Number, default: 0, min: 0, max: 100 },
  skillScores: {
    technical: { type: Number, default: 0, min: 0, max: 100 },
    communication: { type: Number, default: 0, min: 0, max: 100 },
    problemSolving: { type: Number, default: 0, min: 0, max: 100 },
  },
  weakAreas: { type: [String], default: [] },
  strongAreas: { type: [String], default: [] },
  learningRoadmap: { type: [roadmapItemSchema], default: [] },
  roadmapSourceReportCount: { type: Number, default: 0, min: 0 },
  updatedAt: { type: Date, default: Date.now },
});

const Analytics = mongoose.model('Analytics', analyticsSchema);
export default Analytics;
