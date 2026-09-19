import { ThemeColors } from '@/theme/types';

/**
 * Dark Mode Palette (Default)
 * - Near-black background to avoid eye strain (#0B0D10).
 * - High-comfort near-white text (#F2F3F5).
 * - Primary interaction color #1D2B53.
 * - Red for unread messages / danger states (#E53935).
 * - White/near-white for verification badges.
 */
export const darkColors: ThemeColors = {
  background: '#0B0D10',
  surface: '#111419',
  surfaceElevated: '#171A20',
  border: '#242830',
  borderSubtle: '#1A1D24',
  textPrimary: '#F2F3F5',
  textSecondary: '#A7ABB3',
  textTertiary: '#737780',
  iconPrimary: '#F2F3F5',
  iconSecondary: '#9EA3AE',
  active: '#1D2B53',
  activeText: '#F2F3F5',
  danger: '#E53935',
  unread: '#E53935',
  verification: '#F2F3F5',
};

/**
 * Light Mode Palette
 * - Near-white background (#F7F8FA) to avoid glare.
 * - Crisp near-black text (#17191D).
 * - Consistent primary interaction color #1D2B53.
 * - Red for unread messages / danger states (#E53935).
 * - Neutral dark badge for verification.
 */
export const lightColors: ThemeColors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F3F6',
  border: '#D9DDE3',
  borderSubtle: '#E8EBEF',
  textPrimary: '#17191D',
  textSecondary: '#5F636B',
  textTertiary: '#8A8F98',
  iconPrimary: '#17191D',
  iconSecondary: '#8E8E93',
  active: '#1D2B53',
  activeText: '#F2F3F5',
  danger: '#E53935',
  unread: '#E53935',
  verification: '#17191D',
};
