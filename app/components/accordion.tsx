'use client';

import { IconChevronDown } from '@tabler/icons-react';
import { clsx } from 'clsx/lite';
import React from 'react';

interface AccordionItemProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

interface AccordionProps {
  items: {
    title: string;
    content: React.ReactNode;
  }[];
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, isOpen, onToggle, children }) => {
  return (
    <div className="border-b border-secondary">
      <button
        className="w-full flex justify-between items-center py-4 px-6 text-left"
        onClick={onToggle}
      >
        <span className="text-lg font-medium">{title}</span>
        <IconChevronDown
          className={clsx('transition-transform', isOpen ? 'rotate-180' : '')}
          size={24}
        />
      </button>
      <div
        className={clsx(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-6 pt-0">{children}</div>
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
          isOpen={openIndex === index}
          onToggle={() => handleToggle(index)}
        >
          {item.content}
        </AccordionItem>
      ))}
    </div>
  );
}
