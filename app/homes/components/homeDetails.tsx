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
import { fallbackImage, getStorageImageUrl } from '@/app/utils/storage';
import {
  IconChevronDown,
  IconFileDescription,
  IconListCheck,
  IconPencil,
  IconPhoto,
  IconTrash,
} from '@tabler/icons-react';
import clsx from 'clsx/lite';
import React, { useEffect, useMemo, useState } from 'react';
import { useImageCache } from '@/app/hooks/useImageCache';

type HomeDetailsProps = {
  home: Home;
  onClose: () => void;
  isFromCalendar?: boolean;
};

// Section IDs for accordion management
type SectionId = 'photos' | 'description' | 'objectives';

// Collapsible section component - now controlled by parent for accordion behavior
function CollapsibleSection({
  id,
  title,
  icon,
  children,
  isOpen,
  onToggle,
}: {
  id: SectionId;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: (id: SectionId) => void;
}) {
  return (
    <div className="w-full border border-secondary rounded-lg overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className={clsx(
          'w-full flex items-center justify-between p-3 bg-secondary/10 hover:bg-secondary/20 transition-colors',
          isOpen ? 'cursor-default' : 'cursor-pointer',
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-light">{title}</span>
        </div>
        <IconChevronDown size={16} className={clsx('text-light transition-transform', isOpen && 'rotate-180')} />
      </button>
      <div className={clsx('p-3', !isOpen && 'hidden')}>{children}</div>
    </div>
  );
}

// Memoized image grid to prevent re-renders when parent state changes
const HomeImageGrid = React.memo(function HomeImageGrid({
  images,
  onImageClick,
  isOpen,
}: {
  images: string[];
  onImageClick: (index: number) => void;
  isOpen: boolean;
}) {
  // Preload and cache all images
  const imageUrls = useMemo(() => images.map(img => getStorageImageUrl(img)), [images]);
  const { getCachedUrl } = useImageCache(imageUrls);

  if (images.length === 0) return null;

  return (
    <div className={clsx('p-3', !isOpen && 'hidden')}>
      <div className="grid grid-cols-3 gap-2">
        {images.map((image, index) => {
          const originalUrl = getStorageImageUrl(image);
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
    </div>
  );
});

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

  // Accordion state - track which section is open (only one at a time)
  const [openSection, setOpenSection] = useState<SectionId>('photos');

  const handleToggleSection = (sectionId: SectionId) => {
    setOpenSection(prev => (prev === sectionId ? prev : sectionId));
  };

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
            <CollapsibleSection
              id="photos"
              title={`Photos (${home.images.length})`}
              icon={<IconPhoto size={16} className="text-light" />}
              isOpen={openSection === 'photos'}
              onToggle={handleToggleSection}
            >
              <HomeImageGrid
                images={home.images}
                onImageClick={setSelectedImageIndex}
                isOpen={openSection === 'photos'}
              />
            </CollapsibleSection>
          )}

          {(userType === 'conciergerie' || (userType === 'employee' && isFromCalendar)) && (
            <CollapsibleSection
              id="description"
              title="Description"
              icon={<IconFileDescription size={16} className="text-light" />}
              isOpen={openSection === 'description'}
              onToggle={handleToggleSection}
            >
              <p className="text-foreground whitespace-pre-wrap">{home.description}</p>
            </CollapsibleSection>
          )}

          <CollapsibleSection
            id="objectives"
            title="Points particuliers"
            icon={<IconListCheck size={16} className="text-light" />}
            isOpen={openSection === 'objectives'}
            onToggle={handleToggleSection}
          >
            <ul className="list-none pl-0 space-y-1">
              {home.objectives.map((objective, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-2.5 h-2.5 mt-1.5 mr-2 shrink-0 border border-foreground" />
                  <span className="text-foreground overflow-hidden">{objective}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
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
