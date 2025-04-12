'use client';

import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAInstallResult {
  isInstallable: boolean;
  isInstalled: boolean;
  handleInstallClick: () => Promise<void>;
}

export function usePWAInstall(cooldownDays: number = 7, cooldownKey: string = 'install_prompt_seen'): PWAInstallResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Handle installation click
  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // We've used the prompt, and can't use it again, discard it
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  // Check if we can show the install prompt
  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if we've already shown the prompt recently
    const lastPrompt = localStorage.getItem(cooldownKey);
    if (lastPrompt) {
      const lastPromptDate = new Date(lastPrompt);
      const now = new Date();
      const daysSinceLastPrompt = Math.floor((now.getTime() - lastPromptDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // If we've shown the prompt recently, don't show it again yet
      if (daysSinceLastPrompt < cooldownDays) {
        return;
      }
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
      localStorage.setItem(cooldownKey, new Date().toISOString());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Clean up
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [cooldownDays, cooldownKey]);

  // Handle app installed event
  useEffect(() => {
    const handleAppInstalled = () => {
      // Hide the install button when installed
      setIsInstallable(false);
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return {
    isInstallable,
    isInstalled,
    handleInstallClick
  };
}
