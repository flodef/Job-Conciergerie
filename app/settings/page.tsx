'use client';

import Accordion from '@/app/components/accordion';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useFetchTime } from '@/app/contexts/fetchTimeProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import ConciergerieSettings from '@/app/settings/components/conciergerieSettings';
import ConnectedDevicesSettings from '@/app/settings/components/connectedDevicesSettings';
import EmployeeSettings from '@/app/settings/components/employeeSettings';
import NotificationSettings from '@/app/settings/components/notificationSettings';
import { MAX_DEVICES } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import { Page } from '@/app/utils/navigation';
import packageJson from '@/package.json';
import { IconBell, IconDevices, IconSettings } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

export default function Settings() {
  const { userType, isLoading: authLoading, fetchDataFromDatabase } = useAuth();
  const { currentPage } = useMenuContext();
  const { needsRefresh, updateFetchTime } = useFetchTime();

  const [toast, setToast] = useState<Toast>();

  // Get connected devices count for the subtitle
  const [storedLabels] = useLocalStorage<Array<{ id: string; label?: string }>>('device_labels', []);

  const isFetching = useRef(false);
  useEffect(() => {
    // Skip if still loading
    if (authLoading || currentPage !== Page.Settings || isFetching.current || !needsRefresh[Page.Settings]) return;

    isFetching.current = true;
    fetchDataFromDatabase(userType === 'conciergerie' ? 'conciergerie' : 'employee')
      .then(isSuccess => {
        if (isSuccess) updateFetchTime(Page.Settings);
        else
          setToast({
            type: ToastType.Error,
            message: 'Erreur lors du chargement des paramètres',
          });
      })
      .finally(() => (isFetching.current = false));
  }, [currentPage, authLoading, fetchDataFromDatabase, updateFetchTime, needsRefresh, userType]);

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
    <div className="max-w-2xl mx-auto">
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />
      <Accordion items={accordionItems} />
    </div>
  );
}
