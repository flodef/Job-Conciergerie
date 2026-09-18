export const inputLengthRegex = /^.{0,32}$/;
export const objectiveLengthRegex = /^.{0,150}$/;
export const messageLengthRegex = /^[\s\S]{0,500}$/;
export const descriptionLengthRegex = /^[\s\S]{0,1000}$/;
export const emailRegex = /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,64}\.[a-zA-Z]{2,22}$/;
export const frenchPhoneRegex = /^0[1-9]\d{8}$/;
export const vatNumberRegex = /^FR[A-Z0-9]{2}\d{9}$/i;
export const nafCodeRegex = /^\d{4}\.[A-Z]$/;

// ─── Partial regexes (accept valid prefixes for input filtering) ───
// Each partial regex matches any string that could be extended to match
// the corresponding full regex above. Every segment is progressively
// optional so that partial typing is accepted, but characters that
// can never lead to a full match are rejected.
export const frenchPhonePartialRegex = /^0(?:[1-9]\d{0,8})?$/;
export const vatNumberPartialRegex = /^(?:F(?:R(?:[A-Z0-9]{0,2}\d{0,9})?)?)?$/i;
export const nafCodePartialRegex = /^(?:\d{0,4}|\d{4}\.[A-Z]?)$/;
export const emailPartialRegex = /^[a-zA-Z0-9._%+-]{0,64}(?:@[a-zA-Z0-9.-]{0,87})?$/;

/**
 * Create a character filter from a partial regex.
 * Only keeps characters that maintain the value as a valid prefix
 * of the full regex. Characters are stripped from the end until the
 * partial regex matches.
 *
 * @param partialRegex A regex that matches valid prefixes (e.g. frenchPhonePartialRegex)
 * @param transform Optional transform applied before testing (e.g. toUpperCase)
 * @returns A filter function suitable for ValidatedInput's `filter` prop
 */
export function createRegexFilter(partialRegex: RegExp, transform?: (v: string) => string): (v: string) => string {
  return (v: string) => {
    let result = transform ? transform(v) : v;
    while (result && !partialRegex.test(result)) {
      result = result.slice(0, -1);
    }
    return result;
  };
}

/**
 * Normalize a phone number to the canonical digits-only national format.
 * Legacy values may carry separators or an international +33/0033 prefix —
 * they are converted so stored data keeps validating against frenchPhoneRegex.
 * @param value Raw phone value (typed or stored)
 * @returns Digits-only national number, e.g. "0612345678"
 */
export const normalizePhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('0033')) return `0${digits.slice(4)}`;
  if (digits.startsWith('33') && digits.length === 11) return `0${digits.slice(2)}`;
  return digits;
};

/**
 * Normalize a first name:
 * - Everything lowercase except first letter
 * - Spaces replaced with hyphens
 * - After hyphens, next letter is uppercase
 * @param firstName First name to normalize
 * @returns Normalized first name
 */
export const normalizeFirstName = function (firstName: string): string {
  return firstName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
};

/**
 * Normalize a family name:
 * - Everything lowercase except first letter
 * - Spaces and hyphens are kept
 * - After hyphens or spaces, next letter is uppercase
 * @param familyName Family name to normalize
 * @returns Normalized family name
 */
export const normalizeFamilyName = function (familyName: string): string {
  return familyName
    .trim()
    .toLowerCase()
    .split(/[ -]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(familyName.includes('-') ? '-' : ' ');
};

/**
 * Extract minLength and maxLength from the regex (assuming format like ^.{X,Y}$)
 */
export const getMinMaxLength = (regex: RegExp) => {
  const regexStr = regex.source; // Get the regex as a string, e.g., "^.{0,32}$"

  // Check if the regex matches the exact pattern "^.{X,Y}$" or "^.{X}$"
  const pattern = /^\^(?:\.|\[\\s\\S\])\{(\d+,?\d*)\}\$$/;
  const match = regexStr.match(pattern);

  if (match) {
    const range = match[1]; // e.g., "0,32" or "32"
    const [min, max] = range.includes(',') ? range.split(',').map(Number) : [parseInt(range, 10), parseInt(range, 10)]; // If no comma, min = max

    return { minLength: min, maxLength: max };
  }

  return { minLength: 0, maxLength: 0 }; // Return 0 for both if not a simple length regex
};

/**
 * Extract minLength from the regex (assuming format like ^.{X,Y}$)
 */
export const getMinLength = (regex: RegExp) => {
  const { minLength } = getMinMaxLength(regex);
  return minLength;
};

/**
 * Extract maxLength from the regex (assuming format like ^.{X,Y}$)
 */
export const getMaxLength = (regex: RegExp) => {
  const { maxLength } = getMinMaxLength(regex);
  return maxLength;
};
