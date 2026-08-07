import mongoose from 'mongoose';

const resumeVersionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudioResume', required: true, index: true },
  versionNumber: { type: Number, required: true, min: 1 },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now, immutable: true },
});

resumeVersionSchema.index({ resumeId: 1, versionNumber: 1 }, { unique: true });

const ResumeVersion = mongoose.model('ResumeVersion', resumeVersionSchema);
export default ResumeVersion;
