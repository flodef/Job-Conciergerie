'use client';

import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { usePWAInstall } from '@/app/hooks/usePWAInstall';
import { isDevMode } from '@/app/utils/environment';
import { IconDeviceMobile } from '@tabler/icons-react';
import { useCallback, useState } from 'react';

export default function InstallToast() {
  const { isInstallable, isInstalled, handleInstallClick } = usePWAInstall();
  const inDevMode = isDevMode();
  const [toast, setToast] = useState<Toast>();
  const [hasShownToast, setHasShownToast] = useState(false);

  const isFakeToast = inDevMode && !isInstallable;
  const onClickHandler = isFakeToast ? () => alert('Fake install toast clicked in dev mode') : handleInstallClick;

  // Function to close the toast
  const handleCloseToast = useCallback(() => {
    setToast(undefined);
    setHasShownToast(true);
  }, []);

  // Show the toast if installable or in dev mode
  const showToast = useCallback(() => {
    const messageText = isFakeToast ? "Installer l'app (Dev)" : "Installer l'app sur votre appareil";

    setToast({
      type: ToastType.Info,
      message: (
        <div className="flex items-center gap-2 cursor-pointer justify-self-center">
          <IconDeviceMobile size={20} />
          <span>{messageText}</span>
        </div>
      ),
    });
  }, [isFakeToast]);

  // Show toast when installable status changes to true or in dev mode, but only if not previously shown
  if ((isInstallable || inDevMode) && !isInstalled && !toast && !hasShownToast) showToast();

  // If not installable or already installed, and not in dev mode, don't render anything
  if ((!isInstallable && !inDevMode) || isInstalled || !toast) return null;

  return (
    <ToastMessage
      toast={toast}
      timeout={30000} // 30 seconds
      onClose={handleCloseToast}
      onClick={onClickHandler}
    />
  );
}
