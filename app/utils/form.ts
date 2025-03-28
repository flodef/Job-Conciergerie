import { HTMLField } from '@/app/types/types';
import { getMaxLength } from '@/app/utils/regex';

export const handleChange = (
  e: React.ChangeEvent<HTMLField> | string,
  set: (value: string) => void,
  setError: (error: string) => void,
  regex?: RegExp,
) => {
  const { name, value, required } = typeof e === 'string' ? { name: '', value: e } : e.target;

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
