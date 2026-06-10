import { updateConciergerieWithUserId } from '@/app/actions/conciergerie';
import { updateEmployeeWithUserId } from '@/app/actions/employee';
import ConfirmationModal from '@/app/components/confirmationModal';
import Input from '@/app/components/input';
import Switch from '@/app/components/switch';
import { ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useModal } from '@/app/contexts/modalProvider';
import { useToast } from '@/app/contexts/toastProvider';
import { Conciergerie, Employee } from '@/app/types/dataTypes';
import { iconButtonClassName, labelClassName } from '@/app/utils/className';
import { containsId, formatId, isNewDevice } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import {
  IconCheck,
  IconCopy,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconEdit,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { cn } from '@/app/utils/className';
import React, { useEffect, useRef, useState } from 'react';

type Device = {
  id: string;
  label?: string;
};

const ConnectedDevicesSettings: React.FC = () => {
  const { disconnect, nuke, userData, userId: currentUserId, updateUserData, isEmployee, isConciergerie } = useAuth();

  const [storedLabels, setStoredLabels] = useLocalStorage<Device[]>('device_labels', []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(navigator.userAgent);
    const width = window.innerWidth;

    if (isMobile || width < 768) setDeviceType('mobile');
    else if (isTablet || (width >= 768 && width < 1024)) setDeviceType('tablet');
    else setDeviceType('desktop');
  }, []);

  const [confirmTargetId, setConfirmTargetId] = useState<string>();
  const [editingId, setEditingId] = useState<string>();
  const [editLabel, setEditLabel] = useState('');
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();

  const [deleteSettings, setDeleteSettings] = useState(false);

  useEffect(() => {
    if (!userData) return;

    const ids: Device[] = [];

    userData.id.forEach((deviceId: string) => {
      ids.push({
        id: deviceId,
        label: storedLabels?.find(l => l.id === deviceId)?.label,
      });
    });

    setStoredLabels(ids);
  }, [userData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteDevice = (id: string) => {
    setConfirmTargetId(id);
    const idModal = openModal(() => (
      <ConfirmationModal
        isOpen
        onConfirm={resetMyData}
        onClose={() => {
          closeModal(idModal);
          setConfirmTargetId(undefined);
        }}
        title="Confirmation"
        message={
          id === currentUserId
            ? "Êtes-vous sûr de vouloir réinitialiser vos données ? Cette action supprimera votre accès à l'application."
            : 'Êtes-vous sûr de vouloir supprimer cet appareil ? Cette action révoquera son accès à ce compte.'
        }
        confirmText={id === currentUserId ? 'Réinitialiser' : 'Supprimer'}
        cancelText="Annuler"
        isDangerous
      >
        {id === currentUserId && (
          <div className="mt-4 flex items-center justify-center w-full">
            <label className="flex items-center cursor-pointer select-none w-full justify-center gap-2">
              <span className={cn('text-light', deleteSettings ? 'font-bold' : '')}>
                Supprimer également mes paramètres
              </span>
              <Switch enabled={deleteSettings} onChange={() => setDeleteSettings(!deleteSettings)} />
            </label>
          </div>
        )}
      </ConfirmationModal>
    ));
  };

  const copyToClipboard = (id: string) => {
    navigator.clipboard
      .writeText(id)
      .then(() => {
        showToast({
          type: ToastType.Success,
          message: 'ID copié dans le presse-papier',
        });
      })
      .catch(err => {
        showToast({
          type: ToastType.Error,
          message: "Impossible de copier l'ID",
          error: err,
        });
      });
  };

  // Check if an ID has been validated (starts with alphanumeric character)
  const isValidatedId = (id: string) => {
    return /^[a-zA-Z0-9]/.test(id);
  };

  const handleEditDevice = (id: string) => {
    const deviceToEdit = storedLabels?.find(item => item.id === id);
    if (deviceToEdit) {
      setEditingId(id);
      setEditLabel(deviceToEdit.label || '');

      // Focus on the input with a slight delay to ensure the component is rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      });
    }
  };

  const saveDeviceLabel = () => {
    if (!editingId || !editLabel) return;

    setStoredLabels(prevIds => prevIds?.map(item => (item.id === editingId ? { ...item, label: editLabel } : item)));

    showToast({
      type: ToastType.Success,
      message: "Label de l'appareil mis à jour",
    });

    cancelEdit();
  };

  const cancelEdit = () => {
    setEditingId(undefined);
    setEditLabel('');
  };

  // Helper to update device IDs array and handle all side effects
  const updateDeviceIds = async (transform: (ids: string[]) => string[], action: string) => {
    if (!userData) return;

    const newIds = transform(userData.id);
    const updateAction = isEmployee
      ? () => updateEmployeeWithUserId(userData as Employee, newIds)
      : () => updateConciergerieWithUserId(userData as Conciergerie, newIds);
    const updatedIds = await updateAction();
    if (updatedIds) {
      // Create an updated Device[] based on the newIds
      const updatedLabels = updatedIds.map(updatedId => {
        // Find existing device label if available
        const existingDevice = storedLabels?.find(item => item.id === updatedId || item.id === `$${updatedId}`);
        return { id: updatedId, label: existingDevice?.label };
      });
      updateUserData({ ...userData, id: updatedIds });
      setStoredLabels(updatedLabels);
      showToast({ type: ToastType.Success, message: `L'appareil a été ${action} avec succès` });
      return updatedIds;
    } else {
      showToast({ type: ToastType.Error, message: `L'appareil n'a pas pu être ${action}` });
      return null;
    }
  };

  const handleAcceptDevice = async (id: string) => {
    // Accept device by removing the $ prefix from the id
    await updateDeviceIds(
      ids => ids.map(deviceId => (deviceId === id && isNewDevice(deviceId) ? deviceId.slice(1) : deviceId)),
      'accepté',
    );
  };

  const resetMyData = async () => {
    if (!confirmTargetId || !currentUserId) return;

    const updatedIds = await updateDeviceIds(ids => ids.filter(id => id !== confirmTargetId), 'supprimé');
    if (updatedIds && confirmTargetId === currentUserId) {
      if (deleteSettings) nuke();
      else disconnect();
    }
  };

  return (
    <div className="space-y-6">
      <div className="divide-y">
        {storedLabels?.map(item =>
          editingId === item.id ? (
            <div key={item.id} className="py-2 flex items-center justify-between">
              <Input
                id={`edit-device-${item.id}`}
                label=""
                value={editLabel}
                onChange={setEditLabel}
                className="pr-2 w-full"
                placeholder={formatId(item.id)}
                error=""
                onError={() => {}}
                disabled={false}
                ref={inputRef}
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={saveDeviceLabel}
                  className={iconButtonClassName('success')}
                  title="Confirmer"
                  disabled={editLabel === item.label}
                >
                  <IconCheck size={24} stroke={2} />
                </button>
                <button onClick={cancelEdit} className={iconButtonClassName('dangerous')} title="Annuler">
                  <IconX size={24} stroke={2} />
                </button>
              </div>
            </div>
          ) : (
            <div key={item.id} className="py-4 h-[60px] flex items-center justify-between">
              <div className="flex flex-col">
                <p className={labelClassName}>
                  {currentUserId && containsId([item.id], currentUserId) ? (
                    <>
                      <span className="font-bold">Cet appareil</span>
                      {deviceType === 'mobile' ? (
                        <IconDeviceMobile size={24} className="inline-block ml-2 text-foreground/50" />
                      ) : deviceType === 'tablet' ? (
                        <IconDeviceTablet size={24} className="inline-block ml-2 text-foreground/50" />
                      ) : (
                        <IconDeviceDesktop size={24} className="inline-block ml-2 text-foreground/50" />
                      )}
                    </>
                  ) : (
                    <span className="font-mono">{item.label || formatId(item.id)}</span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {isNewDevice(item.id) && (
                    <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded-full animate-pulse">
                      Nouveau
                    </span>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => copyToClipboard(item.id)} className={iconButtonClassName()} title="Copier l'ID">
                  <IconCopy size={24} stroke={1.5} />
                </button>
                {(!currentUserId || !containsId([item.id], currentUserId)) && (
                  <>
                    <button
                      onClick={() => handleEditDevice(item.id)}
                      className={iconButtonClassName()}
                      title="Modifier"
                    >
                      <IconEdit size={24} stroke={1.5} />
                    </button>
                    {!isValidatedId(item.id) && (
                      <button
                        onClick={() => handleAcceptDevice(item.id)}
                        className={cn(iconButtonClassName('success'), 'p-0')}
                        title="Valider"
                      >
                        <IconCheck size={30} stroke={2.5} />
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => handleDeleteDevice(item.id)}
                  className={iconButtonClassName('dangerous')}
                  title="Supprimer"
                >
                  <IconTrash size={24} stroke={1.5} />
                </button>
              </div>
            </div>
          ),
        )}
        <p className="text-sm text-gray-500 mt-4">Supprimez un appareil pour révoquer son accès à votre compte.</p>
      </div>
    </div>
  );
};

export default ConnectedDevicesSettings;
