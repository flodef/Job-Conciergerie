'use client';

import { IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import FloatingActionButton from '../components/floatingActionButton';
import HomeCard from '../components/homeCard';
import HomeDetails from '../components/homeDetails';
import HomeForm from '../components/homeForm';
import LoadingSpinner from '../components/loadingSpinner';
import SearchInput from '../components/searchInput';
import { useHomes } from '../contexts/homesProvider';
import { useMenuContext } from '../contexts/menuProvider';
import { HomeData } from '../types/types';
import { useRedirectIfNotRegistered } from '../utils/redirectIfNotRegistered';

export default function HomesPage() {
  const { homes, isLoading, getCurrentConciergerie } = useHomes();
  const { setHasUnsavedChanges } = useMenuContext();
  const [selectedHome, setSelectedHome] = useState<HomeData | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Redirect if not registered
  useRedirectIfNotRegistered();

  // Reset unsaved changes when navigating to this page
  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  // Get current conciergerie
  const currentConciergerie = getCurrentConciergerie();

  // Filter homes by the current conciergerie
  const filteredHomes = homes
    .filter(home => home.conciergerieName === currentConciergerie?.name)
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

  const handleHomeEdit = (home: HomeData) => {
    setSelectedHome(home);
    setIsEditModalOpen(true);
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

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedHome(null);
  };

  return (
    <div>
      {homes.length > 1 && (
        <SearchInput
          placeholder="Rechercher un bien..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onClear={() => setSearchTerm('')}
        />
      )}

      {isLoading ? (
        <div className="min-h-[calc(100dvh-9rem)] flex items-center justify-center bg-background">
          <LoadingSpinner size="large" text="Chargement des biens..." />
        </div>
      ) : filteredHomes.length === 0 && searchTerm === '' ? (
        <div
          className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] border-2 border-dashed border-secondary rounded-lg p-8 cursor-pointer"
          onClick={handleAddHome}
        >
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Aucun bien</h3>
            <p className="text-light mb-4">Ajoutez votre premier bien</p>
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
            <HomeCard
              key={home.id}
              home={home}
              onClick={() => handleHomeClick(home)}
              onEdit={() => handleHomeEdit(home)}
            />
          ))}
        </div>
      )}

      {/* Only show the floating action button if there are homes and we're not in search mode with no results */}
      {filteredHomes.length > 0 && <FloatingActionButton onClick={handleAddHome} />}

      {isAddModalOpen && <HomeForm onClose={handleCloseAddModal} mode="add" />}

      {selectedHome &&
        (!isEditModalOpen ? (
          <HomeDetails home={selectedHome} onClose={handleCloseDetails} />
        ) : (
          <HomeForm home={selectedHome} onClose={handleCloseEditModal} mode="edit" />
        ))}
    </div>
  );
}
