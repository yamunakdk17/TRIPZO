export function buildUniqueSlug(baseValue, existingSlugs = []) {
  const base = createSlug(baseValue);
  const used = new Set((existingSlugs || []).filter(Boolean).map((value) => String(value).trim().toLowerCase()));

  if (!base) {
    return 'item';
  }

  if (!used.has(base)) {
    return base;
  }

  let index = 2;
  let candidate = `${base}-${index}`;

  while (used.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}`;
  }

  return candidate;
}

export default function createSlug(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
