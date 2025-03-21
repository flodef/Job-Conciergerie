'use client';

import Accordion from '@/app/components/accordion';
import { useAuth } from '@/app/contexts/authProvider';
import AdvancedSettings from '@/app/settings/components/advancedSettings';
import ConciergerieSettings from '@/app/settings/components/conciergerieSettings';
import EmployeeSettings from '@/app/settings/components/employeeSettings';
import NotificationSettings from '@/app/settings/components/notificationSettings';
import { useRedirectIfNotRegistered } from '@/app/utils/authRedirect';

function NoUserInfo() {
  return (
    <div className="min-h-10 flex items-center justify-center bg-background">
      <p className="text-foreground/70">Aucune information utilisateur disponible.</p>
    </div>
  );
}

export default function Settings() {
  const { userType } = useAuth();

  // Redirect if not registered - must be called before any conditional returns
  useRedirectIfNotRegistered();

  // Sections content
  const generalSection = {
    conciergerie: <ConciergerieSettings />,
    employee: <EmployeeSettings />,
    undefined: <NoUserInfo />,
  }[userType || 'undefined'];

  const notificationsSection = <NotificationSettings />;

  const advancedSection = <AdvancedSettings />;

  const accordionItems = [
    {
      title: 'Général',
      content: generalSection,
    },
    {
      title: 'Notifications',
      content: notificationsSection,
    },
    {
      title: 'Avancé',
      content: advancedSection,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <Accordion items={accordionItems} />
    </div>
  );
}
