'use client';

import { useCallback, useState } from 'react';
import { IconDeviceMobile } from '@tabler/icons-react';
import { Toast, ToastType } from '@/app/components/toastMessage';
import { ToastMessage } from '@/app/components/toastMessage';
import { usePWAInstall } from '@/app/hooks/usePWAInstall';
import { isDevMode } from '@/app/utils/environment';

export default function InstallToast() {
  const { isInstallable, isInstalled, handleInstallClick } = usePWAInstall();
  const inDevMode = isDevMode();
  const [toast, setToast] = useState<Toast | undefined>(undefined);

  // Function to close the toast
  const handleCloseToast = useCallback(() => {
    setToast(undefined);
  }, []);

  // Show the toast if installable or in dev mode
  const showToast = useCallback(() => {
    const isFakeToast = inDevMode && !isInstallable;
    const onClickHandler = isFakeToast ? () => console.log('Fake install toast clicked in dev mode') : handleInstallClick;
    const messageText = isFakeToast ? "Installer l&apos;application (Dev)" : "Installer l&apos;application sur votre appareil";

    setToast({
      type: ToastType.Info,
      message: (
        <div className="flex items-center gap-2 cursor-pointer" onClick={onClickHandler}>
          <IconDeviceMobile size={20} />
          <span>{messageText}</span>
        </div>
      )
    });
  }, [handleInstallClick, inDevMode, isInstallable]);

  // Show toast when installable status changes to true or in dev mode
  if ((isInstallable || inDevMode) && !isInstalled && !toast) {
    showToast();
  }

  // If not installable or already installed, and not in dev mode, don't render anything
  if ((!isInstallable && !inDevMode) || isInstalled || !toast) return null;

  return (
    <ToastMessage 
      toast={toast} 
      timeout={30000} // 30 seconds
      onClose={handleCloseToast} 
    />
  );
}
