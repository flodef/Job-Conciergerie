'use client';

import { Home } from '@/app/types/dataTypes';
import { titleClassName } from '@/app/utils/className';
import { IconUsers } from '@tabler/icons-react';

type HomeTitleProps = {
  home: Home;
  className?: string;
};

export default function HomeTitle({ home, className }: HomeTitleProps) {
  return (
    <span className={className || titleClassName}>
      {home.allowDuo && <IconUsers size={20} className="inline mr-2" />}
      {`${home.title} (${home.geographicZone})`}
    </span>
  );
}
