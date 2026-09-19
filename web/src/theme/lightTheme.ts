import { lightColors } from './colors';
import { radius } from './radius';
import { lightShadows } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';
import { Theme } from './types';

/**
 * Light Theme
 */
export const lightTheme: Theme = {
  mode: 'light',
  isDark: false,
  colors: lightColors,
  spacing,
  radius,
  typography,
  shadows: lightShadows,
};

