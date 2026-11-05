import { useState, useEffect, useRef } from 'react';

/**
 * Hook to coordinate loading skeletons during data or filter changes.
 * Guarantees a minimum display time of 200ms (>= 180ms) for smooth transitions
 * without flickering, and immediately settles under prefers-reduced-motion.
 */
export function useLoadingState(deps: any[], delayMs = 200): boolean {
  const [isLoaded, setIsLoaded] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsLoaded(true);
      return;
    }

    setIsLoaded(false);
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, deps);

  return isLoaded;
}
