import { updateConciergerieData } from '@/app/actions/conciergerie';
import { updateEmployeeData } from '@/app/actions/employee';
import Switch from '@/app/components/switch';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth, UserType } from '@/app/contexts/authProvider';
import { Conciergerie, Employee } from '@/app/types/dataTypes';
import {
  ConciergerieNotificationSettings,
  defaultConciergerieSettings,
  defaultEmployeeSettings,
  EmployeeNotificationSettings,
} from '@/app/utils/notifications';
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
  const { userType, getUserData, updateUserData } = useAuth();

  const [toast, setToast] = useState<Toast>();
  const [settings, setSettings] = useState<ConciergerieNotificationSettings | EmployeeNotificationSettings>(
    getUserData()?.notificationSettings || getDefaultSettings(userType),
  );
  const options = userType === 'conciergerie' ? conciergerieOptions : employeeOptions;

  const handleToggle = <T extends ConciergerieNotificationSettings | EmployeeNotificationSettings>(key: keyof T) => {
    if (!userType) return;

    // First update the local state
    const newSettings = {
      ...settings,
      [key]: !(settings as T)[key],
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
          const data = await updateConciergerieData(getUserData<Conciergerie>(), {
            notificationSettings: settings as ConciergerieNotificationSettings,
          });
          if (!data) throw new Error('failed to update conciergerie in database');
          updateUserData(data);
        },
        employee: async () => {
          const data = await updateEmployeeData(getUserData<Employee>(), {
            notificationSettings: settings as EmployeeNotificationSettings,
          });
          if (!data) throw new Error('failed to update employee in database');
          updateUserData(data);
        },
      }[userType];

      await updateData();

      setToast({
        type: ToastType.Success,
        message: 'Préférences de notification enregistrées',
      });
    } catch (error) {
      setToast({
        type: ToastType.Error,
        message: "Erreur lors de l'enregistrement des préférences",
        error,
      });
    }
  };

  if (!userType) return null;

  return (
    <div className="space-y-4">
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />

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
