'use client';

import Accordion from '@/app/components/accordion';
import LoadingSpinner from '@/app/components/loadingSpinner';
import { useAuth } from '@/app/contexts/authProvider';
import AdvancedSettings from '@/app/settings/components/advancedSettings';
import ConciergerieSettings from '@/app/settings/components/conciergerieSettings';
import EmployeeSettings from '@/app/settings/components/employeeSettings';
import NotificationSettings from '@/app/settings/components/notificationSettings';

export default function Settings() {
  const { userType, isLoading: authLoading } = useAuth();

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

  if (authLoading) return <LoadingSpinner />;

  return userType ? (
    <div className="max-w-2xl mx-auto">
      <Accordion items={accordionItems} />
    </div>
  ) : (
    <div className="h-full flex items-center justify-center bg-background">
      <p className="text-foreground/70">Aucune information utilisateur disponible.</p>
    </div>
  );
}
