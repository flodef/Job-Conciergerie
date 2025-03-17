'use client';

import Accordion from '../components/accordion';
import LoadingSpinner from '../components/loadingSpinner';
import { useAuth } from '../contexts/authProvider';
import { useRedirectIfNotRegistered } from '../utils/authRedirect';
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
  const { userType, isLoading } = useAuth();

  // Redirect if not registered - must be called before any conditional returns
  useRedirectIfNotRegistered();

  // Prevent rendering anything until authentication is complete
  // This prevents the brief flash of the settings page before redirect
  if (isLoading || !userType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="large" text="Vérification de l'authentification..." />
      </div>
    );
  }

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
