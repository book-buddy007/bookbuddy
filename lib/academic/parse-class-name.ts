/**
 * Vidyaverse's Class.name is free text (school admins type it in) — "Class 6",
 * "Grade 6", "Std VI", "6th", "VI", etc. There is no structured grade field to read
 * instead, so this best-effort parses the common Indian-school conventions down to a
 * 1-12 integer. Returns null rather than guessing when the name doesn't match a known
 * pattern (e.g. "Nursery"/"LKG"/"UKG", or a genuinely free-form section name) — a
 * wrong grade is worse than an absent one for quiz targeting.
 */

const ROMAN_TO_INT: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6,
  VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12,
};

export function parseClassNameToGradeLevel(className: string): number | null {
  const trimmed = className.trim();

  // Plain or ordinal digits: "6", "6th", "Class 6", "Grade-6", "Std. 6"
  const digitMatch = trimmed.match(/(\d{1,2})(?:st|nd|rd|th)?/i);
  if (digitMatch) {
    const n = parseInt(digitMatch[1], 10);
    if (n >= 1 && n <= 12) return n;
  }

  // Roman numerals: "VI", "Class VI", "Std. XII" — matched as a whole token so "I"
  // inside another word can't false-positive.
  const romanMatch = trimmed.toUpperCase().match(/\b(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)\b/);
  if (romanMatch) {
    const n = ROMAN_TO_INT[romanMatch[1]];
    if (n) return n;
  }

  return null;
}
