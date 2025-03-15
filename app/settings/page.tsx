'use client';

import { useEffect, useState } from 'react';
import Accordion from '../components/accordion';
import { useRedirectIfNotRegistered } from '../utils/redirectIfNotRegistered';
import { getWelcomeParams } from '../utils/welcomeParams';
import AdvancedSettings from './components/advancedSettings';
import ConciergerieSettings from './components/conciergerieSettings';
import EmployeeSettings from './components/employeeSettings';
import NotificationSettings from './components/notificationSettings';

function NoUserInfo() {
  return (
    <div className="min-h-10 flex items-center justify-center bg-background">
      <p className="text-foreground/70">Aucune information utilisateur disponible.</p>
    </div>
  );
}

export default function Settings() {
  const [userType, setUserType] = useState<'conciergerie' | 'employee'>();

  // Redirect if not registered
  useRedirectIfNotRegistered();

  useEffect(() => {
    const params = getWelcomeParams();
    setUserType(params.userType);
  }, []);

  // Sections content
  const generalSection = {
    conciergerie: <ConciergerieSettings />,
    employee: <EmployeeSettings />,
    '': <NoUserInfo />,
  }[userType || ''];

  const notificationsSection = <NotificationSettings userType={userType} />;

  const advancedSection = <AdvancedSettings userType={userType} />;

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
