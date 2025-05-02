'use client';

import Accordion from '@/app/components/accordion';
import { useAuth } from '@/app/contexts/authProvider';
import AdvancedSettings from '@/app/settings/components/advancedSettings';
import ConciergerieSettings from '@/app/settings/components/conciergerieSettings';
import EmployeeSettings from '@/app/settings/components/employeeSettings';
import NotificationSettings from '@/app/settings/components/notificationSettings';
import { IconBell, IconDevices, IconSettings } from '@tabler/icons-react';

export default function Settings() {
  const { userType } = useAuth();

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
      <Accordion items={accordionItems} />
    </div>
  );
}
