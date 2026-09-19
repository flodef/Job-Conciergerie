import { cn } from '@/app/utils/className';
import { IconLock } from '@tabler/icons-react';
import type { ReactNode } from 'react';

/** Small pill marking a feature as v3-only. */
export const V3Badge = ({ className }: { className?: string }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/10 px-2 py-0.5',
      'text-[10px] font-bold uppercase tracking-wide text-primary align-middle',
      className,
    )}
  >
    <IconLock size={11} stroke={2.5} />
    v3
  </span>
);

/**
 * Teaser for a v3-only feature shown to v2 tenants: the content stays
 * visible as a greyed-out, non-interactive preview under a « v3 » badge.
 * The real gate is server-side (`requireV3` / version checks) — this is
 * only the « look but don't touch » layer.
 */
const FeatureLocked: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('relative', className)}>
    <div className="pointer-events-none select-none opacity-40" aria-hidden>
      {children}
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <V3Badge />
    </div>
  </div>
);

export default FeatureLocked;
