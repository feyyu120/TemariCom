import React, { createContext, useContext, useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { darkTheme } from './darkTheme';
import { lightTheme } from './lightTheme';
import {
  Theme,
  ThemeColors,
  ThemeContextValue,
  ThemeMode,
  ThemeRadius,
  ThemeShadows,
  ThemeSpacing,
  ThemeTypography,
} from './types';

const THEME_STORAGE_KEY = 'temaricom-theme-mode';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

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

  // Sync document root class ('dark') and CSS variables with active mode
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
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

