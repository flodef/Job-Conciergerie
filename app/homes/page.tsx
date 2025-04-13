'use client';

import FloatingActionButton from '@/app/components/floatingActionButton';
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
import { IconPlus, IconList, IconLayoutGrid, IconLayout } from '@tabler/icons-react';
import clsx from 'clsx/lite';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function HomesPage() {
  const { myHomes, fetchHomes } = useHomes();
  const { currentPage, setHasUnsavedChanges } = useMenuContext();
  const { isLoading: authLoading } = useAuth();

  const [toast, setToast] = useState<Toast>();
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

    fetchHomes()
      .then(isSuccess => {
        if (!isSuccess)
          setToast({
            type: ToastType.Error,
            message: 'Erreur lors du chargement des biens',
          });
      })
      .finally(() => (isFetching.current = false));
  }, [currentPage, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const [displayMode, setDisplayMode] = useState<'list' | 'grid' | 'thumb'>('thumb');

  return (
    <div>
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />

      <div className="flex items-start justify-between gap-2">
        {myHomes.length > 1 && (
          <SearchInput placeholder="Rechercher un bien..." value={searchTerm} onChange={setSearchTerm} />
        )}
        <button
          className={clsx(
            'mt-1 p-2 rounded',
            displayMode === 'list' ? 'bg-primary text-white' : 'bg-secondary text-foreground',
          )}
          onClick={() => setDisplayMode('list')}
          title="Liste"
        >
          <IconList size={20} />
        </button>
        <button
          className={clsx(
            'mt-1 p-2 rounded',
            displayMode === 'grid' ? 'bg-primary text-white' : 'bg-secondary text-foreground',
          )}
          onClick={() => setDisplayMode('grid')}
          title="Grille"
        >
          <IconLayoutGrid size={20} />
        </button>
        <button
          className={clsx(
            'mt-1 p-2 rounded',
            displayMode === 'thumb' ? 'bg-primary text-white' : 'bg-secondary text-foreground',
          )}
          onClick={() => setDisplayMode('thumb')}
          title="Miniatures"
        >
          <IconLayout size={20} />
        </button>
      </div>

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
                displayMode === 'thumb' && 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-4',
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
