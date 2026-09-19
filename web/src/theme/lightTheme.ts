import { lightColors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { lightShadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Theme } from '@/theme/types';

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
