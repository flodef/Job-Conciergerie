'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import { FullScreenImageCarousel } from '@/app/components/fullScreenImageCarousel';
import FullScreenModal from '@/app/components/fullScreenModal';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import HomeForm from '@/app/homes/components/homeForm';
import { Home } from '@/app/types/dataTypes';
import { actionButtonBarClassName, actionButtonClassName } from '@/app/utils/className';
import { fallbackImage, getIPFSImageUrl } from '@/app/utils/ipfs';
import { IconFileDescription, IconListCheck, IconPencil, IconTrash } from '@tabler/icons-react';
import clsx from 'clsx/lite';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type HomeDetailsProps = {
  home: Home;
  onClose: () => void;
  isFromCalendar?: boolean;
};

export default function HomeDetails({ home, onClose, isFromCalendar = false }: HomeDetailsProps) {
  const { deleteHome, homes: allHomes } = useHomes();
  const { missions } = useMissions();
  const { userType, conciergerieName } = useAuth();

  const [toast, setToast] = useState<Toast>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteWithMissionsModalOpen, setIsDeleteWithMissionsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>();
  const [associatedMissions, setAssociatedMissions] = useState<string[]>([]);

  const isEmployee = userType === 'employee';

  useEffect(() => {
    setIsReadOnly(home.conciergerieName !== conciergerieName);
  }, [home, conciergerieName]);

  // Find missions associated with this home
  useEffect(() => {
    const missionTitles = missions
      .filter(mission => mission.homeId === home.id)
      .map(mission => {
        // Find the home by ID to get its title
        const homeData = allHomes.find(h => h.id === mission.homeId);
        return homeData?.title || 'Bien inconnu';
      });

    setAssociatedMissions(missionTitles);
  }, [missions, home.id, allHomes]);

  const handleDeleteClick = () => {
    // If there are associated missions, show special confirmation otherwise show regular confirmation
    if (associatedMissions.length > 0) setIsDeleteWithMissionsModalOpen(true);
    else setIsDeleteModalOpen(true);
  };

  const handleDelete = () => {
    setIsSubmitting(true);
    setIsDeleteModalOpen(false);
    deleteHome(home.id).then(isSuccess => {
      setToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess ? 'Bien supprimé !' : 'Erreur lors de la suppression du bien',
      });
      if (!isSuccess) setIsSubmitting(false);
    });
  };

  const handleDeleteWithMissions = () => {
    setIsDeleteWithMissionsModalOpen(false);
    handleDelete();
  };

  const footer = !isReadOnly && !isEmployee && (
    <div className={actionButtonBarClassName}>
      <button onClick={() => setIsEditMode(true)} className={actionButtonClassName}>
        <IconPencil />
        Modifier
      </button>
      <button onClick={handleDeleteClick} className={clsx(actionButtonClassName, 'bg-red-100 text-red-700')}>
        <IconTrash />
        Supprimer
      </button>
    </div>
  );

  if (isEditMode) return <HomeForm home={home} onClose={() => setIsEditMode(false)} onCancel={onClose} mode="edit" />;

  return (
    <>
      <ToastMessage
        toast={toast}
        onClose={() => {
          setToast(undefined);
          if (toast?.type === ToastType.Success) onClose();
        }}
      />

      <FullScreenModal
        title={`${home.title} (${home.geographicZone})`}
        onClose={onClose}
        footer={footer}
        disabled={isSubmitting}
      >
        {selectedImageIndex !== undefined && (
          <FullScreenImageCarousel
            altPrefix={`Photo de ${home.title}`}
            imageUrls={home.images}
            initialIndex={selectedImageIndex}
            onClose={() => setSelectedImageIndex(undefined)}
          />
        )}

        <div className="space-y-2" data-home-details>
          {home.images.length > 0 && (
            <div>
              <div className="grid grid-cols-3 gap-2">
                {[...new Set(home.images)].map((cidWithId, index) => (
                  <div key={index} className="relative aspect-square">
                    <Image
                      src={getIPFSImageUrl(cidWithId)}
                      alt={`Photo ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 33vw, 150px"
                      className="object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImageIndex(index)}
                      onError={e => {
                        // Fallback to mockup
                        (e.target as HTMLImageElement).src = fallbackImage;
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {(userType === 'conciergerie' || (userType === 'employee' && isFromCalendar)) && (
            <div>
              <h3 className="text-sm font-medium text-light flex items-center gap-1">
                <IconFileDescription size={16} />
                Description
              </h3>
              <p className="text-foreground whitespace-pre-wrap truncate">{home.description}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-light flex items-center gap-1">
              <IconListCheck size={16} />
              Points particuliers
            </h3>
            <ul className="list-none pl-0 mt-1 space-y-1">
              {home.objectives.map((objective, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-2.5 h-2.5 mt-1.5 mr-2 flex-shrink-0 border border-foreground" />
                  <span className="text-foreground overflow-hidden">{objective}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Regular confirmation modal for deletion */}
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteModalOpen(false)}
          title="Supprimer le bien"
          message="Êtes-vous sûr de vouloir supprimer ce bien ?"
          confirmText="Supprimer"
          cancelText="Annuler"
        />

        {/* Special confirmation modal for deletion with associated missions */}
        <ConfirmationModal
          isOpen={isDeleteWithMissionsModalOpen}
          onConfirm={handleDeleteWithMissions}
          onCancel={() => setIsDeleteWithMissionsModalOpen(false)}
          title="Supprimer le bien et ses missions"
          message={`Ce bien est associé à ${associatedMissions.length} mission${
            associatedMissions.length > 1 ? 's' : ''
          }. En supprimant ce bien, toutes les missions associées seront également supprimées. Êtes-vous sûr de vouloir continuer ?`}
          confirmText="Supprimer tout"
          cancelText="Annuler"
        />
      </FullScreenModal>
    </>
  );
}
