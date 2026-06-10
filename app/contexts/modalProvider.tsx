'use client';

import { generateSimpleId } from '@/app/utils/id';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

// A modal entry can either be a static node or a render function that receives
// its own id (handy to wire `onClose={() => closeModal(id)}` at the call site).
type ModalRender = ReactNode | ((id: string) => ReactNode);

interface ModalEntry {
  id: string;
  render: ModalRender;
}

interface ModalContextType {
  /** Push a new modal on top of the stack. Returns its id. */
  openModal: (render: ModalRender) => string;
  /** Replace the topmost modal (does not keep it in the stack). Returns the new id. */
  replaceModal: (render: ModalRender) => string;
  /** Close a modal by id, or the topmost one if no id is given. */
  closeModal: (id?: string) => void;
  /** Close every modal. */
  closeAllModals: () => void;
  /** Number of modals currently in the stack. */
  modalCount: number;
  /** Whether there are multiple modals in the stack (used for close button behavior) */
  hasMultipleModals: boolean;
}

const ModalContext = createContext<ModalContextType>({
  openModal: () => '',
  replaceModal: () => '',
  closeModal: () => {},
  closeAllModals: () => {},
  modalCount: 0,
  hasMultipleModals: false,
});

export function ModalProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<ModalEntry[]>([]);

  const openModal = useCallback((render: ModalRender) => {
    const id = generateSimpleId();
    setStack(prev => [...prev, { id, render }]);
    return id;
  }, []);

  const replaceModal = useCallback((render: ModalRender) => {
    const id = generateSimpleId();
    setStack(prev => [...prev.slice(0, -1), { id, render }]);
    return id;
  }, []);

  const closeModal = useCallback((id?: string) => {
    setStack(prev => {
      if (prev.length === 0) return prev;
      if (!id) return prev.slice(0, -1);
      return prev.filter(entry => entry.id !== id);
    });
  }, []);

  const closeAllModals = useCallback(() => setStack([]), []);

  return (
    <ModalContext.Provider
      value={{
        openModal,
        replaceModal,
        closeModal,
        closeAllModals,
        modalCount: stack.length,
        hasMultipleModals: stack.length > 1,
      }}
    >
      {children}
      {/*
        Singleton container: every modal in the stack stays mounted (so its internal
        state is preserved when another modal is opened on top of it), but only the
        topmost one is visible. Closing the top one reveals the previous automatically.
      */}
      {stack.map((entry, index) => (
        <div key={entry.id} style={{ display: index === stack.length - 1 ? 'contents' : 'none' }}>
          {typeof entry.render === 'function' ? entry.render(entry.id) : entry.render}
        </div>
      ))}
    </ModalContext.Provider>
  );
}

export const useModal = () => useContext(ModalContext);
