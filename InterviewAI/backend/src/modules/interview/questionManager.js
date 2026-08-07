const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'what', 'how', 'why', 'would', 'you', 'your', 'can', 'could', 'do', 'does', 'did', 'explain', 'describe', 'tell', 'me', 'about', 'of', 'to', 'and', 'or', 'for', 'in', 'with', 'on', 'that', 'this']);

export function normalizeQuestion(question = '') {
  return String(question).toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').replace(/\breact\.js\b/g, 'react').replace(/\bnode\.js\b/g, 'node').replace(/\s+/g, ' ').trim();
}

function meaningfulTokens(question) {
  return [...new Set(normalizeQuestion(question).split(' ').map((token) => token.replace(/\.+$/, '')).filter((token) => token.length > 1 && !stopWords.has(token)))];
}

export function isDuplicateQuestion(candidate, askedQuestions = []) {
  const normalized = normalizeQuestion(candidate);
  const tokens = meaningfulTokens(candidate);
  return askedQuestions.some((asked) => {
    if (normalized === normalizeQuestion(asked)) return true;
    const askedTokens = meaningfulTokens(asked);
    if (!tokens.length || !askedTokens.length) return false;
    const overlap = tokens.filter((token) => askedTokens.includes(token)).length;
    const similarity = overlap / new Set([...tokens, ...askedTokens]).size;
    return similarity >= 0.7 || (tokens.length <= 3 && askedTokens.length <= 3 && overlap === Math.min(tokens.length, askedTokens.length));
  });
}

export function uniqueQuestions(questions, askedQuestions = []) {
  const accepted = [];
  for (const item of questions || []) {
    if (!item?.question || isDuplicateQuestion(item.question, [...askedQuestions, ...accepted.map(({ question }) => question)])) continue;
    accepted.push(item);
  }
  return accepted;
}
