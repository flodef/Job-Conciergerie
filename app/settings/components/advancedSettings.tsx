import { updateConciergerieWithUserId } from '@/app/actions/conciergerie';
import { updateEmployeeWithUserId } from '@/app/actions/employee';
import ConfirmationModal from '@/app/components/confirmationModal';
import Input from '@/app/components/input';
import Switch from '@/app/components/switch';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { Conciergerie, Employee } from '@/app/types/dataTypes';
import { labelClassName } from '@/app/utils/className';
import { formatId } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import { IconCheck, IconCopy, IconEdit, IconTrash, IconX } from '@tabler/icons-react';
import clsx from 'clsx/lite';
import React, { useEffect, useRef, useState } from 'react';

type Device = {
  id: string;
  label?: string;
};

const AdvancedSettings: React.FC = () => {
  const { disconnect, nuke, getUserData, userId: currentUserId, userType } = useAuth();

  const [storedLabels, setStoredLabels] = useLocalStorage<Device[]>('device_labels', []);
  const inputRef = useRef<HTMLInputElement>(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState<string>();
  const [editingId, setEditingId] = useState<string>();
  const [editLabel, setEditLabel] = useState('');
  const [toast, setToast] = useState<Toast>();

  const [deleteSettings, setDeleteSettings] = useState(false);

  useEffect(() => {
    const userData = getUserData();
    if (!userData) return;

    const ids: Device[] = [];

    userData.id.forEach((deviceId: string) => {
      ids.push({
        id: deviceId,
        label: storedLabels?.find(l => l.id === deviceId)?.label,
      });
    });

    setStoredLabels(ids);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteDevice = (id: string) => {
    setConfirmTargetId(id);
    setShowConfirmDialog(true);
  };

  const copyToClipboard = (id: string) => {
    navigator.clipboard
      .writeText(id)
      .then(() => {
        setToast({
          type: ToastType.Success,
          message: 'ID copié dans le presse-papier',
        });
      })
      .catch(err => {
        setToast({
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

    setToast({
      type: ToastType.Success,
      message: "Label de l'appareil mis à jour",
    });

    cancelEdit();
  };

  const cancelEdit = () => {
    setEditingId(undefined);
    setEditLabel('');
  };

  const handleAcceptDevice = (id: string) => {
    // Logic to accept device
    console.log('Accept device:', id);
  };

  const resetMyData = async () => {
    if (!confirmTargetId || !currentUserId) return;

    // If a specific device is selected, handle that device
    const userData = getUserData();
    if (!userData) return;

    // Remove the device ID based on user type
    const filteredIds = userData.id.filter(id => id !== confirmTargetId);
    const updateAction =
      userType === 'employee'
        ? () => updateEmployeeWithUserId(userData as Employee, filteredIds)
        : () => updateConciergerieWithUserId(userData as Conciergerie, filteredIds);

    // Update the user's ID in the database
    const updatedIds = await updateAction();
    if (updatedIds) {
      // Update the stored labels
      setStoredLabels(prevLabels => prevLabels?.filter(item => item.id !== confirmTargetId));

      // Show success message
      setToast({
        type: ToastType.Success,
        message: "L'appareil a été supprimé avec succès",
      });

      if (confirmTargetId === currentUserId) {
        // Reset all data for current device
        if (deleteSettings) nuke();
        else disconnect();
      }
    } else {
      setToast({
        type: ToastType.Error,
        message: "Impossible de supprimer l'appareil",
      });
    }
  };

  return (
    <div className="space-y-6">
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />

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
                  className={clsx(
                    'p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-green-600',
                    'disabled:text-gray-200 dark:disabled:text-gray-700 disabled:hover:bg-transparent disabled:cursor-not-allowed',
                  )}
                  title="Confirmer"
                  disabled={editLabel === item.label}
                >
                  <IconCheck size={24} stroke={2} />
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-red-600"
                  title="Annuler"
                >
                  <IconX size={24} stroke={2} />
                </button>
              </div>
            </div>
          ) : (
            <div key={item.id} className="py-4 h-[60px] flex items-center justify-between">
              <p className={labelClassName}>
                {item.id === currentUserId ? 'Cet appareil' : item.label || formatId(item.id)}
                {(item.id === currentUserId || item.id.startsWith('$')) && (
                  <span className="ml-2 text-xs bg-primary text-white px-1.5 py-0.5 rounded-full align-text-top">
                    {item.id === currentUserId ? 'Actuel' : 'Nouveau'}
                  </span>
                )}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(item.id)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Copier l'ID"
                >
                  <IconCopy size={24} stroke={1.5} />
                </button>
                {item.id !== currentUserId && (
                  <>
                    <button
                      onClick={() => handleEditDevice(item.id)}
                      className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      title="Modifier"
                    >
                      <IconEdit size={24} stroke={1.5} />
                    </button>
                    {!isValidatedId(item.id) && (
                      <button
                        onClick={() => handleAcceptDevice(item.id)}
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Valider"
                      >
                        <IconCheck size={24} stroke={1.5} className="text-green-600" />
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => handleDeleteDevice(item.id)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <IconTrash size={24} stroke={1.5} className="text-red-600" title="Supprimer" />
                </button>
              </div>
            </div>
          ),
        )}
        <p className="text-sm text-gray-500 mt-4">Supprimez un appareil pour révoquer son accès à votre compte.</p>
      </div>

      <ConfirmationModal
        isOpen={showConfirmDialog}
        onConfirm={resetMyData}
        onClose={() => {
          setShowConfirmDialog(false);
          setConfirmTargetId(undefined);
        }}
        title="Confirmation"
        message={
          confirmTargetId === currentUserId
            ? "Êtes-vous sûr de vouloir réinitialiser vos données ? Cette action supprimera votre accès à l'application."
            : 'Êtes-vous sûr de vouloir supprimer cet appareil ? Cette action révoquera son accès à ce compte.'
        }
        confirmText={confirmTargetId === currentUserId ? 'Réinitialiser' : 'Supprimer'}
        cancelText="Annuler"
        isDangerous
      >
        {confirmTargetId === currentUserId && (
          <div className="mt-4 flex items-center justify-center w-full">
            <label className="flex items-center cursor-pointer select-none w-full justify-center gap-2">
              <span className={clsx('text-light', deleteSettings ? 'font-bold' : '')}>
                Supprimer également mes paramètres
              </span>
              <Switch enabled={deleteSettings} onChange={() => setDeleteSettings(!deleteSettings)} />
            </label>
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
};

export default AdvancedSettings;
