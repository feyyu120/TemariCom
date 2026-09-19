import React, { createContext, useContext, useCallback, useLayoutEffect, useMemo, useState, ReactNode } from 'react';
import { darkTheme } from '@/theme/darkTheme';
import { lightTheme } from '@/theme/lightTheme';
import {
  Theme,
  ThemeColors,
  ThemeContextValue,
  ThemeMode,
  ThemeRadius,
  ThemeShadows,
  ThemeSpacing,
  ThemeTypography,
} from '@/theme/types';

const THEME_STORAGE_KEY = 'temaricom-theme-mode';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Disables CSS transitions momentarily during theme switch so every element,
 * background, border, and search bar update simultaneously in a single atomic frame.
 */
function disableTransitionsDuringThemeSwitch() {
  if (typeof document === 'undefined') return () => {};

  const css = document.createElement('style');
  css.appendChild(
    document.createTextNode(
      `*, *::before, *::after {
        -webkit-transition: none !important;
        -moz-transition: none !important;
        -o-transition: none !important;
        -ms-transition: none !important;
        transition: none !important;
      }`
    )
  );
  document.head.appendChild(css);

  return () => {
    // Force a style recalculation to flush theme styles immediately
    (() => window.getComputedStyle(document.body).opacity)();

    // Re-enable normal interactive transitions on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (css.parentNode) {
          document.head.removeChild(css);
        }
      });
    });
  };
}

function applyThemeMode(mode: ThemeMode) {
  if (typeof document === 'undefined') return;

  const restoreTransitions = disableTransitionsDuringThemeSwitch();
  const root = document.documentElement;

  root.classList.toggle('dark', mode === 'dark');
  root.style.colorScheme = mode;
  localStorage.setItem(THEME_STORAGE_KEY, mode);

  restoreTransitions();
}

export interface ThemeProviderProps {
  children: ReactNode;
  initialMode?: ThemeMode;
}

/**
 * ThemeProvider wraps the web application and keeps Theme state, document class, and localStorage in sync.
 * Defaults to 'dark' mode.
 */
export function ThemeProvider({
  children,
  initialMode = 'dark',
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    }
    return initialMode;
  });

  // Apply the root class before the browser paints so every element paints in the same mode
  useLayoutEffect(() => {
    applyThemeMode(mode);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    applyThemeMode(newMode);
    setModeState(newMode);
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState((prev) => {
      const nextMode = prev === 'dark' ? 'light' : 'dark';
      applyThemeMode(nextMode);
      return nextMode;
    });
  }, []);

  const theme: Theme = useMemo(
    () => (mode === 'dark' ? darkTheme : lightTheme),
    [mode]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      mode,
      isDark: mode === 'dark',
      setMode,
      toggleTheme,
    }),
    [theme, mode, setMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export type UseThemeResult = ThemeContextValue & {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  typography: ThemeTypography;
  shadows: ThemeShadows;
};

/**
 * useTheme Hook
 * Primary hook to access theme tokens, mode, and toggle methods.
 */
export function useTheme(): UseThemeResult {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return {
    ...context,
    colors: context.theme.colors,
    spacing: context.theme.spacing,
    radius: context.theme.radius,
    typography: context.theme.typography,
    shadows: context.theme.shadows,
  };
}

/**
 * Convenience hook for theme colors.
 */
export function useThemeColors(): ThemeColors {
  const { colors } = useTheme();
  return colors;
}
