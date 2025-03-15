import Switch from '@/app/components/switch';
import { ToastMessage, ToastProps, ToastType } from '@/app/components/toastMessage';
import { ConciergerieNotificationSettings, EmployeeNotificationSettings } from '@/app/types/types';
import { getWelcomeParams, updateConciergerieData, updateEmployeeData } from '@/app/utils/welcomeParams';
import React, { useEffect, useState } from 'react';

interface NotificationSettingsProps {
  userType?: 'conciergerie' | 'employee';
}

const conciergerieOptions = [
  { label: 'Missions acceptées', key: 'acceptedMissions' as const },
  { label: 'Missions démarrées', key: 'startedMissions' as const },
  { label: 'Missions terminées', key: 'completedMissions' as const },
  { label: 'Missions non démarrées à temps', key: 'missionsEndedWithoutStart' as const },
];

const employeeOptions = [
  { label: 'Mission acceptée', key: 'acceptedMissions' as const },
  { label: 'Mission modifiée', key: 'missionChanged' as const },
  { label: 'Mission supprimée', key: 'missionDeleted' as const },
  { label: 'Mission annulée', key: 'missionsCanceled' as const },
];

const defaultConciergerieSettings: ConciergerieNotificationSettings = {
  acceptedMissions: true,
  startedMissions: true,
  completedMissions: true,
  missionsEndedWithoutStart: true,
};

const defaultEmployeeSettings: EmployeeNotificationSettings = {
  acceptedMissions: true,
  missionChanged: true,
  missionDeleted: true,
  missionsCanceled: true,
};

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ userType }) => {
  const [toastMessage, setToastMessage] = useState<ToastProps>();
  const [settings, setSettings] = useState<ConciergerieNotificationSettings | EmployeeNotificationSettings>(
    userType === 'conciergerie' ? defaultConciergerieSettings : defaultEmployeeSettings,
  );
  const options = userType === 'conciergerie' ? conciergerieOptions : employeeOptions;

  useEffect(() => {
    const params = getWelcomeParams();
    if (userType === 'conciergerie' && params.conciergerieData?.notificationSettings) {
      setSettings(params.conciergerieData.notificationSettings);
    } else if (userType === 'employee' && params.employeeData?.notificationSettings) {
      setSettings(params.employeeData.notificationSettings);
    }
  }, [userType]);

  const handleToggle = <T extends ConciergerieNotificationSettings | EmployeeNotificationSettings>(key: keyof T) => {
    setSettings(prevSettings => {
      const newSettings: T = { ...prevSettings, [key]: !(prevSettings as T)[key] } as T;

      try {
        const params = getWelcomeParams();
        if (userType === 'conciergerie' && params.conciergerieData) {
          updateConciergerieData({
            ...params.conciergerieData,
            notificationSettings: newSettings as ConciergerieNotificationSettings,
          });
        } else if (userType === 'employee' && params.employeeData) {
          updateEmployeeData({
            ...params.employeeData,
            notificationSettings: newSettings as EmployeeNotificationSettings,
          });
        }

        setToastMessage({
          type: ToastType.Success,
          message: 'Préférences de notification enregistrées',
        });
      } catch (error) {
        console.error('Error saving notification settings:', error);
        setToastMessage({
          type: ToastType.Error,
          message: "Erreur lors de l'enregistrement des préférences",
        });
      }

      return newSettings;
    });
  };

  if (!userType) return null;

  return (
    <div className="space-y-4">
      {toastMessage && (
        <ToastMessage
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={() => setToastMessage(undefined)}
        />
      )}

      <div className="space-y-1">
        <h3 className="text-sm font-medium mb-2">Recevoir un email lorsque :</h3>
        <div className="space-y-1 divide-y divide-secondary">
          {options.map(option => (
            <div
              key={option.key}
              className="flex items-center justify-between py-2 hover:bg-secondary/10 px-2 rounded transition-colors"
            >
              <span className="text-sm">{option.label}</span>
              <Switch
                enabled={settings[option.key as keyof typeof settings]}
                onChange={() => handleToggle(option.key)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
