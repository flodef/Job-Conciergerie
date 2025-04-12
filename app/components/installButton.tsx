'use client';

import { buttonClassName } from '@/app/utils/className';
import { IconDeviceMobile } from '@tabler/icons-react';
import { usePWAInstall } from '@/app/hooks/usePWAInstall';
import { isDevMode } from '@/app/utils/environment';

export default function InstallButton() {
  const { isInstallable, isInstalled, handleInstallClick } = usePWAInstall();
  const inDevMode = isDevMode();

  // Don't render anything if not installable and not in dev mode, or if already installed
  if ((!isInstallable && !inDevMode) || isInstalled) return null;

  // Determine button properties based on dev mode and installability
  const isFakeButton = inDevMode && !isInstallable;
  const onClickHandler = isFakeButton
    ? () => console.log('Fake install button clicked in dev mode')
    : handleInstallClick;
  const buttonLabel = isFakeButton ? "Installer l'app (Dev)" : "Installer l'application";
  const ariaLabel = isFakeButton ? 'Fake install button for development' : "Installer l'application";

  return (
    <button
      onClick={onClickHandler}
      className={buttonClassName('primary') + ' flex items-center gap-2 text-sm mt-4'}
      aria-label={ariaLabel}
    >
      <IconDeviceMobile size={20} />
      {buttonLabel}
    </button>
  );
}
