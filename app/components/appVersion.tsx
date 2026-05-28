import packageJson from '@/package.json';

export default function AppVersion({ className, pinned }: { className?: string; pinned?: boolean }) {
  const base = pinned ? 'absolute bottom-0 left-0 right-0 justify-self-center' : '';
  return (
    <span className={`text-xs text-foreground/40 ${base} ${className ?? ''}`.trim()}>v. {packageJson.version}</span>
  );
}
