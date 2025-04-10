export const inputLengthRegex = /^.{0,32}$/;
export const messageLengthRegex = /^[\s\S]{0,500}$/;
export const emailRegex = /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,64}\.[a-zA-Z]{2,22}$/;
export const frenchPhoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;

/**
 * Extract minLength and maxLength from the regex (assuming format like ^.{X,Y}$)
 */
export const getMinMaxLength = (regex: RegExp) => {
  const regexStr = regex.source; // Get the regex as a string, e.g., "^.{0,32}$"

  // Check if the regex matches the exact pattern "^.{X,Y}$" or "^.{X}$"
  const simpleLengthPattern = /^\^(\.|\[.+?\])\{(\d+,\d+|\d+)\}\$$/;
  const match = regexStr.match(simpleLengthPattern);

  if (match) {
    const range = match[2]; // e.g., "0,32" or "32"
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
