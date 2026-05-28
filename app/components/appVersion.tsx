import packageJson from '@/package.json';

export default function AppVersion({ className }: { className?: string }) {
  return <span className={`text-xs text-foreground/40 ${className ?? ''}`}>v. {packageJson.version}</span>;
}
