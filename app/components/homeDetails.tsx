'use client';

import { IconPencil, IconTrash } from '@tabler/icons-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useHomes } from '../contexts/homesProvider';
import { useMissions } from '../contexts/missionsProvider';
import { HomeData } from '../types/types';
import { getWelcomeParams } from '../utils/welcomeParams';
import ConfirmationModal from './confirmationModal';
import FullScreenModal from './fullScreenModal';
import HomeForm from './homeForm';

type HomeDetailsProps = {
  home: HomeData;
  onClose: () => void;
};

export default function HomeDetails({ home, onClose }: HomeDetailsProps) {
  const { deleteHome, getCurrentConciergerie, homes: allHomes } = useHomes();
  const { missions, deleteMission } = useMissions();
  const { userType } = getWelcomeParams();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteWithMissionsModalOpen, setIsDeleteWithMissionsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [associatedMissions, setAssociatedMissions] = useState<string[]>([]);

  const isEmployee = userType === 'employee';

  useEffect(() => {
    // Check if the current conciergerie is the one that created the home
    const currentConciergerie = getCurrentConciergerie();
    if (currentConciergerie && home.conciergerieName === currentConciergerie.name) {
      setIsReadOnly(false);
    } else {
      setIsReadOnly(true);
    }
  }, [home, getCurrentConciergerie]);

  // Find missions associated with this home
  useEffect(() => {
    const missionTitles = missions
      .filter(mission => !mission.deleted && mission.homeId === home.id)
      .map(mission => {
        // Find the home by ID to get its title
        const homeData = allHomes.find(h => h.id === mission.homeId);
        return homeData?.title || 'Bien inconnu';
      });

    setAssociatedMissions(missionTitles);
  }, [missions, home.id, allHomes]);

  const handleDeleteClick = () => {
    if (associatedMissions.length > 0) {
      // If there are associated missions, show special confirmation
      setIsDeleteWithMissionsModalOpen(true);
    } else {
      // If no associated missions, show regular confirmation
      setIsDeleteModalOpen(true);
    }
  };

  const handleDelete = () => {
    deleteHome(home.id);
    setIsDeleteModalOpen(false);
    onClose();
  };

  const handleDeleteWithMissions = () => {
    // Delete all associated missions first
    missions
      .filter(mission => !mission.deleted && mission.homeId === home.id)
      .forEach(mission => {
        deleteMission(mission.id);
      });

    // Then delete the home
    deleteHome(home.id);
    setIsDeleteWithMissionsModalOpen(false);
    onClose();
  };

  if (isEditMode) {
    return (
      <FullScreenModal onClose={() => setIsEditMode(false)} title="Modification du bien">
        <HomeForm
          home={home}
          onClose={() => {
            setIsEditMode(false);
            onClose();
          }}
          mode="edit"
        />
      </FullScreenModal>
    );
  }

  return (
    <FullScreenModal onClose={onClose} title="Détails du bien">
      {selectedImageIndex !== null && home.images && (
        <FullScreenModal
          title={`Photo de ${home.title}`}
          imageUrl={home.images[selectedImageIndex]}
          onClose={() => setSelectedImageIndex(null)}
        />
      )}

      <div className="space-y-2" data-home-details>
        <div>
          <h3 className="text-sm font-medium text-light">Titre</h3>
          <p className="text-foreground font-bold">{home.title}</p>
        </div>

        {home.images && home.images.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-light mb-2">Photos</h3>
            <div className="grid grid-cols-3 gap-2">
              {home.images.map((image, index) => (
                <div key={index} className="relative aspect-square">
                  <Image
                    src={image}
                    alt={`Photo ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 33vw, 150px"
                    className="object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedImageIndex(index)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-light">Description</h3>
          <p className="text-foreground whitespace-pre-wrap">{home.description}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-light">Tâches</h3>
          <ul className="list-none pl-0 mt-2 space-y-1">
            {home.tasks.map((task, index) => (
              <li key={index} className="flex items-start">
                <span
                  className="inline-block w-2.5 h-2.5 mt-1.5 mr-2 flex-shrink-0 border border-foreground"
                  style={{ borderColor: 'var(--color-foreground)' }}
                />
                <span className="text-foreground">{task}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!isReadOnly && !isEmployee && (
        <div className="sticky bottom-0 bg-background border-t border-secondary py-2">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsEditMode(true)}
              className="flex flex-col items-center p-2 w-20 rounded-lg hover:opacity-80"
            >
              <IconPencil />
              Modifier
            </button>
            <button
              onClick={handleDeleteClick}
              className="flex flex-col items-center p-2 w-20 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              <IconTrash />
              Supprimer
            </button>
          </div>
        </div>
      )}

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
  );
}
