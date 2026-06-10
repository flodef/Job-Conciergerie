'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useScrollIndicators(isOpen: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 0);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }
    // Defer so the DOM has rendered and measurements are available
    const raf = requestAnimationFrame(() => {
      update();
      const el = ref.current;
      if (!el) return;
      el.addEventListener('scroll', update, { passive: true });
      const ro = new ResizeObserver(update);
      ro.observe(el);
    });
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [isOpen, update]);

  return { ref, canScrollUp, canScrollDown };
}
