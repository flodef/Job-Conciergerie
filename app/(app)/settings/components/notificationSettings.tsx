import { updateConciergerieData } from '@/app/actions/conciergerie';
import { updateEmployeeData } from '@/app/actions/employee';
import {
  clearMyPushSubscriptions,
  removeMyPushSubscription,
  saveMyPushSubscription,
  sendTestPushNotification,
  type PushSubscriptionInput,
} from '@/app/actions/push';
import { Button } from '@/app/components/button';
import Switch from '@/app/components/switch';
import { ToastType } from '@/app/components/toastMessage';
import type { UserType } from '@/app/contexts/authProvider';
import { useAuth } from '@/app/contexts/authProvider';
import { useToast } from '@/app/contexts/toastProvider';
import type { Conciergerie, Employee } from '@/app/types/dataTypes';
import { cn, labelClassName } from '@/app/utils/className';
import type { ConciergerieNotificationSettings, EmployeeNotificationSettings } from '@/app/utils/notifications';
import { defaultConciergerieSettings, defaultEmployeeSettings } from '@/app/utils/notifications';
import {
  getDeviceSubscription,
  isBrave,
  isIOS,
  isPushSupported,
  isStandalone,
  subscribeDeviceToPush,
} from '@/app/utils/pushClient';
import { IconBell, IconCheck, IconMail } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';

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

type AnySettings = ConciergerieNotificationSettings | EmployeeNotificationSettings;

// Icon toggle button for a delivery channel (email / push)
const ChannelToggle: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, active, onClick, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={active}
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'p-2.5 rounded-xl border-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
      active ? 'border-primary bg-primary/15 text-primary' : 'border-secondary/40 text-light hover:text-foreground',
    )}
  >
    {icon}
  </button>
);

const NotificationSettings: React.FC = () => {
  const { userType, userData, updateUserData, isConciergerie } = useAuth();

  const { showToast } = useToast();
  const [settings, setSettings] = useState<AnySettings>(userData?.notificationSettings || getDefaultSettings(userType));
  const options = isConciergerie ? conciergerieOptions : employeeOptions;

  const emailOn = settings.email !== false; // legacy rows predate channels → default on
  const pushOn = settings.push === true;

  // Whether THIS device holds an active push subscription (null = checking)
  const [deviceSubscribed, setDeviceSubscribed] = useState<boolean | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isPushSupported()) getDeviceSubscription().then(s => setDeviceSubscribed(!!s));
    else setDeviceSubscribed(false);
  }, []);

  // Sync settings with userData when it changes
  useEffect(() => {
    if (userData?.notificationSettings) {
      setSettings(userData.notificationSettings);
    }
  }, [userData?.notificationSettings]);

  const updateSettingsInDatabase = async (newSettings: AnySettings) => {
    try {
      if (!userType) throw new Error('User type not found');

      const updateData = {
        conciergerie: async () => {
          const data = await updateConciergerieData(userData as Conciergerie, {
            notificationSettings: newSettings as ConciergerieNotificationSettings,
          });
          if (!data) throw new Error('failed to update conciergerie in database');
          updateUserData(data);
        },
        employee: async () => {
          const data = await updateEmployeeData(userData as Employee, {
            notificationSettings: newSettings as EmployeeNotificationSettings,
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

  const handleToggle = <T extends AnySettings>(key: keyof T, newValue: boolean) => {
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

  // Subscribe THIS device and store the subscription server-side.
  // Returns false (with an explanatory toast) when it can't be done.
  const subscribeThisDevice = async (): Promise<boolean> => {
    if (isIOS() && !isStandalone()) {
      showToast({
        type: ToastType.Info,
        message: 'Sur iPhone/iPad, installez d’abord l’app : bouton Partager → « Sur l’écran d’accueil »',
      });
      return false;
    }
    if (!isPushSupported()) {
      showToast({ type: ToastType.Error, message: 'Les notifications ne sont pas supportées par ce navigateur' });
      return false;
    }
    if (Notification.permission === 'denied') {
      showToast({
        type: ToastType.Error,
        message: 'Notifications bloquées — réautorisez-les dans les réglages du navigateur pour ce site',
      });
      return false;
    }

    setIsSubscribing(true);
    try {
      const result = await subscribeDeviceToPush();
      if (!result.ok) {
        const message = {
          denied: 'Autorisation des notifications refusée',
          'no-sw':
            process.env.NODE_ENV === 'development'
              ? 'Indisponible en dev — le service worker ne tourne qu’en production'
              : 'Service worker indisponible — rechargez la page puis réessayez',
          unsupported: 'Les notifications ne sont pas configurées ou supportées ici',
          failed: isBrave()
            ? 'Brave bloque les notifications push — cliquez pour copier le réglage à activer'
            : "Impossible d'activer les notifications sur cet appareil",
        }[result.reason];
        showToast(
          { type: ToastType.Error, message, error: result.error },
          result.reason === 'failed' && isBrave()
            ? {
                // Stays until closed manually — the user needs time to read and act
                timeout: 0,
                onClick: () => {
                  // Clipboard may reject without permission — the URL is still shown
                  navigator.clipboard.writeText('brave://settings/privacy').catch(() => {});
                  showToast(
                    {
                      type: ToastType.Info,
                      message:
                        'Collez l’URL copiée dans la barre d’adresse, puis activez « Services Google pour les messages push »',
                    },
                    { timeout: 0 },
                  );
                },
              }
            : { timeout: 10000 },
        );
        return false;
      }
      // One retry on the server save — a cold DB or transient timeout
      // shouldn't leave an orphaned browser subscription behind.
      const json = result.subscription.toJSON() as PushSubscriptionInput;
      if ((await saveMyPushSubscription(json)) || (await saveMyPushSubscription(json))) {
        setDeviceSubscribed(true);
        return true;
      }
      showToast({ type: ToastType.Error, message: "Échec de l'enregistrement de l'abonnement — réessayez" });
      return false;
    } finally {
      setIsSubscribing(false);
    }
  };

  const handlePushToggle = async (on: boolean) => {
    if (!on) {
      const sub = await getDeviceSubscription();
      if (sub) {
        await removeMyPushSubscription(sub.endpoint);
        await sub.unsubscribe().catch(() => {});
      }
      await clearMyPushSubscriptions(); // push is account-level: off = no device receives
      setDeviceSubscribed(false);
      handleToggle('push' as keyof AnySettings, false);
      return;
    }
    // Enabling push requires this device to subscribe — otherwise the account
    // flag would be on with zero delivery, silently.
    if (await subscribeThisDevice()) handleToggle('push' as keyof AnySettings, true);
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      switch (await sendTestPushNotification()) {
        case 'sent':
          showToast({
            type: ToastType.Success,
            message: 'Notification de test envoyée — elle devrait arriver dans quelques secondes',
          });
          break;
        case 'no-subscription':
          showToast({
            type: ToastType.Error,
            message: 'Aucun appareil abonné — activez les notifications sur cet appareil',
          });
          break;
        case 'failed':
          showToast({
            type: ToastType.Error,
            message: "Échec de l'envoi — réessayez dans un instant",
          });
          break;
        case 'rate-limited':
          showToast({
            type: ToastType.Error,
            message: 'Trop de tests — réessayez dans une heure',
          });
          break;
        default:
          showToast({ type: ToastType.Error, message: 'Session expirée — reconnectez-vous' });
      }
    } finally {
      setIsTesting(false);
    }
  };

  if (!userType) return null;

  const statusText = emailOn
    ? pushOn
      ? 'Recevoir un email + une notification lorsque :'
      : 'Recevoir un email lorsque :'
    : pushOn
      ? 'Recevoir une notification lorsque :'
      : 'Ne rien recevoir';

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <ChannelToggle
            icon={<IconMail size={20} />}
            label="Email"
            active={emailOn}
            onClick={() => handleToggle('email' as keyof AnySettings, !emailOn)}
          />
          <ChannelToggle
            icon={<IconBell size={20} />}
            label="Notifications push"
            active={pushOn}
            disabled={isSubscribing}
            onClick={() => handlePushToggle(!pushOn)}
          />
          <span className={cn(labelClassName, 'mb-0 whitespace-normal')}>{statusText}</span>
        </div>

        {pushOn && deviceSubscribed !== null && (
          <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {deviceSubscribed ? (
              <>
                <p className="flex items-center gap-1.5 text-xs text-foreground/60 px-2">
                  <IconCheck size={14} className="text-green-500" />
                  Notifications push activées sur cet appareil
                </p>
                <Button style="secondary" onClick={handleTest} loading={isTesting} className="text-xs py-1 px-2">
                  Tester
                </Button>
              </>
            ) : (
              <Button style="secondary" onClick={subscribeThisDevice} loading={isSubscribing}>
                Activer les notifications sur cet appareil
              </Button>
            )}
          </div>
        )}

        <div
          className={cn(
            'space-y-1 divide-y divide-secondary mt-2',
            !emailOn && !pushOn && 'opacity-40 pointer-events-none',
          )}
        >
          {options.map(option => (
            <div
              key={option.key}
              className="flex items-center justify-between py-2 hover:bg-secondary/10 px-2 rounded transition-colors"
            >
              <Switch
                className="text-sm my-0"
                label={option.label}
                enabled={!!settings[option.key as keyof typeof settings]}
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
