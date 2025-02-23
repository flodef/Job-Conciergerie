'use client';

import { MenuButton } from '@/app/components/menuButton';
import { pages, useMenuContext } from '@/app/contexts/menuProvider';
import clsx from 'clsx';
import { ReactNode, useEffect, useState } from 'react';

export default function NavigationLayout({ children }: { children: ReactNode }) {
  const { currentPage, isMenuOpen, setIsMenuOpen, onMenuChange } = useMenuContext();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Fixed header with menu button */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-white/50 backdrop-blur-sm shadow-lg' : 'bg-transparent'
        }`}
      >
        {/* Overlay with click handler */}
        <div
          className={clsx(
            'fixed inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity z-40',
            isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
          onClick={() => setIsMenuOpen(false)}
        />

        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          {/* Title with exit animation */}
          <h1
            className={clsx(
              'text-2xl font-semibold transition-all duration-300 text-foreground flex-1 text-center',
              isMenuOpen ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0',
            )}
          >
            {currentPage}
          </h1>

          {/* Animated content area */}
          <div className="max-w-7xl mx-auto">
            {/* Page list with entrance animation */}
            <div
              className={clsx(
                'fixed top-0 left-0 right-0 bg-background transition-all duration-300 overflow-hidden z-50',
                isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0',
              )}
              onClick={e => e.stopPropagation()} // Prevent click propagation to overlay
            >
              <nav>
                <ul className="space-y-2 py-4">
                  {pages.map(page => (
                    <li key={page}>
                      <button
                        onClick={() => onMenuChange(page)}
                        className={clsx(
                          'w-full px-4 py-2 text-left flex items-center',
                          'hover:bg-accent transition-colors',
                          page === currentPage
                            ? 'border-l-4 border-primary font-medium'
                            : 'border-l-4 border-transparent',
                        )}
                      >
                        {page}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>

          <div className="flex justify-end z-50">
            <MenuButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        className={clsx('transition-opacity duration-300 pt-16 h-screen', isMenuOpen ? 'opacity-50' : 'opacity-100')}
      >
        {children}
      </main>
    </div>
  );
}
