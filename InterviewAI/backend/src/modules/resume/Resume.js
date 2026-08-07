import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({ name: String, technologies: [String], descriptions: [String] }, { _id: false });
const educationSchema = new mongoose.Schema({ institution: String, degree: String, field: String, dates: String }, { _id: false });
const experienceSchema = new mongoose.Schema({ company: String, role: String, dates: String, highlights: [String] }, { _id: false });

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  filePath: { type: String, required: true },
  originalFileName: { type: String, required: true },
  resumeName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  summary: { type: String, default: '' },
  skills: { type: [String], default: [] },
  projects: { type: [projectSchema], default: [] },
  education: { type: [educationSchema], default: [] },
  experience: { type: [experienceSchema], default: [] },
  certifications: { type: [String], default: [] },
  atsScore: { type: Number, min: 0, max: 100, default: 0 },
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] },
  suggestions: { type: [String], default: [] },
  analysisProvider: { type: String, enum: ['gemini', 'local'], default: 'gemini' },
  analysisWarning: { type: String, default: '' },
  extractedInformation: {
    skills: { type: [String], default: [] },
    projects: { type: [projectSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    summary: { type: String, default: '' },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    improvementSuggestions: { type: [String], default: [] },
    atsAnalysis: {
      atsScore: { type: Number, min: 0, max: 100, default: 0 },
      strengths: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      missingKeywords: { type: [String], default: [] },
      suggestions: { type: [String], default: [] },
    },
  },
  createdAt: { type: Date, default: Date.now, immutable: true, index: true },
});

const Resume = mongoose.model('Resume', resumeSchema);
export default Resume;





