'use client';

import { IconCancel, IconPencil, IconTrash, IconZoomScan } from '@tabler/icons-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useMissions } from '../contexts/missionsProvider';
import { Mission } from '../types/mission';
import ConfirmationModal from './confirmationModal';
import FullScreenImageModal from './fullScreenImageModal';
import FullScreenModal from './fullScreenModal';
import HomeDetails from './homeDetails';
import MissionForm from './missionForm';

type MissionDetailsProps = {
  mission: Mission;
  onClose: () => void;
};

export default function MissionDetails({ mission, onClose }: MissionDetailsProps) {
  const { deleteMission, removeEmployee, getCurrentConciergerie } = useMissions();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showHomeDetails, setShowHomeDetails] = useState(false);

  // Get the conciergerie color from the mission data
  const conciergerieColor = mission.conciergerie?.color || 'var(--color-primary)';

  useEffect(() => {
    // Check if the current conciergerie is the one that created the mission
    const currentConciergerie = getCurrentConciergerie();
    if (currentConciergerie && mission.conciergerie.name === currentConciergerie.name) {
      setIsReadOnly(false);
    } else {
      setIsReadOnly(true);
    }
  }, [mission, getCurrentConciergerie]);

  const handleDelete = () => {
    deleteMission(mission.id);
    setIsDeleteModalOpen(false);
    onClose();
  };

  const handleRemoveEmployee = () => {
    removeEmployee(mission.id);
    onClose();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (isEditMode) {
    return (
      <FullScreenModal onClose={() => setIsEditMode(false)}>
        <MissionForm
          mission={mission}
          onClose={() => {
            setIsEditMode(false);
            onClose();
          }}
          mode="edit"
        />
      </FullScreenModal>
    );
  }

  if (showHomeDetails) {
    return <HomeDetails home={mission.home} onClose={() => setShowHomeDetails(false)} />;
  }

  const firstHomeImage = mission.home.images?.length ? mission.home.images[0] : '';

  return (
    <FullScreenModal onClose={onClose}>
      {selectedImage && <FullScreenImageModal url={selectedImage} onClose={() => setSelectedImage(null)} />}

      <div className="p-6" data-mission-details>
        <h2 className="text-xl font-bold mb-4">Détails de la mission</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-light">Bien</h3>
              <p className="text-foreground">{mission.home.title}</p>
            </div>
            <button onClick={() => setShowHomeDetails(true)} title="Voir les détails du bien">
              <IconZoomScan size={40} />
            </button>
          </div>

          {mission.home.images?.length ? (
            <div>
              <h3 className="text-sm font-medium text-light mb-2">Photo du bien</h3>
              <div className="relative aspect-video w-full max-h-32 overflow-hidden rounded-lg">
                <Image
                  src={firstHomeImage}
                  alt={`Photo de ${mission.home.title}`}
                  fill
                  className="object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImage(firstHomeImage)}
                />
              </div>
            </div>
          ) : null}

          <div>
            <h3 className="text-sm font-medium text-light">Objectifs</h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {mission.objectives.map(objective => (
                <span
                  key={objective}
                  className="px-2 py-1 rounded-lg text-sm"
                  style={{
                    backgroundColor: `${conciergerieColor}`,
                  }}
                >
                  {objective}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-light">Date</h3>
            <p className="text-foreground">{formatDate(mission.date)}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-light">Conciergerie</h3>
            <p className="font-bold" style={{ color: conciergerieColor }}>
              {mission.conciergerie.name}
            </p>
          </div>

          {mission.employee && (
            <div>
              <h3 className="text-sm font-medium text-light">Prestataire</h3>
              <p style={{ color: conciergerieColor }}>{mission.employee.name}</p>
            </div>
          )}
        </div>
      </div>

      {!isReadOnly && (
        <div className="flex justify-end items-center px-4 pb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditMode(true)}
              className="flex flex-col items-center p-2 w-20 rounded-lg hover:opacity-80"
              data-edit-button
            >
              <IconPencil />
              Modifier
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex flex-col items-center p-2 w-20 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              <IconTrash />
              Supprimer
            </button>
            {mission.employee && (
              <button
                onClick={handleRemoveEmployee}
                className="flex flex-col items-center p-2 w-20 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
              >
                <IconCancel />
                Annuler
              </button>
            )}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        title="Supprimer la mission"
        message="Êtes-vous sûr de vouloir supprimer cette mission ?"
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </FullScreenModal>
  );
}
