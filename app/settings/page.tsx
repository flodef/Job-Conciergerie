'use client';

import Accordion from '@/app/components/accordion';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import ConciergerieSettings from '@/app/settings/components/conciergerieSettings';
import ConnectedDevicesSettings from '@/app/settings/components/connectedDevicesSettings';
import EmployeeSettings from '@/app/settings/components/employeeSettings';
import NotificationSettings from '@/app/settings/components/notificationSettings';
import { MAX_DEVICES } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import packageJson from '@/package.json';
import { IconBell, IconDevices, IconSettings } from '@tabler/icons-react';
import { useState } from 'react';

export default function Settings() {
  const { userType } = useAuth();

  const [toast, setToast] = useState<Toast>();

  // Get connected devices count for the subtitle
  const [storedLabels] = useLocalStorage<Array<{ id: string; label?: string }>>('device_labels', []);

  // Data is loaded by AuthProvider, no need to fetch here

  const accordionItems = [
    {
      title: 'Général',
      subtitle: `v. ${packageJson.version}`,
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
      <Accordion items={accordionItems} />
    </div>
  );
}
