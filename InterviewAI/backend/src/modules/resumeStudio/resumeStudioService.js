import StudioResume from './Resume.js';
import { createVersion, getVersions } from './versionManager.js';

const editableFields = ['personalInfo', 'summary', 'skills', 'education', 'experience', 'projects', 'certifications', 'languages', 'template'];

export async function createResume(userId, data) {
  const resume = await StudioResume.create({ userId, ...pickEditable(data) });
  await createVersion(resume);
  return resume;
}

export async function updateResume(userId, resumeId, data) {
  const resume = await StudioResume.findOne({ _id: resumeId, userId });
  if (!resume) return null;
  Object.assign(resume, pickEditable(data));
  await resume.save();
  await createVersion(resume);
  return resume;
}

export function getResume(userId, resumeId) {
  return StudioResume.findOne({ _id: resumeId, userId });
}

export function listResumes(userId) {
  return StudioResume.find({ userId }).sort({ updatedAt: -1 }).select('personalInfo template atsScore createdAt updatedAt').lean();
}

export function getResumeVersions(userId, resumeId) {
  return getVersions(userId, resumeId);
}

function pickEditable(data) {
  return Object.fromEntries(editableFields.filter((field) => data[field] !== undefined).map((field) => [field, data[field]]));
}
