'use client';

import { cn } from '@/app/utils/className';

type M3ProgressIndicatorProps = {
  variant?: 'linear' | 'circular';
  determinate?: boolean;
  progress?: number; // 0-100 for determinate
  size?: number; // size in pixels for circular
  className?: string;
  color?: string;
  trackColor?: string;
};

export default function M3ProgressIndicator({
  variant = 'linear',
  determinate = false,
  progress = 0,
  size = 40,
  className,
  color = 'var(--color-primary)',
  trackColor = 'rgba(0,0,0,0.12)',
}: M3ProgressIndicatorProps) {
  if (variant === 'circular') {
    return (
      <div
        className={cn('relative inline-flex items-center justify-center', className)}
        style={{ width: size, height: size }}
      >
        <svg
          className="absolute inset-0"
          viewBox="0 0 52 52"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Track */}
          <circle
            cx="26"
            cy="26"
            r="20"
            fill="none"
            stroke={trackColor}
            strokeWidth="4"
          />
          {/* Progress */}
          {determinate ? (
            <circle
              cx="26"
              cy="26"
              r="20"
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            />
          ) : (
            <circle
              cx="26"
              cy="26"
              r="20"
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * 0.75}`}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: 'center',
                animation: 'm3-circular-spin 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              }}
            />
          )}
        </svg>
        <style jsx>{`
          @keyframes m3-circular-spin {
            0% {
              stroke-dashoffset: ${2 * Math.PI * 20 * 0.75};
              transform: rotate(-90deg);
            }
            50% {
              stroke-dashoffset: ${2 * Math.PI * 20 * 0.25};
              transform: rotate(90deg);
            }
            100% {
              stroke-dashoffset: ${2 * Math.PI * 20 * 0.75};
              transform: rotate(270deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // Linear variant
  return (
    <div className={cn('relative w-full h-1 overflow-hidden', className)} style={{ backgroundColor: trackColor }}>
      {determinate ? (
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: color,
          }}
        />
      ) : (
        <div
          className="h-full absolute inset-0"
          style={{
            backgroundColor: color,
            animation: 'm3-linear-indeterminate 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          }}
        >
          <style jsx>{`
            @keyframes m3-linear-indeterminate {
              0% {
                left: -35%;
                width: 35%;
              }
              50% {
                left: 100%;
                width: 65%;
              }
              100% {
                left: 100%;
                width: 0%;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
