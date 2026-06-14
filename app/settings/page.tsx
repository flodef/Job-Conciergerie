'use client';

import Accordion from '@/app/components/accordion';
import ChangelogModal from '@/app/components/changelogModal';
import M3LoadingSpinner from '@/app/components/m3LoadingSpinner';
import { useAuth } from '@/app/contexts/authProvider';
import { useModal } from '@/app/contexts/modalProvider';
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
  const { openModal, closeModal } = useModal();

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    if (!authLoading) setHasLoadedOnce(true);
  }, [authLoading]);

  const deviceCount = userData?.id?.length ?? 0;

  const handleShowChangelog = () => {
    const id = openModal(() => <ChangelogModal onClose={() => closeModal(id)} mode="history" />);
  };

  // Data is loaded by AuthProvider, no need to fetch here

  const accordionItems = [
    {
      title: 'Général',
      subtitle: (
        <span
          className="flex flex-row items-center gap-1.5 text-light hover:text-foreground/70 transition-colors cursor-help"
          role="button"
          tabIndex={0}
          onClick={e => {
            e.stopPropagation();
            handleShowChangelog();
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              handleShowChangelog();
            }
          }}
          title="Notes de version"
        >
          <IconInfoCircle size={20} />
          v. {packageJson.version}
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
      <Accordion items={accordionItems} defaultOpenIndex={-1} />
    </div>
  );
}
