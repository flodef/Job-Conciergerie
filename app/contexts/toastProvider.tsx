'use client';

import type { Toast} from '@/app/components/toastMessage';
import { ToastMessage } from '@/app/components/toastMessage';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

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

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>();
  const [timeout, setTimeoutValue] = useState<number>(3000);
  const onClickRef = useRef<(() => void) | undefined>(undefined);

  const hideToast = useCallback(() => {
    setToast(undefined);
    onClickRef.current = undefined;
  }, []);

  const showToast = useCallback((newToast: Toast, options?: ToastOptions) => {
    onClickRef.current = options?.onClick;
    setTimeoutValue(options?.timeout ?? 3000);
    // Reset first so re-showing an identical toast restarts the timer/animation
    setToast(undefined);
    requestAnimationFrame(() => setToast(newToast));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastMessage
        toast={toast}
        timeout={timeout}
        onClick={() => onClickRef.current?.()}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
