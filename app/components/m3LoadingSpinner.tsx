'use client';

import { Size } from '@/app/types/types';
import { cn } from '@/app/utils/className';
import { defaultHTMLColor } from '@/app/utils/color';
import { M3LoadingIndicator } from '@alerix/m3-loading-indicator/react';

type M3LoadingSpinnerProps = {
  size?: Size;
  text?: string;
  fullPage?: boolean;
  className?: string;
  color?: string;
  contained?: boolean;
  containerColor?: string;
};

export default function M3LoadingSpinner({
  size = 'large',
  text,
  fullPage = true,
  className,
  color = defaultHTMLColor,
  contained = false,
  containerColor = 'rgba(0,0,0,0.08)',
}: M3LoadingSpinnerProps) {
  const sizeMap = {
    small: 32,
    medium: 48,
    large: 64,
  };

  const indicatorSize = sizeMap[size];

  return (
    <div
      className={cn('flex flex-col items-center justify-center', fullPage ? 'h-[calc(100vh-10rem)]' : '', className)}
    >
      <M3LoadingIndicator size={indicatorSize} color={color} contained={contained} containerColor={containerColor} />
      {text && <p className="mt-2 text-foreground/70">{text}</p>}
    </div>
  );
}
