export const inputLengthRegex = /^.{1,32}$/;
export const messageLengthRegex = /^.{1,255}$/;
export const emailRegex = /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,64}\.[a-zA-Z]{2,22}$/;
export const frenchPhoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;

export const getMaxLength = (regex: RegExp) => {
  const maxLengthMatch = regex.source.match(/{(\d+)}/);
  return maxLengthMatch ? parseInt(maxLengthMatch[1], 10) : 0;
};
