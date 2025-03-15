import clsx from 'clsx';
import React from 'react';

interface SwitchProps {
  enabled: boolean;
  onChange?: () => void;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
}

const Switch: React.FC<SwitchProps> = ({ enabled, onChange, size = 'md', id }) => {
  // Size mappings
  const sizes = {
    sm: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3',
      thumbPosition: 'top-0.5 left-0.5',
      thumbTranslate: 'translate-x-4',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      thumbPosition: 'top-0.5 left-0.5',
      thumbTranslate: 'translate-x-5',
    },
    lg: {
      track: 'w-14 h-8',
      thumb: 'w-7 h-7',
      thumbPosition: 'top-0.5 left-0.5',
      thumbTranslate: 'translate-x-6',
    },
  };

  const { track, thumb, thumbPosition, thumbTranslate } = sizes[size];

  return (
    <button
      id={id}
      type="button"
      className={'relative inline-flex items-center focus:outline-none rounded-full'}
      onClick={onChange}
      role="switch"
      aria-checked={enabled}
    >
      <div
        className={clsx(
          track,
          'rounded-full transition-colors duration-300',
          enabled ? 'bg-primary' : 'bg-secondary/50',
        )}
      />
      <div
        className={clsx(
          thumbPosition,
          thumb,
          'absolute rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out',
          enabled ? thumbTranslate : '',
        )}
      />
      <span className="sr-only">{enabled ? 'Activé' : 'Désactivé'}</span>
    </button>
  );
};

export default Switch;
