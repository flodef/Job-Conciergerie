import { HTMLField } from '@/app/types/types';
import { getMaxLength } from '@/app/utils/regex';

export const handleChange = (
  e: React.ChangeEvent<HTMLField> | string,
  set: (value: string) => void,
  setError: (error: string) => void,
  regex?: RegExp,
) => {
  const { name, value, required } = typeof e === 'string' ? { name: '', value: e } : e.target;

  let timeout: NodeJS.Timeout | undefined;
  if (regex && !regex.test(value)) {
    const maxLength = getMaxLength(regex);
    if (maxLength) {
      setError(`${name} ne peut pas dépasser ${maxLength} caractères`);
      timeout = setTimeout(() => setError(''), 3000);
    } else {
      setError(`Format de ${name} invalide`);
    }
  } else {
    set(value);
    setError(!value.trim() && required ? `${name} est requis` : '');
  }

  return () => {
    clearTimeout(timeout);
  };
};
