'use client';

import FloatingActionButton from '@/app/components/floatingActionButton';
import LoadingSpinner from '@/app/components/loadingSpinner';
import SearchInput from '@/app/components/searchInput';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import HomeCard from '@/app/homes/components/homeCard';
import HomeDetails from '@/app/homes/components/homeDetails';
import HomeForm from '@/app/homes/components/homeForm';
import { Home } from '@/app/types/dataTypes';
import { Page } from '@/app/utils/navigation';
import { IconPlus } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function HomesPage() {
  const { myHomes, isLoading: homesLoading, fetchHomes } = useHomes();
  const { currentPage, setHasUnsavedChanges } = useMenuContext();
  const { isLoading: authLoading } = useAuth();

  const [toastMessage, setToastMessage] = useState<Toast>();
  const [selectedHome, setSelectedHome] = useState<Home | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Reload employees when displaying the page
  const isFetching = useRef(false);
  useEffect(() => {
    // Skip if still loading
    if (authLoading || currentPage !== Page.Homes || isFetching.current) return;

    isFetching.current = true;

    fetchHomes().then(isSuccess => {
      if (!isSuccess)
        setToastMessage({
          type: ToastType.Error,
          message: 'Erreur lors du chargement des biens',
        });
    });
  }, [currentPage, authLoading, fetchHomes]);

  // Reset unsaved changes when navigating to this page - must be called before any conditional returns
  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  // Filter homes by the current conciergerie
  const filteredHomes = useMemo(
    () =>
      myHomes.filter(home => {
        if (searchTerm.trim() === '') return true;
        const searchLower = searchTerm.toLowerCase();
        return (
          home.title.toLowerCase().includes(searchLower) ||
          home.description.toLowerCase().includes(searchLower) ||
          home.objectives.some(objective => objective.toLowerCase().includes(searchLower))
        );
      }),
    [myHomes, searchTerm],
  );

  const handleHomeClick = (home: Home) => {
    setSelectedHome(home);
  };

  const handleHomeEdit = (home: Home) => {
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

  if (homesLoading || authLoading)
    return <LoadingSpinner text={authLoading ? 'Identification...' : 'Chargement des biens...'} />;

  return (
    <div>
      <ToastMessage toast={toastMessage} onClose={() => setToastMessage(undefined)} />

      {myHomes.length > 1 && (
        <SearchInput placeholder="Rechercher un bien..." value={searchTerm} onChange={setSearchTerm} />
      )}

      {filteredHomes.length === 0 && searchTerm === '' ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
