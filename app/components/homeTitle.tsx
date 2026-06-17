'use client';

import type { Home } from '@/app/types/dataTypes';
import { titleClassName } from '@/app/utils/className';
import { IconUsers } from '@tabler/icons-react';

type HomeTitleProps = {
  home: Home;
  allowDuo: boolean;
  className?: string;
};

export default function HomeTitle({ home, allowDuo, className }: HomeTitleProps) {
  return (
    <span className={className || titleClassName}>
      {allowDuo && <IconUsers size={20} className="inline mr-2" />}
      {`${home.title} (${home.geographicZone})`}
    </span>
  );
}
