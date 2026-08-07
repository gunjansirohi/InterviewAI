import { z } from 'zod';

export const evaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  technicalScore: z.number().min(0).max(100),
  communicationScore: z.number().min(0).max(100),
  problemSolvingScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(100),
  answerQualityScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export function validateEvaluation(value) {
  const result = evaluationSchema.parse(value);
  return {
    ...result,
    overallScore: Math.round(result.overallScore),
    technicalScore: Math.round(result.technicalScore),
    communicationScore: Math.round(result.communicationScore),
    problemSolvingScore: Math.round(result.problemSolvingScore),
    confidenceScore: Math.round(result.confidenceScore),
    answerQualityScore: Math.round(result.answerQualityScore),
    strengths: cleanList(result.strengths),
    weaknesses: cleanList(result.weaknesses),
    suggestions: cleanList(result.suggestions),
  };
}

function cleanList(items) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(0, 10);
}
