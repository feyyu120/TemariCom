import { useEffect, useState } from 'react';

/**
 * Splash Screen Animation Timing Configuration (in milliseconds)
 */
export const SPLASH_CONFIG = {
  MIN_DISPLAY_MS: 1200, // Display for at least 1.2s to enjoy the smooth zoom-in / pulse animation
  MAX_DISPLAY_MS: 3000, // Maximum display time before auto-dismissing
  FADE_OUT_DURATION_MS: 400, // Fluid 400ms CSS fade-out transition
} as const;

export interface SplashControllerState {
  isVisible: boolean; // Present in DOM
  isFadingOut: boolean; // Triggering CSS opacity-0 transition
}

/**
 * Functional hook controlling the splash screen lifecycle (zero classes).
 * 
 * Ensures the splash screen:
 * 1. Remains visible during initial bootstrap and auth verification.
 * 2. Stays visible for at least MIN_DISPLAY_MS to showcase smooth entrance animation.
 * 3. Gracefully fades out once loading completes (or after MAX_DISPLAY_MS).
 * 4. Completely unmounts from the DOM once faded out to eliminate rendering overhead.
 */
export function useSplashController(isLoading: boolean): SplashControllerState {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const startTime = Date.now();

    // Fallback safety timeout (forces fade-out if backend or network hangs)
    const safetyTimeout = setTimeout(() => {
      triggerFadeOut();
    }, SPLASH_CONFIG.MAX_DISPLAY_MS);

    function triggerFadeOut() {
      setIsFadingOut(true);
      setTimeout(() => {
        setIsVisible(false);
      }, SPLASH_CONFIG.FADE_OUT_DURATION_MS);
    }

    // When the primary auth/app loading finishes:
    if (!isLoading) {
      const elapsed = Date.now() - startTime;
      const remainingMinTime = Math.max(0, SPLASH_CONFIG.MIN_DISPLAY_MS - elapsed);

      const dismissTimer = setTimeout(() => {
        triggerFadeOut();
      }, remainingMinTime);

      return () => {
        clearTimeout(safetyTimeout);
        clearTimeout(dismissTimer);
      };
    }

    return () => {
      clearTimeout(safetyTimeout);
    };
  }, [isLoading]);

  return { isVisible, isFadingOut };
}

