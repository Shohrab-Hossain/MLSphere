export const CATALOG_SECTIONS = Object.freeze([
  'Data',
  'Processing',
  'Feature',
  'Model',
  'Training',
  'Evaluation',
  'Visualization',
  'Analysis',
  'Uncategorized'
]);

const SECTION_ICON_MAP = Object.freeze({
  Data: '📥',
  Processing: '🔧',
  Feature: '🧮',
  Model: '🤖',
  Training: '⚡',
  Evaluation: '📈',
  Visualization: '📊',
  Analysis: '🔍',
  Uncategorized: '📦'
});

export function normalizePackageName(value) {
  return String(value || '').trim();
}

export function normalizeBlockName(value, packageName) {
  const raw = String(value || '').trim();
  if (raw) {
    return raw;
  }

  return String(packageName || '')
    .split('.')
    .pop()
    .split(/[_-]/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Custom Block';
}

export function getSectionIcon(section) {
  return SECTION_ICON_MAP[section] || SECTION_ICON_MAP.Uncategorized;
}
