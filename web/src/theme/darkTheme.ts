import { darkColors } from './colors';
import { radius } from './radius';
import { darkShadows } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';
import { Theme } from './types';

/**
 * Dark Theme (Default for TemariCom)
 */
export const darkTheme: Theme = {
  mode: 'dark',
  isDark: true,
  colors: darkColors,
  spacing,
  radius,
  typography,
  shadows: darkShadows,
};

