'use client';

import { useOnlineStatus } from '@/app/hooks/useOnlineStatus';
import { IconWifi, IconWifiOff } from '@tabler/icons-react';
import { cn } from '@/app/utils/className';

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus();

  // Only show when offline or briefly when reconnected
  if (isOnline && !wasOffline) return null;

  return (
    <div
      className={cn(
        'fixed bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-50 transition-all duration-300 shadow-lg',
        isOnline
          ? 'bg-green-500 text-white animate-fade-out'
          : 'bg-amber-500 text-white'
      )}
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <IconWifi size={16} />
            <span>Connexion rétablie</span>
          </>
        ) : (
          <>
            <IconWifiOff size={16} />
            <span>Mode hors ligne</span>
          </>
        )}
      </div>
    </div>
  );
}
