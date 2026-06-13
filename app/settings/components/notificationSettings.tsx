import { updateConciergerieData } from '@/app/actions/conciergerie';
import { updateEmployeeData } from '@/app/actions/employee';
import Switch from '@/app/components/switch';
import { ToastType } from '@/app/components/toastMessage';
import type { UserType } from '@/app/contexts/authProvider';
import { useAuth } from '@/app/contexts/authProvider';
import { useToast } from '@/app/contexts/toastProvider';
import type { Conciergerie, Employee } from '@/app/types/dataTypes';
import { labelClassName } from '@/app/utils/className';
import type { ConciergerieNotificationSettings, EmployeeNotificationSettings } from '@/app/utils/notifications';
import { defaultConciergerieSettings, defaultEmployeeSettings } from '@/app/utils/notifications';
import React, { useState } from 'react';

const conciergerieOptions = [
  { label: 'Missions acceptées', key: 'acceptedMissions' as const },
  { label: 'Missions démarrées', key: 'startedMissions' as const },
  { label: 'Missions terminées', key: 'completedMissions' as const },
  { label: 'Missions non terminées à temps', key: 'missionsEndedWithoutCompletion' as const },
];
const employeeOptions = [
  { label: 'Mission acceptée', key: 'acceptedMissions' as const },
  { label: 'Mission modifiée', key: 'missionChanged' as const },
  { label: 'Mission supprimée', key: 'missionDeleted' as const },
  { label: 'Mission annulée', key: 'missionsCanceled' as const },
];

const getDefaultSettings = (userType: UserType | undefined) => {
  return {
    conciergerie: defaultConciergerieSettings,
    employee: defaultEmployeeSettings,
  }[userType || 'employee'];
};

const NotificationSettings: React.FC = () => {
  const { userType, userData, updateUserData, isConciergerie } = useAuth();

  const { showToast } = useToast();
  const [settings, setSettings] = useState<ConciergerieNotificationSettings | EmployeeNotificationSettings>(
    userData?.notificationSettings || getDefaultSettings(userType),
  );
  const options = isConciergerie ? conciergerieOptions : employeeOptions;

  const handleToggle = <T extends ConciergerieNotificationSettings | EmployeeNotificationSettings>(
    key: keyof T,
    newValue: boolean,
  ) => {
    if (!userType) return;

    // First update the local state
    const newSettings = {
      ...settings,
      [key]: newValue,
    };
    setSettings(newSettings);

    // Then update the database in a separate function call
    updateSettingsInDatabase(newSettings);
  };

  const updateSettingsInDatabase = async <T extends ConciergerieNotificationSettings | EmployeeNotificationSettings>(
    settings: T,
  ) => {
    try {
      if (!userType) throw new Error('User type not found');

      const updateData = {
        conciergerie: async () => {
          const data = await updateConciergerieData(userData as Conciergerie, {
            notificationSettings: settings as ConciergerieNotificationSettings,
          });
          if (!data) throw new Error('failed to update conciergerie in database');
          updateUserData(data);
        },
        employee: async () => {
          const data = await updateEmployeeData(userData as Employee, {
            notificationSettings: settings as EmployeeNotificationSettings,
          });
          if (!data) throw new Error('failed to update employee in database');
          updateUserData(data);
        },
      }[userType];

      await updateData();

      showToast({
        type: ToastType.Success,
        message: 'Préférences de notification enregistrées',
      });
    } catch (error) {
      showToast({
        type: ToastType.Error,
        message: "Erreur lors de l'enregistrement des préférences",
        error,
      });
    }
  };

  if (!userType) return null;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className={labelClassName}>Recevoir un email lorsque :</h3>
        <div className="space-y-1 divide-y divide-secondary mt-2">
          {options.map(option => (
            <div
              key={option.key}
              className="flex items-center justify-between py-2 hover:bg-secondary/10 px-2 rounded transition-colors"
            >
              <Switch
                className="text-sm my-0"
                label={option.label}
                enabled={settings[option.key as keyof typeof settings]}
                onToggle={newValue => handleToggle(option.key, newValue)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
