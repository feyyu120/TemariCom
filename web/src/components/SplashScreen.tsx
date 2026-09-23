import React from 'react';
import { useSplashController } from '@/utils/splash';

export interface SplashScreenProps {
  isLoading: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isLoading }) => {
  const { isVisible, isFadingOut } = useSplashController(isLoading);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background select-none transition-opacity duration-[400ms] ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-hidden={isFadingOut}
      role="status"
      aria-label="Loading TemariCom"
    >
      <div className="flex flex-col items-center justify-center">
        {/* Animated Brand Emblem: Zoom-in, Fade-in, and subtle breathing pulse */}
        <div className="animate-splash-logo flex items-center justify-center">
          {/* Dark Mode Logo */}
          <img
            src="/assets/temaricom-logo-dark.png"
            alt="TemariCom Logo"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain hidden dark:block drop-shadow-md"
          />
          {/* Light Mode Logo */}
          <img
            src="/assets/temaricom-logo-light.png"
            alt="TemariCom Logo"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain block dark:hidden drop-shadow-md"
          />
        </div>

        {/* Brand Text */}
        <h1 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-textPrimary animate-fadeIn">
          TemariCom
        </h1>

        <p className="text-xs text-textTertiary mt-1 font-medium tracking-wide">
          Connecting Ethiopian Students
        </p>

        {/* Micro-loading progress bar */}
        <div className="w-28 h-0.5 bg-surface-elevated rounded-full mt-6 overflow-hidden">
          <div className="w-full h-full bg-active animate-pulse rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;

