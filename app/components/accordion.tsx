'use client';

import { IconChevronDown } from '@tabler/icons-react';
import { clsx } from 'clsx/lite';
import React from 'react';

interface AccordionItemProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

interface AccordionProps {
  items: {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    content: React.ReactNode;
  }[];
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, subtitle, icon, isOpen, onToggle, children }) => {
  return (
    <div className="border-b border-secondary">
      <button className="w-full flex justify-between items-center py-4 px-6 text-left" onClick={onToggle}>
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

export default function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = React.useState<number>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <div className="border-t border-secondary rounded-lg overflow-hidden bg-background">
      {items.map((item, index) => (
        <AccordionItem
          key={index}
          title={item.title}
          subtitle={item.subtitle}
          icon={item.icon}
          isOpen={openIndex === index}
          onToggle={() => handleToggle(index)}
        >
          {item.content}
        </AccordionItem>
      ))}
    </div>
  );
}
