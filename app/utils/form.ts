import type { HTMLField } from '@/app/types/types';
import { getMaxLength } from '@/app/utils/regex';

export const handleChange = (
  e: React.ChangeEvent<HTMLField>,
  set: (value: string) => void,
  setError: (error: string) => void,
  regex?: RegExp,
) => {
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
