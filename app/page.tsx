'use client';

import { Page, useMenuContext } from '@/app/contexts/menuProvider';
import { generateUniqueId } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import { useEffect } from 'react';

export default function Home() {
  const { onMenuChange } = useMenuContext();
  const [id, setId] = useLocalStorage('user_id', '');

  useEffect(() => {
    if (id) return;
    generateUniqueId().then(id => {
      setId(id);
    });
  }, [id, setId]);

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center bg-background">
      <button
        className="px-8 py-4 text-2xl font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        onClick={() => onMenuChange(Page.Homes)}
      >
        Ajouter un bien
      </button>
    </div>
  );
}
