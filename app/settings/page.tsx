'use client';

import Accordion from '@/app/components/accordion';
import ChangelogModal from '@/app/components/changelogModal';
import M3LoadingSpinner from '@/app/components/m3LoadingSpinner';
import { Toast, ToastMessage } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import ConciergerieSettings from '@/app/settings/components/conciergerieSettings';
import ConnectedDevicesSettings from '@/app/settings/components/connectedDevicesSettings';
import EmployeeSettings from '@/app/settings/components/employeeSettings';
import NotificationSettings from '@/app/settings/components/notificationSettings';
import { MAX_DEVICES } from '@/app/utils/id';
import packageJson from '@/package.json';
import { IconBell, IconDevices, IconInfoCircle, IconSettings } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

export default function Settings() {
  const { userType, isLoading: authLoading, userData } = useAuth();

  const [toast, setToast] = useState<Toast>();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [showChangelogHistory, setShowChangelogHistory] = useState(false);

  useEffect(() => {
    if (!authLoading) setHasLoadedOnce(true);
  }, [authLoading]);

  const deviceCount = userData?.id?.length ?? 0;

  // Data is loaded by AuthProvider, no need to fetch here

  const accordionItems = [
    {
      title: 'Général',
      subtitle: (
        <span className="flex items-center gap-1.5">
          <span
            role="button"
            tabIndex={0}
            onClick={e => {
              e.stopPropagation();
              setShowChangelogHistory(true);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                setShowChangelogHistory(true);
              }
            }}
            className="text-foreground/40 hover:text-primary transition-colors cursor-pointer"
            title="Notes de version"
          >
            <IconInfoCircle size={20} />
          </span>
          <span>v. {packageJson.version}</span>
        </span>
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
      subtitle: `${deviceCount}/${MAX_DEVICES}`,
      icon: <IconDevices size={20} />,
      content: <ConnectedDevicesSettings />,
    },
  ];

  if (!hasLoadedOnce) return <M3LoadingSpinner />;

  return (
    <div className="bg-background min-h-full max-w-2xl mx-auto px-4">
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />
      {showChangelogHistory && userType && (userType === 'employee' || userType === 'conciergerie') && (
        <ChangelogModal userType={userType} onClose={() => setShowChangelogHistory(false)} mode="history" />
      )}
      <Accordion items={accordionItems} defaultOpenIndex={-1} />
    </div>
  );
}
