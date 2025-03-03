'use client';

import { useRedirectIfNotRegistered } from '../utils/redirectIfNotRegistered';

export default function Employees() {
  // Redirect if not registered
  useRedirectIfNotRegistered();
  
  return <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center bg-background">Prestataires</div>;
}
