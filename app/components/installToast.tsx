'use client';

import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { usePWAInstall } from '@/app/hooks/usePWAInstall';
import { isDevMode } from '@/app/utils/environment';
import { IconDeviceMobile } from '@tabler/icons-react';
import { useCallback, useState } from 'react';

export default function InstallToast() {
  const { isInstallable, isInstalled, handleInstallClick } = usePWAInstall();
  const [toast, setToast] = useState<Toast>();
  const [hasShownToast, setHasShownToast] = useState(false);

  const onClickHandler = isDevMode() ? () => alert('Fake install toast clicked in dev mode') : handleInstallClick;

  // Function to close the toast
  const handleCloseToast = useCallback(() => {
    setToast(undefined);
    setHasShownToast(true);
  }, []);

  // Show the toast if installable or in dev mode
  const showToast = useCallback(() => {
    const messageText = isDevMode() ? "Installer l'app (Dev)" : "Installer l'app sur votre appareil";

    setToast({
      type: ToastType.Info,
      message: (
        <div className="flex items-center gap-2 cursor-pointer justify-self-center">
          <IconDeviceMobile size={20} />
          <span>{messageText}</span>
        </div>
      ),
    });
  }, []);

  // Show toast when installable status changes to true or in dev mode, but only if not previously shown
  if (isInstallable && !isInstalled && !toast && !hasShownToast) showToast();

  // If not installable or already installed, don't render anything
  if (!isInstallable || isInstalled || !toast) return null;

  return (
    <ToastMessage
      toast={toast}
      timeout={30000} // 30 seconds
      onClose={handleCloseToast}
      onClick={onClickHandler}
    />
  );
}
