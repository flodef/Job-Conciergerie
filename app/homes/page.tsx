'use client';

import FloatingActionButton from '@/app/components/floatingActionButton';
import SearchInput from '@/app/components/searchInput';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { useModal } from '@/app/contexts/modalProvider';
import HomeCard from '@/app/homes/components/homeCard';
import HomeDetails from '@/app/homes/components/homeDetails';
import HomeForm from '@/app/homes/components/homeForm';
import type { Home } from '@/app/types/dataTypes';
import { cn, titleClassName } from '@/app/utils/className';
import { useLocalStorage } from '@/app/utils/localStorage';
import { IconLayout, IconLayoutGrid, IconList, IconPlus } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import M3LoadingSpinner from '../components/m3LoadingSpinner';

export default function HomesPage() {
  const { myHomes, isLoading: homesLoading } = useHomes();
  const { currentPage, setHasUnsavedChanges } = useMenuContext();
  const { isLoading: authLoading } = useAuth();
  const { openModal, closeModal } = useModal();

  const [searchTerm, setSearchTerm] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Track when initial load completes
  useEffect(() => {
    if (!authLoading && !homesLoading) setHasLoadedOnce(true);
  }, [authLoading, homesLoading]);

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
          home.title.toLowerCase().includes(searchLower) || home.geographicZone.toLowerCase().includes(searchLower)
        );
      }),
    [myHomes, searchTerm],
  );

  const handleHomeClick = (home: Home) => {
    const id = openModal(() => <HomeDetails home={home} onClose={() => closeModal(id)} />);
  };

  const handleHomeEdit = (home: Home) => {
    const id = openModal(() => <HomeForm home={home} onClose={() => closeModal(id)} mode="edit" />);
  };

  const handleAddHome = () => {
    const id = openModal(() => <HomeForm onClose={() => closeModal(id)} mode="add" />);
  };

  const [displayMode, setDisplayMode] = useLocalStorage<'list' | 'grid' | 'thumb'>('homes_display_mode', 'thumb');

  if (!hasLoadedOnce) return <M3LoadingSpinner />;

  return (
    <div className="bg-background min-h-full px-4">
      {myHomes.length > 0 && (
        <div className="flex items-center justify-between gap-2 mb-4">
          {myHomes.length > 1 && (
            <SearchInput placeholder="Rechercher un bien..." value={searchTerm} onChange={setSearchTerm} />
          )}
          <div className="flex gap-2">
            <button
              className={cn(
                'p-2 rounded cursor-pointer',
                displayMode === 'list' ? 'bg-primary text-white' : 'bg-secondary text-foreground',
              )}
              onClick={() => setDisplayMode('list')}
              title="Liste"
            >
              <IconList size={20} />
            </button>
            <button
              className={cn(
                'p-2 rounded cursor-pointer',
                displayMode === 'grid' ? 'bg-primary text-white' : 'bg-secondary text-foreground',
              )}
              onClick={() => setDisplayMode('grid')}
              title="Grille"
            >
              <IconLayoutGrid size={20} />
            </button>
            <button
              className={cn(
                'p-2 rounded cursor-pointer',
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
            <h3 className={titleClassName}>Aucun bien</h3>
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
              className={cn(
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
    </div>
  );
}
