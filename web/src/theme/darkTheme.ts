import { darkColors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { darkShadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Theme } from '@/theme/types';

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
