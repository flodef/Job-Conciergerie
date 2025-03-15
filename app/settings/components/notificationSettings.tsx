import React from 'react';

interface NotificationSettingsProps {
  userType?: 'conciergerie' | 'employee';
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ userType }) => {
  console.log(userType);
  return <div className="text-sm opacity-70 italic">Les paramètres de notification seront bientôt disponibles.</div>;
};

export default NotificationSettings;
