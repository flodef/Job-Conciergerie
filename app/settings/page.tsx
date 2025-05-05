'use client';

import Accordion from '@/app/components/accordion';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useFetchTime } from '@/app/contexts/fetchTimeProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import AdvancedSettings from '@/app/settings/components/advancedSettings';
import ConciergerieSettings from '@/app/settings/components/conciergerieSettings';
import EmployeeSettings from '@/app/settings/components/employeeSettings';
import NotificationSettings from '@/app/settings/components/notificationSettings';
import { Page } from '@/app/utils/navigation';
import { IconBell, IconDevices, IconSettings } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

export default function Settings() {
  const { userType, isLoading: authLoading, fetchDataFromDatabase } = useAuth();
  const { currentPage } = useMenuContext();
  const { needsRefresh, updateFetchTime } = useFetchTime();

  const [toast, setToast] = useState<Toast>();

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

  // Sections content
  const generalSection = {
    conciergerie: <ConciergerieSettings />,
    employee: <EmployeeSettings />,
    undefined: null,
  }[userType || 'undefined'];

  const notificationsSection = <NotificationSettings />;

  const advancedSection = <AdvancedSettings />;

  const accordionItems = [
    {
      title: 'Général',
      icon: <IconSettings size={20} />,
      content: generalSection,
    },
    {
      title: 'Notifications',
      icon: <IconBell size={20} />,
      content: notificationsSection,
    },
    {
      title: 'Appareils connectés',
      icon: <IconDevices size={20} />,
      content: advancedSection,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />
      <Accordion items={accordionItems} />
    </div>
  );
}
