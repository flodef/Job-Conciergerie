'use client';

import { useEffect, useState } from 'react';
import { useMenuContext } from '../contexts/menuProvider';
import { useHomes } from '../contexts/homesProvider';
import { HomeData } from '../types/mission';
import HomeCard from '../components/homeCard';
import HomeDetails from '../components/homeDetails';
import HomeForm from '../components/homeForm';
import FullScreenModal from '../components/fullScreenModal';
import { IconPlus } from '@tabler/icons-react';
import { clsx } from 'clsx/lite';

export default function HomesPage() {
  const { homes, isLoading, getCurrentConciergerie } = useHomes();
  const { setHasUnsavedChanges } = useMenuContext();
  const [selectedHome, setSelectedHome] = useState<HomeData | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Reset unsaved changes when navigating to this page
  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  // Get current conciergerie
  const currentConciergerie = getCurrentConciergerie();

  // Filter homes by the current conciergerie and not deleted
  const filteredHomes = homes
    .filter(home => !home.deleted && home.conciergerie.name === currentConciergerie?.name)
    .filter(home => {
      if (searchTerm.trim() === '') return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        home.title.toLowerCase().includes(searchLower) ||
        home.description.toLowerCase().includes(searchLower) ||
        home.tasks.some(task => task.toLowerCase().includes(searchLower))
      );
    });

  const handleHomeClick = (home: HomeData) => {
    setSelectedHome(home);
  };

  const handleCloseDetails = () => {
    setSelectedHome(null);
  };

  const handleAddHome = () => {
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background p-4">
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher un bien..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-3 border border-secondary rounded-lg bg-background"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground/50"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : filteredHomes.length === 0 && searchTerm === '' ? (
        <div
          className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] border-2 border-dashed border-secondary rounded-lg p-8 cursor-pointer"
          onClick={handleAddHome}
        >
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Aucun bien</h3>
            <p className="text-gray-500 mb-4">Ajoutez votre premier bien</p>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <IconPlus size={32} />
            </div>
          </div>
        </div>
      ) : filteredHomes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-foreground/60">Aucun bien ne correspond à votre recherche</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHomes.map(home => (
            <HomeCard key={home.id} home={home} onClick={() => handleHomeClick(home)} />
          ))}
        </div>
      )}

      <button
        onClick={handleAddHome}
        className={clsx(
          'fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-foreground flex items-center justify-center shadow-lg',
          'hover:bg-primary/90 transition-colors',
        )}
      >
        <IconPlus size={24} />
      </button>

      {isAddModalOpen && (
        <FullScreenModal onClose={handleCloseAddModal}>
          <HomeForm onClose={handleCloseAddModal} mode="add" />
        </FullScreenModal>
      )}

      {selectedHome && <HomeDetails home={selectedHome} onClose={handleCloseDetails} />}
    </div>
  );
}
