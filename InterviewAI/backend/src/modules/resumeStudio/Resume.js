import mongoose from 'mongoose';

const personalInfoSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true, required: true, maxlength: 254, match: /^\S+@\S+\.\S+$/ },
  phone: { type: String, trim: true, default: '' },
  location: { type: String, trim: true, default: '' },
  linkedIn: { type: String, trim: true, default: '' },
  website: { type: String, trim: true, default: '' },
}, { _id: false });

const educationSchema = new mongoose.Schema({ institution: String, degree: String, field: String, startDate: String, endDate: String }, { _id: false });
const experienceSchema = new mongoose.Schema({ company: String, role: String, startDate: String, endDate: String, descriptions: [String] }, { _id: false });
const projectSchema = new mongoose.Schema({ name: String, description: String, technologies: [String], link: String }, { _id: false });

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  personalInfo: { type: personalInfoSchema, required: true },
  summary: { type: String, default: '' },
  skills: { type: [String], default: [] },
  education: { type: [educationSchema], default: [] },
  experience: { type: [experienceSchema], default: [] },
  projects: { type: [projectSchema], default: [] },
  certifications: { type: [String], default: [] },
  languages: { type: [String], default: [] },
  template: { type: String, enum: ['classic', 'modern', 'minimal'], default: 'classic' },
  atsScore: { type: Number, default: null, min: 0, max: 100 },
}, { timestamps: true });

const StudioResume = mongoose.model('StudioResume', resumeSchema);
export default StudioResume;
