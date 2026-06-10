'use client';

import Accordion from '@/app/components/accordion';
import ConfirmationModal from '@/app/components/confirmationModal';
import { FullScreenImageCarousel } from '@/app/components/fullScreenImageCarousel';
import FullScreenModal from '@/app/components/fullScreenModal';
import HomeTitle from '@/app/components/homeTitle';
import { ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { useModal } from '@/app/contexts/modalProvider';
import { useToast } from '@/app/contexts/toastProvider';
import HomeForm from '@/app/homes/components/homeForm';
import { useImageCache } from '@/app/hooks/useImageCache';
import type { Home } from '@/app/types/dataTypes';
import { actionButtonBarClassName, actionButtonClassName, cn } from '@/app/utils/className';
import { fallbackImage, getStorageImageUrl } from '@/app/utils/storage';
import { IconFileDescription, IconListCheck, IconPencil, IconPhoto, IconTrash } from '@tabler/icons-react';
import React, { useEffect, useMemo, useState } from 'react';

type HomeDetailsProps = {
  home: Home;
  onClose: () => void;
  isFromCalendar?: boolean;
};

// Memoized image grid to prevent re-renders when parent state changes
const HomeImageGrid = React.memo(function HomeImageGrid({
  images,
  onImageClick,
}: {
  images: string[];
  onImageClick: (index: number) => void;
}) {
  // Preload and cache all images - use optimized thumbnails to reduce Supabase cached egress
  const imageUrls = useMemo(() => images.map(img => getStorageImageUrl(img, { width: 400, quality: 80 })), [images]);
  const { getCachedUrl } = useImageCache(imageUrls);

  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {images.map((image, index) => {
        const originalUrl = getStorageImageUrl(image, { width: 400, quality: 80 });
        const cachedUrl = getCachedUrl(originalUrl);
        return (
          <picture key={image} className="relative aspect-square overflow-hidden rounded-lg cursor-pointer">
            <img
              src={cachedUrl}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover"
              loading="eager"
              onClick={() => onImageClick(index)}
              onError={e => {
                e.currentTarget.src = fallbackImage;
              }}
            />
          </picture>
        );
      })}
    </div>
  );
});

export default function HomeDetails({ home, onClose, isFromCalendar = false }: HomeDetailsProps) {
  const { deleteHome, homes: allHomes } = useHomes();
  const { missions } = useMissions();
  const { conciergerieName, isEmployee, isConciergerie } = useAuth();
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>();
  const [associatedMissions, setAssociatedMissions] = useState<string[]>([]);
  const [skipAnimation, setSkipAnimation] = useState(false);

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

  const handleDelete = () => {
    setIsSubmitting(true);
    deleteHome(home.id).then(isSuccess => {
      showToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess ? 'Bien supprimé !' : 'Erreur lors de la suppression du bien',
      });
      if (isSuccess) onClose();
      else setIsSubmitting(false);
    });
  };

  const handleDeleteClick = () => {
    const message =
      associatedMissions.length > 0
        ? `Ce bien est associé à ${associatedMissions.length} mission${
            associatedMissions.length > 1 ? 's' : ''
          }. En supprimant ce bien, toutes les missions associées seront également supprimées. Êtes-vous sûr de vouloir continuer ?`
        : 'Êtes-vous sûr de vouloir supprimer ce bien ?';
    const id = openModal(() => (
      <ConfirmationModal
        isOpen
        title={associatedMissions.length > 0 ? 'Supprimer le bien et ses missions' : 'Supprimer le bien'}
        message={message}
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={handleDelete}
        onClose={() => closeModal(id)}
      />
    ));
  };

  const footer = !isReadOnly && !isEmployee && (
    <div className={actionButtonBarClassName}>
      <button onClick={() => setIsEditMode(true)} className={actionButtonClassName}>
        <IconPencil />
        Modifier
      </button>
      <button onClick={handleDeleteClick} className={cn(actionButtonClassName, 'bg-red-100 text-red-700')}>
        <IconTrash />
        Supprimer
      </button>
    </div>
  );

  if (isEditMode)
    return (
      <HomeForm
        home={home}
        onClose={() => {
          setSkipAnimation(true);
          setIsEditMode(false);
        }}
        onCancel={() => {
          setSkipAnimation(true);
          setIsEditMode(false);
        }}
        mode="edit"
        autoFocus
        skipAnimation
      />
    );

  return (
    <FullScreenModal
      title={<HomeTitle home={home} />}
      onClose={onClose}
      footer={footer}
      disabled={isSubmitting}
      closeAll
      skipAnimation={skipAnimation}
    >
      {selectedImageIndex !== undefined && (
        <FullScreenImageCarousel
          altPrefix={`Photo de ${home.title}`}
          imageUrls={home.images}
          initialIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(undefined)}
        />
      )}

      <div data-home-details>
        <Accordion
          variant="card"
          items={[
            ...(home.images.length > 0
              ? [
                  {
                    title: `Photos (${home.images.length})`,
                    icon: <IconPhoto size={16} className="text-light" />,
                    content: <HomeImageGrid images={home.images} onImageClick={setSelectedImageIndex} />,
                  },
                ]
              : []),
            ...(isConciergerie || (isEmployee && isFromCalendar)
              ? [
                  {
                    title: 'Description',
                    icon: <IconFileDescription size={16} className="text-light" />,
                    content: <p className="text-foreground whitespace-pre-wrap">{home.description}</p>,
                  },
                ]
              : []),
            {
              title: 'Points particuliers',
              icon: <IconListCheck size={16} className="text-light" />,
              content: (
                <ul className="list-none pl-0 space-y-1">
                  {home.objectives.map((objective, index) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-block w-2.5 h-2.5 mt-1.5 mr-2 shrink-0 border border-foreground" />
                      <span className="text-foreground overflow-hidden">{objective}</span>
                    </li>
                  ))}
                </ul>
              ),
            },
          ]}
        />
      </div>
    </FullScreenModal>
  );
}
