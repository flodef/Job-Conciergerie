'use client';

import { IconCancel, IconPencil, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useMissions } from '../contexts/missionsProvider';
import { Mission } from '../types/mission';
import ConfirmationModal from './confirmationModal';
import FullScreenModal from './fullScreenModal';
import MissionForm from './missionForm';

type MissionDetailsProps = {
  mission: Mission;
  onClose: () => void;
};

export default function MissionDetails({ mission, onClose }: MissionDetailsProps) {
  const { deleteMission, removeEmployee } = useMissions();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

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

  return (
    <FullScreenModal onClose={onClose}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditMode(true)}
              className="flex flex-col items-center p-2 w-20 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
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

        <h2 className="text-xl font-bold mb-4">Détails de la mission</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Bien</h3>
            <p className="text-foreground">{mission.home.title}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Objectifs</h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {mission.objectives.map(objective => (
                <span key={objective} className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-sm">
                  {objective}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Date</h3>
            <p className="text-foreground">{formatDate(mission.date)}</p>
          </div>

          {mission.employee && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Prestataire</h3>
              <p className="text-foreground">{mission.employee.name}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500">Dernière modification</h3>
            <p className="text-foreground">{formatDate(mission.modifiedDate)}</p>
          </div>
        </div>
      </div>

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
