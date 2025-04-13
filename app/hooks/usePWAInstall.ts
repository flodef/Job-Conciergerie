'use client';

import { useLocalStorage } from '@/app/utils/localStorage';
import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAInstallResult {
  isInstallable: boolean;
  isInstalled: boolean;
  handleInstallClick: () => Promise<void>;
}

export function usePWAInstall(cooldownDays: number = 7, cooldownKey: string = 'install_prompt_seen'): PWAInstallResult {
  const [lastPrompt, setLastPrompt] = useLocalStorage<string>(cooldownKey);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Handle installation click
  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    const result = await deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    if (result.outcome === 'accepted') {
      setIsInstalled(true);
    } else {
      // Reset the deferred prompt so it can be triggered again
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  }, [deferredPrompt]);

  // Check if we can show the install prompt
  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if we've already shown the prompt recently
    if (lastPrompt) {
      const lastPromptDate = new Date(lastPrompt);
      const now = new Date();
      const daysSinceLastPrompt = Math.floor((now.getTime() - lastPromptDate.getTime()) / (1000 * 60 * 60 * 24));

      // If we've shown the prompt recently, don't show it again yet
      if (daysSinceLastPrompt < cooldownDays) return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault();

      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Update UI to show the install button
      setIsInstallable(true);

      // Mark that we've shown the prompt
      setLastPrompt(new Date().toISOString());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Clean up
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [cooldownDays, lastPrompt, setLastPrompt]);

  // Handle app installed event
  useEffect(() => {
    const handleAppInstalled = () => {
      // Hide the install button when installed
      setIsInstallable(false);
      setIsInstalled(true);
      setLastPrompt(undefined);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [setLastPrompt]);

  return {
    isInstallable,
    isInstalled,
    handleInstallClick,
  };
}
