const sectionDefinitions = [
  ['summary', /^(?:professional\s+)?(?:summary|profile|objective)$/i],
  ['skills', /^(?:(?:technical\s+)?skills|core competencies)$/i],
  ['projects', /^(?:projects?|project experience|personal projects?|academic projects?)$/i],
  ['education', /^(?:education|academic background|qualifications?)$/i],
  ['experience', /^(?:(?:work|professional)?\s*experience|employment(?: history)?)$/i],
  ['certifications', /^(?:(?:professional\s+)?certifications?|certificates?|courses?(?:\s+and\s+certifications?)?)$/i],
  ['achievements', /^(?:achievements?|awards?(?:\s+and\s+honors?)?|honors?|accomplishments?)$/i],
];

const bulletPattern = /^(?:[-*\u2022\u25CF\u25AA\u25E6\u2013\u2014]|\d+[.)])\s*/;
const strongCertificateKeywordPattern = /\b(?:certified|certification|certificate|credential|specialization|licen[cs]e|nanodegree|professional certificate)\b/i;
const courseKeywordPattern = /\b(?:course|training)\b/i;
const issuerPattern = /\b(?:coursera|edx|udemy|meta|openai|infosys|google|microsoft|amazon|aws|oracle|ibm|cisco|salesforce|linkedin learning|nptel|simplilearn|skillsoft|pluralsight|academy|institute|university)\b/i;
const projectContentPattern = /\b(?:tech(?:nology)?\s*stack|developed|implemented|built|created\s+(?:an?\s+)?(?:application|app|platform|website|system)|api\s+integration|integrated\s+\w*\s*api|project\s+description|project\s+details?|key\s+features?|responsibilities)\b/i;

function cleanLine(line) {
  return line.normalize('NFKC').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

function headingFromLine(line) {
  const cleaned = cleanLine(line).replace(bulletPattern, '').replace(/[|\-\u2013\u2014]+$/, '').trim();
  const colonIndex = cleaned.indexOf(':');
  const candidate = (colonIndex >= 0 ? cleaned.slice(0, colonIndex) : cleaned).trim();
  const definition = sectionDefinitions.find(([, pattern]) => pattern.test(candidate));
  if (!definition) return null;
  return { section: definition[0], content: colonIndex >= 0 ? cleaned.slice(colonIndex + 1).trim() : '' };
}

export function detectResumeSections(text) {
  const detected = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const heading = headingFromLine(rawLine);
    if (heading && !detected.includes(heading.section)) detected.push(heading.section);
  }
  return detected;
}

function normalizeCertification(value) {
  return cleanLine(value)
    .replace(bulletPattern, '')
    // Some PDF extractors omit spaces between words in certificate titles.
    .replace(/openai\s*gpts/gi, 'OpenAI GPTs')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2')
    .replace(/Open AI GP Ts/gi, 'OpenAI GPTs')
    .replace(/\s*\|\s*(?=certificate\b)/i, ' ')
    .replace(/\s*:\s*/g, ': ')
    .replace(/^(?:completed|earned|awarded)\s*[:\-]?\s*/i, '')
    .replace(/[|;,]\s*$/, '')
    .trim();
}

function isProjectContent(line) {
  return projectContentPattern.test(normalizeCertification(line));
}

function looksLikeStandaloneCertification(line) {
  const normalized = normalizeCertification(line);
  if (!normalized || normalized.length < 4 || normalized.length > 240 || isProjectContent(normalized)) return false;
  return strongCertificateKeywordPattern.test(normalized)
    || (courseKeywordPattern.test(normalized) && issuerPattern.test(normalized));
}

function isIssuerContinuation(line) {
  const normalized = normalizeCertification(line);
  return /^(?:issued\s+by|issuer|platform|provided\s+by|authorized\s+by)\b/i.test(normalized)
    || (issuerPattern.test(normalized) && normalized.split(/\s+/).length <= 12);
}

export function extractCertifications(text) {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const sectionItems = [];
  const keywordItems = [];
  let inCertificationSection = false;
  let previousWasBullet = false;

  for (const line of lines) {
    const heading = headingFromLine(line);
    if (heading) {
      inCertificationSection = heading.section === 'certifications';
      previousWasBullet = false;
      if (inCertificationSection && heading.content && !isProjectContent(heading.content)) {
        sectionItems.push(normalizeCertification(heading.content));
      }
      continue;
    }

    if (looksLikeStandaloneCertification(line)) keywordItems.push(normalizeCertification(line));
    if (!inCertificationSection || isProjectContent(line)) {
      previousWasBullet = false;
      continue;
    }

    const item = normalizeCertification(line);
    if (!item) continue;
    const isBullet = bulletPattern.test(line);
    if (!isBullet && previousWasBullet && sectionItems.length && isIssuerContinuation(item)) {
      sectionItems[sectionItems.length - 1] = `${sectionItems.at(-1)} ${item}`;
    } else {
      sectionItems.push(item);
    }
    previousWasBullet = isBullet;
  }

  const candidates = sectionItems.length ? [...sectionItems, ...keywordItems] : keywordItems;
  const unique = [];
  for (const candidate of candidates.filter(Boolean)) {
    const key = candidate.toLocaleLowerCase();
    const coveringIndex = unique.findIndex((item) => item.toLocaleLowerCase().includes(key) || key.includes(item.toLocaleLowerCase()));
    if (coveringIndex < 0) unique.push(candidate);
    else if (candidate.length > unique[coveringIndex].length) unique[coveringIndex] = candidate;
  }
  return unique.slice(0, 30);
}

export function extractResumeProfileMetadata(text, fallbackName = '') {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = text.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]\d{4}/)?.[0]?.trim() || '';
  const candidateName = lines.find((line) => !headingFromLine(line) && !line.includes('@') && !/\d{3}/.test(line) && line.split(/\s+/).length <= 6) || '';
  const detectedSections = detectResumeSections(text);
  const certifications = extractCertifications(text);

  console.info('[resume-sections-detected]', { sections: detectedSections });
  console.info('[resume-certifications-found]', { count: certifications.length, certifications });
  return { name: candidateName || fallbackName, email, phone, certifications };
}
