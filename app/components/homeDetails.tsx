'use client';

import { IconPencil, IconTrash } from '@tabler/icons-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useHomes } from '../contexts/homesProvider';
import { HomeData } from '../types/mission';
import ConfirmationModal from './confirmationModal';
import FullScreenImageModal from './fullScreenImageModal';
import FullScreenModal from './fullScreenModal';
import HomeForm from './homeForm';

type HomeDetailsProps = {
  home: HomeData;
  onClose: () => void;
};

export default function HomeDetails({ home, onClose }: HomeDetailsProps) {
  const { deleteHome, getCurrentConciergerie } = useHomes();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Get the conciergerie color from the home data
  const conciergerieColor = home.conciergerie?.color || 'var(--color-primary)';

  useEffect(() => {
    // Check if the current conciergerie is the one that created the home
    const currentConciergerie = getCurrentConciergerie();
    if (currentConciergerie && home.conciergerie.name === currentConciergerie.name) {
      setIsReadOnly(false);
    } else {
      setIsReadOnly(true);
    }
  }, [home, getCurrentConciergerie]);

  const handleDelete = () => {
    deleteHome(home.id);
    setIsDeleteModalOpen(false);
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
    <FullScreenModal onClose={onClose}>
      {selectedImageIndex !== null && home.images && (
        <FullScreenImageModal
          url={home.images[selectedImageIndex]}
          onClose={() => setSelectedImageIndex(null)}
        />
      )}

      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Détails du bien</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Titre</h3>
            <p className="text-foreground font-bold">{home.title}</p>
          </div>

          {home.images && home.images.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Photos</h3>
              <div className="grid grid-cols-3 gap-2">
                {home.images.map((image, index) => (
                  <div key={index} className="relative aspect-square">
                    <Image
                      src={image}
                      alt={`Photo ${index + 1}`}
                      fill
                      className="object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImageIndex(index)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="text-foreground whitespace-pre-wrap">{home.description}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Tâches</h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {home.tasks.map((task, index) => (
                <span
                  key={index}
                  className="px-2 py-1 rounded-lg text-sm"
                  style={{
                    backgroundColor: conciergerieColor,
                  }}
                >
                  {task}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Conciergerie</h3>
            <p className="font-bold" style={{ color: conciergerieColor }}>
              {home.conciergerie.name}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Dernière modification</h3>
            <p className="text-foreground">{formatDate(home.modifiedDate)}</p>
          </div>
        </div>
      </div>

      {!isReadOnly && (
        <div className="flex justify-end items-center px-4 pb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditMode(true)}
              className="flex flex-col items-center p-2 w-20 rounded-lg hover:opacity-80"
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
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        title="Supprimer le bien"
        message="Êtes-vous sûr de vouloir supprimer ce bien ?"
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </FullScreenModal>
  );
}
