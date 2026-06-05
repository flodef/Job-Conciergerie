'use client';

import { cn, descriptionClassName, titleClassName } from '@/app/utils/className';
import { IconChevronDown } from '@tabler/icons-react';
import React from 'react';

type AccordionVariant = 'default' | 'card';

interface AccordionItemProps {
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  variant: AccordionVariant;
  isMobile: boolean;
}

interface AccordionProps {
  items: {
    title: string;
    subtitle?: React.ReactNode;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    content: React.ReactNode;
  }[];
  variant?: AccordionVariant;
  defaultOpenIndex?: number;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  subtitle,
  icon,
  action,
  isOpen,
  onToggle,
  children,
  variant,
  isMobile,
}) => {
  const isCard = variant === 'card';

  if (isCard) {
    return (
      <div className="w-full border border-secondary rounded-lg overflow-hidden">
        <div className="flex items-center">
          <button
            onClick={onToggle}
            className="flex-1 flex items-center justify-between p-3 bg-secondary/10 hover:bg-secondary/20 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {icon && icon}
              <span className={descriptionClassName}>{title}</span>
            </div>
            <div className="flex items-center gap-2">
              {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
              <IconChevronDown
                size={16}
                className={cn('text-light transition-transform duration-300', isOpen && 'rotate-180')}
              />
            </div>
          </button>
          {action && <div className="pr-3 bg-secondary/10">{action}</div>}
        </div>
        <div
          className={cn(
            'overflow-visible',
            isMobile ? 'transition-all duration-300 ease-in-out' : '',
            isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden',
          )}
        >
          <div className="px-3 pb-3">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-secondary">
      <div className="flex items-center">
        <button
          className="flex-1 flex justify-between items-center py-4 px-6 text-left cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center gap-2">
            {icon && icon}
            <span className={titleClassName}>{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
            <IconChevronDown className={cn('transition-transform', isOpen ? 'rotate-180' : '')} size={24} />
          </div>
        </button>
        {action && <div className="pr-6">{action}</div>}
      </div>
      <div
        className={cn(
          'overflow-hidden',
          isMobile ? 'transition-all duration-300 ease-in-out' : '',
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="p-4 pt-0">{children}</div>
      </div>
    </div>
  );
};

export default function Accordion({ items, variant = 'default', defaultOpenIndex = 0 }: AccordionProps) {
  const [openIndex, setOpenIndex] = React.useState<number>(defaultOpenIndex);
  const [isMobile, setIsMobile] = React.useState(true);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToggle = (index: number) => {
    setOpenIndex(current => (current === index ? -1 : index));
  };

  const isCard = variant === 'card';

  return (
    <div className={cn('bg-background', isCard ? 'space-y-2' : '')}>
      {items.map((item, index) => (
        <AccordionItem
          key={index}
          title={item.title}
          subtitle={item.subtitle}
          icon={item.icon}
          action={item.action}
          isOpen={openIndex === index}
          onToggle={() => handleToggle(index)}
          variant={variant}
          isMobile={isMobile}
        >
          {item.content}
        </AccordionItem>
      ))}
    </div>
  );
}
