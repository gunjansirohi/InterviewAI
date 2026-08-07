export function average(values) {
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function mostFrequent(items, limit = 5) {
  const counts = new Map();
  items.flat().map((item) => item.trim()).filter(Boolean).forEach((item) => {
    const key = item.toLowerCase();
    const existing = counts.get(key);
    counts.set(key, { label: existing?.label || item, count: (existing?.count || 0) + 1 });
  });
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit).map(({ label }) => label);
}

export function escapeSearch(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
