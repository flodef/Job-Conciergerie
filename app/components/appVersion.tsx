import packageJson from '@/package.json';
import { cn } from '../utils/className';

export default function AppVersion({ className, flow }: { className?: string; flow?: boolean }) {
  return (
    <span
      className={cn(
        'text-xs text-foreground/40',
        flow ? 'text-center w-full' : 'absolute bottom-0 left-0 right-0 justify-self-center',
        className,
      )}
    >
      v. {packageJson.version}
    </span>
  );
}
