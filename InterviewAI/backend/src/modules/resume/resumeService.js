import GeminiClient from '../../lib/geminiClient.js';
import { zodTextFormat } from '../../lib/geminiClient.js';
import { z } from 'zod';
import { calculateAtsAnalysis } from './atsScoring.js';
import { extractProjectsFromSection, extractSkillsFromSection, parseResumeSections } from './resumeStructureParser.js';

export function normalizeSkills(value) {
  const values = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.values(value).flat(Infinity)
      : [];
  const seen = new Set();

  return values.filter((value) => {
    if (typeof value !== 'string') return false;
    const key = value.trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((value) => value.trim());
}

// This runs on the provider's raw JSON, before resumeAnalysisSchema validates it.
// It keeps stored and API-facing resume data on the single flat skills-array contract.
export function normalizeResumeAnalysis(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return { ...value, skills: normalizeSkills(value.skills) };
}

export const resumeAnalysisSchema = z.object({
  // Gemini may omit fields that have no evidence. Default those omissions instead of
  // rejecting an otherwise valid AI response and unnecessarily using local fallback.
  // Keep this flat. The client and downstream interview generators consume a
  // single list, not category-to-skills maps.
  skills: z.array(z.string()).default([]),
  projects: z.array(z.object({
    name: z.string().default(''),
    technologies: z.array(z.string()).default([]),
    descriptions: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    institution: z.string().default(''), degree: z.string().default(''), field: z.string().default(''), dates: z.string().default(''),
  })).default([]),
  experience: z.array(z.object({
    company: z.string().default(''), role: z.string().default(''), dates: z.string().default(''), highlights: z.array(z.string()).default([]),
  })).default([]),
  summary: z.string().default(''),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  improvementSuggestions: z.array(z.string()).default([]),
  atsAnalysis: z.object({
    atsScore: z.number().min(0).max(100),
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    missingKeywords: z.array(z.string()).default([]),
    suggestions: z.array(z.string()).default([]),
  }).default({ atsScore: 0, strengths: [], weaknesses: [], missingKeywords: [], suggestions: [] }),
});

const knownSkills = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'MongoDB', 'Python', 'Java', 'C++',
  'C#', 'SQL', 'PostgreSQL', 'MySQL', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'HTML', 'CSS',
];

const sectionNames = new Map([
  ['summary', 'summary'], ['professional summary', 'summary'], ['profile', 'summary'], ['objective', 'summary'],
  ['projects', 'projects'], ['project experience', 'projects'], ['education', 'education'], ['academic background', 'education'],
  ['experience', 'experience'], ['work experience', 'experience'], ['professional experience', 'experience'], ['employment', 'experience'],
  ['certifications', 'certifications'], ['certificates', 'certifications'], ['professional certifications', 'certifications'], ['courses', 'certifications'],
  ['achievements', 'achievements'], ['awards', 'achievements'], ['honors', 'achievements'],
]);

function sectionedLines(resumeText) {
  const sections = { general: [], summary: [], projects: [], education: [], experience: [], certifications: [], achievements: [] };
  let current = 'general';
  resumeText.split('\n').map((line) => line.replace(/^[•●▪◦*-]\s*/, '').trim()).filter(Boolean).forEach((line) => {
    const heading = line.toLowerCase().replace(/[:|]+$/, '').trim();
    if (sectionNames.has(heading)) current = sectionNames.get(heading);
    else sections[current].push(line);
  });
  return sections;
}

function dateText(line) {
  return line.match(/(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:(?:19|20)\d{2}|present|current)/i)?.[0] || '';
}

export function createLocalAnalysis(resumeText) {
  const sections = parseResumeSections(resumeText);
  const skills = extractSkillsFromSection(sections.skills);
  const summary = (sections.summary.map(({ text }) => text).join(' ') || sections.general.find(({ text }) => text.split(/\s+/).length >= 6)?.text || '').slice(0, 700);
  const projects = extractProjectsFromSection(sections.projects);
  const education = sections.education.slice(0, 8).map(({ text: line }) => {
    const parts = line.split(/\s[-–—|,]\s/).map((part) => part.trim()).filter(Boolean);
    const degreeIndex = parts.findIndex((part) => /bachelor|master|b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|bsc|msc|ph\.?d|diploma/i.test(part));
    return { institution: parts[degreeIndex === 0 ? 1 : 0] || '', degree: degreeIndex >= 0 ? parts[degreeIndex] : '', field: '', dates: dateText(line) };
  }).filter((item) => item.institution || item.degree);
  const experience = sections.experience.slice(0, 10).map(({ text: line }) => {
    const parts = line.split(/\s[-–—|@]\s/).map((part) => part.trim()).filter(Boolean);
    return { role: parts[0] || '', company: parts[1] || '', dates: dateText(line), highlights: parts.slice(2).filter((part) => part !== dateText(line)) };
  }).filter((item) => item.role || item.company);
  const strengths = [skills.length ? `Lists ${skills.length} identifiable technical skill${skills.length === 1 ? '' : 's'}.` : '', projects.length ? 'Includes project evidence.' : '', experience.length ? 'Includes professional experience.' : '', education.length ? 'Includes education details.' : ''].filter(Boolean);
  const weaknesses = [!summary ? 'A clear professional summary was not detected.' : '', !projects.length ? 'No clearly labeled projects were detected.' : '', !experience.length ? 'No clearly labeled work experience was detected.' : ''].filter(Boolean);
  const improvementSuggestions = [!summary ? 'Add a concise professional summary tailored to the target role.' : '', !projects.length ? 'Add a Projects section with technologies and measurable outcomes.' : '', !experience.length ? 'Use a clearly labeled Experience section with role, employer, dates, and impact-focused bullets.' : '', 'Quantify achievements where truthful and use consistent section headings for ATS readability.'].filter(Boolean);

  return {
    skills,
    projects, education, experience, summary, strengths, weaknesses, improvementSuggestions,
    atsAnalysis: calculateAtsAnalysis(resumeText),
  };
}

export async function analyzeResume(resumeText) {
  const payload = { textCharacters: typeof resumeText === 'string' ? resumeText.length : 0, textLimit: 60000 };
  console.info('[resume-analysis-gemini-config]', {
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    configuredModel: String(process.env.GEMINI_MODEL || '').trim().replace(/^models\/+?/i, '') || 'auto-discovery',
  });
  if (!process.env.GEMINI_API_KEY) {
    console.error('[resume-analysis-ai-unavailable]', {
      provider: 'gemini',
      code: 'AI_NOT_CONFIGURED',
      message: 'GEMINI_API_KEY is not loaded. AI analysis was not attempted; using local fallback.',
      payload,
    });
    return {
      extractedInformation: createLocalAnalysis(resumeText),
      analysisProvider: 'local',
      analysisWarning: 'AI analysis is not configured; a basic local analysis was saved.',
    };
  }

  let modelName;
  try {
    if (typeof resumeText !== 'string' || !resumeText.trim()) {
      const error = new Error('Resume analysis request contains no extracted text');
      error.code = 'RESUME_ANALYSIS_INVALID_PAYLOAD';
      error.status = 422;
      throw error;
    }
    console.info('[resume-analysis-ai-request]', { provider: 'gemini', payload });
    const client = new GeminiClient({ apiKey: process.env.GEMINI_API_KEY });
    modelName = await client.discoverModel();
    const response = await client.responses.parse({
      model: modelName,
      input: [
        {
          role: 'system',
          content: `Analyze this resume using only facts explicitly present. Extract summary, skills, projects, education, and experience. For every project, return its name, technologies from Tech Stack, Technologies, Technology Stack, Tools Used, Tools, Built With, Built Using, or Technologies Used labels, and descriptions as an array of project bullet text.

Return exactly one JSON object and nothing else: no Markdown, no code fences, no prose before or after the JSON. The skills field MUST be a flat JSON array of strings, never an object, map, or set of categories. For example: "skills": ["Java", "Python", "HTML", "CSS", "JavaScript", "React.js", "Node.js", "MongoDB", "SQL"]. Skills must come only from the Skills section; never merge project technologies into skills.

Also provide evidence-based strengths, weaknesses, and actionable improvementSuggestions. Include atsAnalysis with an atsScore from 0 to 100, strengths, weaknesses, missingKeywords, and suggestions. Score ATS readiness using: section completeness for Education, Skills, Projects, Experience, and Certifications (30 points); technical keyword coverage across programming languages, frameworks, databases, and tools (30 points); and resume quality based on clear headings, bullet points, action verbs, and quantifiable achievements (40 points). Missing keywords must be relevant recommendations, never claims that the candidate has those skills. Never invent employers, dates, achievements, qualifications, or certifications. Use empty strings or empty arrays for genuinely missing information.`,
        },
        { role: 'user', content: resumeText.slice(0, 60000) },
      ],
      text: { format: zodTextFormat(resumeAnalysisSchema, 'resume_analysis') },
      normalize: normalizeResumeAnalysis,
    });

    if (!response.output_parsed) throw new Error('The AI response did not contain a valid resume analysis');
    response.output_parsed.atsAnalysis.atsScore = Math.round(response.output_parsed.atsAnalysis.atsScore);
    return { extractedInformation: response.output_parsed, analysisProvider: 'gemini', analysisWarning: '' };
  } catch (cause) {
    const providerStatus = Number(cause?.status || cause?.response?.status);
    const requestId = cause?.request_id || cause?.headers?.['x-request-id'];
    const providerCode = cause?.code || cause?.error?.code;
    const rawReason = String(cause?.message || 'Unknown AI provider error')
      .replace(process.env.GEMINI_API_KEY || /$^/, '[REDACTED]')
      .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]');
    let message = process.env.NODE_ENV === 'production'
      ? 'AI resume analysis is temporarily unavailable; evidence-based local analysis is shown instead.'
      : `AI resume analysis failed: ${rawReason}. Evidence-based local analysis is shown instead.`;
    let status = 502;

    if (String(providerCode).startsWith('GEMINI_')) {
      message = `${cause.message} Evidence-based local analysis is shown instead.`;
      status = 503;
    } else if (providerStatus === 401 || providerStatus === 403) {
      message = 'Resume analysis authentication failed. Check the server GEMINI_API_KEY; local analysis is shown instead.';
      status = 503;
    } else if (providerStatus === 429 && ['insufficient_quota', 'credit_balance_exhausted'].includes(providerCode)) {
      message = 'Gemini quota are exhausted. Add API billing credits to enable AI analysis; local analysis is shown for now.';
      status = 503;
    } else if (providerStatus === 429) {
      message = 'AI resume analysis is temporarily rate-limited. Retry shortly; local analysis is shown for now.';
      status = 503;
    } else if (providerStatus === 400 || providerStatus === 404) {
      message = `Resume analysis model "${modelName}" is unavailable for this API key; local analysis is shown instead.`;
      status = 503;
    }

    console.error('[resume-analysis-provider-failed]', {
      provider: 'gemini',
      apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      configuredModel: String(process.env.GEMINI_MODEL || '').trim().replace(/^models\/+?/i, '') || 'auto-discovery',
      selectedModel: modelName || null,
      status: providerStatus || status,
      code: providerCode || cause?.name,
      requestId,
      message: rawReason,
      details: cause?.errorDetails || cause?.error?.details || cause?.modelFailures,
      payload,
    });
    return {
      extractedInformation: createLocalAnalysis(resumeText),
      analysisProvider: 'local',
      analysisWarning: message,
    };
  }
}


















