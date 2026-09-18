import type { HTMLField } from '@/app/types/types';
import { getMaxLength } from '@/app/utils/regex';

/**
 * Reject a typed character before it reaches the DOM. Blocking on `keydown`
 * means the invalid keystroke never produces an `input` event, so React's
 * controlled-input restore never has a divergence to repair (which would
 * otherwise swallow the next valid keystroke). Pastes, autofills and IME
 * compositions don't fire keydown with a printable key — they fall through
 * to the onChange filter.
 */
export const handleKeyDown = (e: React.KeyboardEvent<HTMLField>, filter?: (value: string) => string) => {
  if (!filter || e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
  const el = e.currentTarget;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const prospective = el.value.slice(0, start) + e.key + el.value.slice(end);
  if (filter(prospective) !== prospective) e.preventDefault();
};

export const handleChange = (
  e: React.ChangeEvent<HTMLField>,
  set: (value: string) => void,
  setError: (error: string) => void,
  regex?: RegExp,
  filter?: (value: string) => string,
) => {
  // Write the filtered value back so the DOM stays in sync even when React bails out on unchanged state
  if (filter) {
    const filtered = filter(e.target.value);
    if (filtered !== e.target.value) e.target.value = filtered;
  }
  const { name, value, required } = e.target;

  const setValue = (value: string, error: string) => {
    setError(!value.trim() && required ? `${name} est requis` : error);
    set(value);
  };

  if (regex && !regex.test(value)) {
    const maxLength = getMaxLength(regex);
    if (maxLength) {
      setError(`${name} ne peut pas dépasser ${maxLength} caractères`);
      const timeout = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timeout);
    } else {
      setValue(value, `Format de ${name} invalide`);
    }
  } else {
    setValue(value, '');
  }
};

export const handleInputBlur = (
  e: React.ChangeEvent<HTMLField>,
  onChange: (value: string) => void,
  onError: (error: string) => void,
  regex?: RegExp,
) => {
  const { value } = e.target;

  // Trim the value if needed
  if (value !== value.trim()) (e.target as HTMLField).value = value.trim();

  // Trigger validation on blur
  handleChange(e, onChange, onError, regex);
};
