import ResumeVersion from './ResumeVersion.js';

export async function createVersion(resume) {
  const latest = await ResumeVersion.findOne({ resumeId: resume._id }).sort({ versionNumber: -1 }).select('versionNumber').lean();
  const snapshot = resume.toObject();
  delete snapshot.__v;
  return ResumeVersion.create({ userId: resume.userId, resumeId: resume._id, versionNumber: (latest?.versionNumber || 0) + 1, snapshot });
}

export function getVersions(userId, resumeId) {
  return ResumeVersion.find({ userId, resumeId }).sort({ versionNumber: -1 }).lean();
}
