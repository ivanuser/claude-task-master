// Theme types that can be used on both server and client
export type ThemeMode = 'light' | 'dark' | 'system' | 'auto';
export type ColorScheme = 'default' | 'monochrome' | 'highContrast' | 'colorful' | 'pastel' | 'custom';
export type UIDensity = 'comfortable' | 'compact' | 'spacious';
export type FontSize = 'small' | 'medium' | 'large' | 'extraLarge';
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

export interface ThemePreferences {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  density: UIDensity;
  fontSize: FontSize;
  fontFamily?: string | null;
  highContrast: boolean;
  reducedMotion: boolean;
  colorBlindMode?: ColorBlindMode | null;
  customPrimary?: string | null;
  customSecondary?: string | null;
  customAccent?: string | null;
  customBackground?: string | null;
  customText?: string | null;
  borderRadius?: number | null;
  shadowIntensity?: number | null;
}