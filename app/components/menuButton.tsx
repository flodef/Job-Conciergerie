import { useMenuContext } from '@/app/contexts/menuProvider';
import { clsx } from 'clsx/lite';

export const MenuButton = ({ className }: { className?: string }) => {
  const { isMenuOpen, setIsMenuOpen } = useMenuContext();
  const handleClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const genericHamburgerLine = `h-1 w-6 my-[3px] rounded-full bg-black dark:bg-foreground transition ease transform`;

  return (
    <button
      className={clsx(
        'flex flex-col h-12 w-12 border-0 border-black dark:border-foreground rounded justify-center items-center group ml-0',
        className,
      )}
      onClick={handleClick}
    >
      <div
        className={clsx(
          genericHamburgerLine,
          isMenuOpen
            ? 'rotate-45 translate-y-[10px] opacity-100 group-hover:opacity-100'
            : 'opacity-100 group-hover:opacity-100',
        )}
      />
      <div className={clsx(genericHamburgerLine, isMenuOpen ? 'opacity-0' : 'opacity-100 group-hover:opacity-100')} />
      <div
        className={clsx(
          genericHamburgerLine,
          isMenuOpen
            ? '-rotate-45 -translate-y-[10px] opacity-100 group-hover:opacity-100'
            : 'opacity-100 group-hover:opacity-100',
        )}
      />
    </button>
  );
};
