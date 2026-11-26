/**
 * Normalize an optional email address for consistent lowercase database storage and lookup.
 */
export function normalizeEmail(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().toLowerCase();
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Normalize a required email address for consistent lowercase database storage and lookup.
 */
export function normalizeRequiredEmail(value: string): string {
  return String(value || '').trim().toLowerCase();
}
