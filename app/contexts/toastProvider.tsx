'use client';

import type { Toast } from '@/app/components/toastMessage';
import { ToastMessage } from '@/app/components/toastMessage';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

interface ToastOptions {
  timeout?: number;
  onClick?: () => void;
}

interface ToastContextType {
  /** Show a global toast. It is rendered at the root, independently of any modal. */
  showToast: (toast: Toast, options?: ToastOptions) => void;
  /** Hide the current toast immediately. */
  hideToast: () => void;
}

interface CurrentToast {
  toast: Toast;
  timeout: number;
  onClick?: () => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<CurrentToast>();

  const hideToast = useCallback(() => {
    setCurrent(undefined);
  }, []);

  const showToast = useCallback((toast: Toast, options?: ToastOptions) => {
    // Reset first so re-showing an identical toast restarts the timer/animation
    setCurrent(undefined);
    requestAnimationFrame(() => setCurrent({ toast, timeout: options?.timeout ?? 5000, onClick: options?.onClick }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastMessage
        toast={current?.toast}
        timeout={current?.timeout}
        onClick={current?.onClick}
        onClose={hideToast}
        closable
      />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
