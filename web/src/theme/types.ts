export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  iconPrimary: string;
  iconSecondary: string;
  active: string;
  activeText: string;
  danger: string;
  unread: string;
  verification: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeRadius {
  small: number;
  medium: number;
  large: number;
  card: number;
  pill: number;
  circle: number;
}

export interface ThemeShadowItem {
  boxShadow: string;
}

export interface ThemeShadows {
  card: ThemeShadowItem;
  elevated: ThemeShadowItem;
  modal: ThemeShadowItem;
}

export interface TypographyStyle {
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
  letterSpacing?: string;
}

export interface ThemeTypography {
  largeTitle: TypographyStyle;
  title: TypographyStyle;
  sectionTitle: TypographyStyle;
  body: TypographyStyle;
  bodyMedium: TypographyStyle;
  bodySmall: TypographyStyle;
  caption: TypographyStyle;
  button: TypographyStyle;
  tabLabel: TypographyStyle;
  navigationLabel: TypographyStyle;
}

export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  typography: ThemeTypography;
  shadows: ThemeShadows;
}

export interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

