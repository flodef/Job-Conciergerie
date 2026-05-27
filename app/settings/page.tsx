'use client';

import Accordion from '@/app/components/accordion';
import ChangelogModal from '@/app/components/changelogModal';
import { Toast, ToastMessage } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import ConciergerieSettings from '@/app/settings/components/conciergerieSettings';
import ConnectedDevicesSettings from '@/app/settings/components/connectedDevicesSettings';
import EmployeeSettings from '@/app/settings/components/employeeSettings';
import NotificationSettings from '@/app/settings/components/notificationSettings';
import { MAX_DEVICES } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import packageJson from '@/package.json';
import { IconBell, IconDevices, IconInfoCircle, IconSettings } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

export default function Settings() {
  const { userType, isLoading: authLoading } = useAuth();

  const [toast, setToast] = useState<Toast>();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [showChangelogHistory, setShowChangelogHistory] = useState(false);

  useEffect(() => {
    if (!authLoading) setHasLoadedOnce(true);
  }, [authLoading]);

  // Get connected devices count for the subtitle
  const [storedLabels] = useLocalStorage<Array<{ id: string; label?: string }>>('device_labels', []);

  // Data is loaded by AuthProvider, no need to fetch here

  const accordionItems = [
    {
      title: 'Général',
      subtitle: (
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500">v. {packageJson.version}</span>
          <button
            onClick={e => {
              e.stopPropagation();
              setShowChangelogHistory(true);
            }}
            className="text-foreground/40 hover:text-primary transition-colors"
            title="Notes de version"
          >
            <IconInfoCircle size={16} />
          </button>
        </div>
      ),
      icon: <IconSettings size={20} />,
      content: {
        conciergerie: <ConciergerieSettings />,
        employee: <EmployeeSettings />,
        undefined: null,
      }[userType || 'undefined'],
    },
    {
      title: 'Notifications',
      icon: <IconBell size={20} />,
      content: <NotificationSettings />,
    },
    {
      title: 'Appareils connectés',
      subtitle: `${storedLabels?.length || 0}/${MAX_DEVICES}`,
      icon: <IconDevices size={20} />,
      content: <ConnectedDevicesSettings />,
    },
  ];

  return (
    <div className="bg-background min-h-full max-w-2xl mx-auto px-4">
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />
      {showChangelogHistory && userType && (userType === 'employee' || userType === 'conciergerie') && (
        <ChangelogModal userType={userType} onClose={() => setShowChangelogHistory(false)} mode="history" />
      )}
      {!hasLoadedOnce ? (
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Accordion items={accordionItems} />
      )}
    </div>
  );
}
