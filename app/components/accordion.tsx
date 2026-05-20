'use client';

import { IconChevronDown } from '@tabler/icons-react';
import { clsx } from 'clsx/lite';
import React from 'react';

type AccordionVariant = 'default' | 'card';

interface AccordionItemProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  variant: AccordionVariant;
}

interface AccordionProps {
  items: {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    content: React.ReactNode;
  }[];
  variant?: AccordionVariant;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  subtitle,
  icon,
  isOpen,
  onToggle,
  children,
  variant,
}) => {
  const isCard = variant === 'card';

  if (isCard) {
    return (
      <div className="w-full border border-secondary rounded-lg overflow-hidden">
        <button
          onClick={onToggle}
          className={clsx(
            'w-full flex items-center justify-between p-3 bg-secondary/10 hover:bg-secondary/20 transition-colors',
            isOpen ? 'cursor-default' : 'cursor-pointer',
          )}
        >
          <div className="flex items-center gap-2">
            {icon && icon}
            <span className="text-sm font-medium text-light">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
            <IconChevronDown
              size={16}
              className={clsx('text-light transition-transform duration-300', isOpen && 'rotate-180')}
            />
          </div>
        </button>
        <div
          className={clsx(
            'overflow-hidden transition-all duration-300 ease-in-out',
            isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className="px-3 pb-3">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-secondary">
      <button
        className={clsx(
          'w-full flex justify-between items-center py-4 px-6 text-left',
          isOpen ? 'cursor-default' : 'cursor-pointer',
        )}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {icon && icon}
          <span className="text-lg font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
          <IconChevronDown className={clsx('transition-transform', isOpen ? 'rotate-180' : '')} size={24} />
        </div>
      </button>
      <div
        className={clsx(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="p-4 pt-0">{children}</div>
      </div>
    </div>
  );
};

export default function Accordion({ items, variant = 'default' }: AccordionProps) {
  const [openIndex, setOpenIndex] = React.useState<number>(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const transitionTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleToggle = (index: number) => {
    setOpenIndex(current => {
      if (current === index) return current;

      // Find nearest scrollable ancestor and suppress its scrollbar during transition
      let el = containerRef.current?.parentElement;
      while (el) {
        const overflow = getComputedStyle(el).overflowY;
        if (overflow === 'auto' || overflow === 'scroll') {
          el.style.overflowY = 'hidden';
          clearTimeout(transitionTimerRef.current);
          transitionTimerRef.current = setTimeout(() => {
            (el as HTMLElement).style.overflowY = '';
          }, 300);
          break;
        }
        el = el.parentElement;
      }

      return index;
    });
  };

  const isCard = variant === 'card';

  return (
    <div ref={containerRef} className={clsx('bg-background', isCard ? 'space-y-2' : '')}>
      {items.map((item, index) => (
        <AccordionItem
          key={index}
          title={item.title}
          subtitle={item.subtitle}
          icon={item.icon}
          isOpen={openIndex === index}
          onToggle={() => handleToggle(index)}
          variant={variant}
        >
          {item.content}
        </AccordionItem>
      ))}
    </div>
  );
}
