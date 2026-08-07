export const codingLanguages = Object.freeze({
  javascript: { label: 'JavaScript', judge0Id: 63 },
  python: { label: 'Python', judge0Id: 71 },
  java: { label: 'Java', judge0Id: 62 },
  cpp: { label: 'C++', judge0Id: 54 },
  c: { label: 'C', judge0Id: 50 },
  csharp: { label: 'C#', judge0Id: 51 },
  go: { label: 'Go', judge0Id: 60 },
});

export const supportedLanguageIds = Object.freeze(Object.keys(codingLanguages));
export const supportedLanguageSet = new Set(supportedLanguageIds);
export const defaultJudge0LanguageIds = Object.freeze(Object.fromEntries(
  Object.entries(codingLanguages).map(([id, language]) => [id, language.judge0Id]),
));
