import { ThemeShadows } from './types';

/**
 * Subtle dark-mode shadows.
 */
export const darkShadows: ThemeShadows = {
  card: {
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
  },
  elevated: {
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.35)',
  },
  modal: {
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5)',
  },
};

/**
 * Subtle light-mode shadows.
 */
export const lightShadows: ThemeShadows = {
  card: {
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  elevated: {
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.08)',
  },
  modal: {
    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.12)',
  },
};

