'use client';

import { useTheme } from '@/app/utils/theme';
import { IconDeviceDesktop, IconDeviceMobile, IconDeviceTablet, IconMoon, IconSun } from '@tabler/icons-react';

/**
 * Three-way theme toggle — system / light / dark — mirroring the landing's.
 * `data-theme-opt` + :root[data-theme] CSS keeps the active state correct
 * before hydration (no flash), like the site-side toggle.
 */
export default function ThemeToggle({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { mode, set, ready } = useTheme();
  const activeMode = ready ? mode : null;
  const iconSize = size === 'sm' ? 16 : 18;
  const padding = size === 'sm' ? 'p-1' : 'p-1.5';
  const btnClass = `theme-opt rounded-full flex items-center justify-center transition-all hover:text-foreground overflow-hidden ${
    size === 'sm' ? 'w-7 h-7' : 'w-[34px] h-[34px]'
  }`;
  return (
    <div
      role="radiogroup"
      aria-label="Thème"
      className={`inline-grid grid-cols-3 gap-0.5 rounded-full ${padding} text-foreground/50 shrink-0 bg-secondary/40 border border-secondary/60`}
    >
      <button
        type="button"
        onClick={() => set('system')}
        title="Système"
        aria-label="Système"
        aria-checked={activeMode === 'system'}
        disabled={!ready}
        role="radio"
        data-theme-opt="system"
        className={`${btnClass} cursor-pointer`}
      >
        <IconDeviceDesktop size={iconSize} className="hidden md:block" />
        <IconDeviceTablet size={iconSize} className="hidden sm:block md:hidden" />
        <IconDeviceMobile size={iconSize} className="sm:hidden" />
      </button>
      {(
        [
          { value: 'light', icon: IconSun, label: 'Clair' },
          { value: 'dark', icon: IconMoon, label: 'Sombre' },
        ] as const
      ).map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => set(opt.value)}
          title={opt.label}
          aria-label={opt.label}
          aria-checked={activeMode === opt.value}
          disabled={!ready}
          role="radio"
          data-theme-opt={opt.value}
          className={`${btnClass} cursor-pointer`}
        >
          <opt.icon size={iconSize} />
        </button>
      ))}
    </div>
  );
}
