'use client';

import { usePWAInstall } from '@/app/hooks/usePWAInstall';
import { buttonClassName } from '@/app/utils/className';
import { IconDeviceMobile } from '@tabler/icons-react';
import { isDevMode } from '@/app/utils/environment';

export default function InstallButton() {
  const { isInstallable, isInstalled, handleInstallClick } = usePWAInstall();

  // Don't render anything if not installable or already installed
  if (!isInstallable || isInstalled) return null;

  // Determine button properties based on installability
  const isFakeButton = isDevMode();
  const onClickHandler = isFakeButton ? () => alert('Fake install button clicked in dev mode') : handleInstallClick;
  const buttonLabel = isFakeButton ? "Installer l'app (Dev)" : "Installer l'app sur votre appareil";
  const ariaLabel = isFakeButton ? 'Fake install button for development' : "Installer l'app sur votre appareil";

  return (
    <button onClick={onClickHandler} className={buttonClassName('primary')} aria-label={ariaLabel}>
      <IconDeviceMobile size={20} />
      {buttonLabel}
    </button>
  );
}
