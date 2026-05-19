'use client';

import FloatingActionButton from '@/app/components/floatingActionButton';
import SearchInput from '@/app/components/searchInput';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { useFetchTime } from '@/app/hooks/useFetchTime';
import HomeCard from '@/app/homes/components/homeCard';
import HomeDetails from '@/app/homes/components/homeDetails';
import HomeForm from '@/app/homes/components/homeForm';
import { Home } from '@/app/types/dataTypes';
import { Page } from '@/app/utils/navigation';
import { IconPlus, IconList, IconLayoutGrid, IconLayout } from '@tabler/icons-react';
import clsx from 'clsx/lite';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function HomesPage() {
  const { myHomes, isLoading: homesLoading, fetchHomes } = useHomes();
  const { currentPage, setHasUnsavedChanges } = useMenuContext();
  const { isLoading: authLoading } = useAuth();
  const { updateFetchTime, needsRefresh } = useFetchTime();
  const needsRefreshHomes = needsRefresh[Page.Homes];

  const [toast, setToast] = useState<Toast>();
  const [selectedHome, setSelectedHome] = useState<Home | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Reset unsaved changes when navigating to this page
  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges, currentPage]);

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

  const [displayMode, setDisplayMode] = useState<'list' | 'grid' | 'thumb'>('thumb');

  return (
    <div className="bg-background min-h-full px-4">
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />

      {/* Show loading indicator while data is loading */}
      {homesLoading && myHomes.length === 0 && (
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Show empty state when no homes and not loading */}
      {!homesLoading && myHomes.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] gap-4">
          <p className="text-light">Aucun bien disponible</p>
          <p className="text-sm text-light">Ajoutez votre premier bien</p>
        </div>
      )}

      {myHomes.length > 0 && (
        <div className="flex items-start justify-end gap-2 mb-2">
          {myHomes.length > 1 && (
            <SearchInput placeholder="Rechercher un bien..." value={searchTerm} onChange={setSearchTerm} />
          )}
          <div className="flex gap-2">
            <button
              className={clsx(
                'mt-1 p-2 rounded cursor-pointer',
                displayMode === 'list' ? 'bg-primary text-white' : 'bg-secondary text-foreground',
              )}
              onClick={() => setDisplayMode('list')}
              title="Liste"
            >
              <IconList size={20} />
            </button>
            <button
              className={clsx(
                'mt-1 p-2 rounded cursor-pointer',
                displayMode === 'grid' ? 'bg-primary text-white' : 'bg-secondary text-foreground',
              )}
              onClick={() => setDisplayMode('grid')}
              title="Grille"
            >
              <IconLayoutGrid size={20} />
            </button>
            <button
              className={clsx(
                'mt-1 p-2 rounded cursor-pointer',
                displayMode === 'thumb' ? 'bg-primary text-white' : 'bg-secondary text-foreground',
              )}
              onClick={() => setDisplayMode('thumb')}
              title="Miniatures"
            >
              <IconLayout size={20} />
            </button>
          </div>
        </div>
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
      ) : (
        <>
          {filteredHomes.length === 0 ? (
            <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
              <p className="text-light">Aucun résultat trouvé</p>
            </div>
          ) : (
            <div
              className={clsx(
                displayMode === 'list' && 'flex flex-col gap-2',
                displayMode === 'grid' && 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4',
                displayMode === 'thumb' && 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
              )}
            >
              {filteredHomes.map(home => (
                <HomeCard
                  key={home.id}
                  home={home}
                  onClick={() => handleHomeClick(home)}
                  onEdit={() => handleHomeEdit(home)}
                  displayMode={displayMode}
                />
              ))}
            </div>
          )}

          <FloatingActionButton onClick={handleAddHome} />
        </>
      )}

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
