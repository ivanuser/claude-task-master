import { prisma } from '@/lib/database';
import { ThemeMode, ColorScheme, UIDensity, FontSize, ColorBlindMode } from '@/types/prisma-enums';

// Theme color definitions
export const COLOR_SCHEMES = {
  BLUE: {
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA',
    background: {
      light: '#FFFFFF',
      dark: '#0F172A',
    },
    text: {
      light: '#1F2937',
      dark: '#F3F4F6',
    },
  },
  PURPLE: {
    primary: '#8B5CF6',
    secondary: '#6D28D9',
    accent: '#A78BFA',
    background: {
      light: '#FFFFFF',
      dark: '#0F172A',
    },
    text: {
      light: '#1F2937',
      dark: '#F3F4F6',
    },
  },
  GREEN: {
    primary: '#10B981',
    secondary: '#059669',
    accent: '#34D399',
    background: {
      light: '#FFFFFF',
      dark: '#0F172A',
    },
    text: {
      light: '#1F2937',
      dark: '#F3F4F6',
    },
  },
  ORANGE: {
    primary: '#F97316',
    secondary: '#EA580C',
    accent: '#FB923C',
    background: {
      light: '#FFFFFF',
      dark: '#0F172A',
    },
    text: {
      light: '#1F2937',
      dark: '#F3F4F6',
    },
  },
  RED: {
    primary: '#EF4444',
    secondary: '#DC2626',
    accent: '#F87171',
    background: {
      light: '#FFFFFF',
      dark: '#0F172A',
    },
    text: {
      light: '#1F2937',
      dark: '#F3F4F6',
    },
  },
  TEAL: {
    primary: '#14B8A6',
    secondary: '#0D9488',
    accent: '#2DD4BF',
    background: {
      light: '#FFFFFF',
      dark: '#0F172A',
    },
    text: {
      light: '#1F2937',
      dark: '#F3F4F6',
    },
  },
  PINK: {
    primary: '#EC4899',
    secondary: '#DB2777',
    accent: '#F472B6',
    background: {
      light: '#FFFFFF',
      dark: '#0F172A',
    },
    text: {
      light: '#1F2937',
      dark: '#F3F4F6',
    },
  },
  GRAY: {
    primary: '#6B7280',
    secondary: '#4B5563',
    accent: '#9CA3AF',
    background: {
      light: '#FFFFFF',
      dark: '#0F172A',
    },
    text: {
      light: '#1F2937',
      dark: '#F3F4F6',
    },
  },
};

// UI Density settings
export const DENSITY_SETTINGS = {
  COMPACT: {
    spacing: '0.25rem',
    padding: '0.25rem 0.5rem',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  COMFORTABLE: {
    spacing: '0.5rem',
    padding: '0.5rem 1rem',
    fontSize: '1rem',
    lineHeight: '1.5rem',
  },
  SPACIOUS: {
    spacing: '0.75rem',
    padding: '0.75rem 1.5rem',
    fontSize: '1.125rem',
    lineHeight: '1.75rem',
  },
};

// Font size settings
export const FONT_SIZES = {
  SMALL: {
    base: '0.875rem',
    heading: '1.5rem',
    small: '0.75rem',
  },
  MEDIUM: {
    base: '1rem',
    heading: '1.875rem',
    small: '0.875rem',
  },
  LARGE: {
    base: '1.125rem',
    heading: '2.25rem',
    small: '1rem',
  },
  EXTRA_LARGE: {
    base: '1.25rem',
    heading: '2.5rem',
    small: '1.125rem',
  },
};

// Border radius settings
export const BORDER_RADIUS = {
  small: '0.25rem',
  medium: '0.375rem',
  large: '0.5rem',
  xl: '0.75rem',
};

// Shadow intensity settings
export const SHADOW_INTENSITY = {
  none: 'none',
  light: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  medium: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  heavy: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
};

interface ThemePreferences {
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
  borderRadius?: string | null;
  shadowIntensity?: string | null;
  animations: boolean;
  savedThemes?: any;
}

export class ThemeService {
  // Get user's theme preferences
  async getUserTheme(userId: string): Promise<ThemePreferences | null> {
    try {
      const preferences = await prisma.themePreferences.findUnique({
        where: { userId },
      });

      if (!preferences) {
        // Return default preferences if none exist
        return {
          mode: 'SYSTEM' as ThemeMode,
          colorScheme: 'BLUE' as ColorScheme,
          density: 'COMFORTABLE' as UIDensity,
          fontSize: 'MEDIUM' as FontSize,
          fontFamily: 'system',
          highContrast: false,
          reducedMotion: false,
          colorBlindMode: null,
          customPrimary: null,
          customSecondary: null,
          customAccent: null,
          customBackground: null,
          customText: null,
          borderRadius: 'medium',
          shadowIntensity: 'medium',
          animations: true,
          savedThemes: [],
        };
      }

      return preferences;
    } catch (error) {
      console.error('Error getting user theme:', error);
      return null;
    }
  }

  // Save or update user's theme preferences
  async saveUserTheme(userId: string, preferences: Partial<ThemePreferences>): Promise<ThemePreferences | null> {
    try {
      // Convert string enums to uppercase for Prisma
      const normalizedPreferences: any = { ...preferences };
      
      if (normalizedPreferences.mode) {
        normalizedPreferences.mode = normalizedPreferences.mode.toUpperCase();
      }
      
      if (normalizedPreferences.colorScheme) {
        normalizedPreferences.colorScheme = normalizedPreferences.colorScheme.toUpperCase();
      }
      
      if (normalizedPreferences.density) {
        normalizedPreferences.density = normalizedPreferences.density.toUpperCase();
      }
      
      if (normalizedPreferences.fontSize) {
        // Handle fontSize enum conversion (e.g., 'medium' -> 'MEDIUM', 'extraLarge' -> 'EXTRA_LARGE')
        normalizedPreferences.fontSize = normalizedPreferences.fontSize
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .toUpperCase();
      }
      
      if (normalizedPreferences.colorBlindMode) {
        normalizedPreferences.colorBlindMode = normalizedPreferences.colorBlindMode.toUpperCase();
      }

      const existingPreferences = await prisma.themePreferences.findUnique({
        where: { userId },
      });

      let result;
      if (existingPreferences) {
        // Update existing preferences
        result = await prisma.themePreferences.update({
          where: { userId },
          data: normalizedPreferences,
        });
      } else {
        // Create new preferences
        result = await prisma.themePreferences.create({
          data: {
            userId,
            ...normalizedPreferences,
          } as any,
        });
      }

      return result;
    } catch (error) {
      console.error('Error saving user theme:', error);
      return null;
    }
  }

  // Generate CSS variables based on preferences
  generateCSSVariables(preferences: ThemePreferences, isDark: boolean): Record<string, string> {
    const colorScheme = preferences.colorScheme === 'CUSTOM' && preferences.customPrimary
      ? {
          primary: preferences.customPrimary,
          secondary: preferences.customSecondary || preferences.customPrimary,
          accent: preferences.customAccent || preferences.customPrimary,
          background: {
            light: preferences.customBackground || '#FFFFFF',
            dark: preferences.customBackground || '#0F172A',
          },
          text: {
            light: preferences.customText || '#1F2937',
            dark: preferences.customText || '#F3F4F6',
          },
        }
      : COLOR_SCHEMES[preferences.colorScheme as keyof typeof COLOR_SCHEMES];

    const density = DENSITY_SETTINGS[preferences.density];
    const fontSize = FONT_SIZES[preferences.fontSize];
    const borderRadius = BORDER_RADIUS[preferences.borderRadius || 'medium'];
    const shadow = SHADOW_INTENSITY[preferences.shadowIntensity || 'medium'];

    const vars: Record<string, string> = {
      '--color-primary': colorScheme.primary,
      '--color-secondary': colorScheme.secondary,
      '--color-accent': colorScheme.accent,
      '--color-background': isDark ? colorScheme.background.dark : colorScheme.background.light,
      '--color-text': isDark ? colorScheme.text.dark : colorScheme.text.light,
      '--spacing': density.spacing,
      '--padding': density.padding,
      '--font-size-base': fontSize.base,
      '--font-size-heading': fontSize.heading,
      '--font-size-small': fontSize.small,
      '--line-height': density.lineHeight,
      '--border-radius': borderRadius,
      '--shadow': shadow,
      '--font-family': preferences.fontFamily || 'system-ui, -apple-system, sans-serif',
    };

    // Add high contrast modifications
    if (preferences.highContrast) {
      vars['--color-border'] = isDark ? '#FFFFFF' : '#000000';
      vars['--contrast-ratio'] = '1.2';
    }

    // Add color blind mode adjustments
    if (preferences.colorBlindMode) {
      vars['--color-blind-mode'] = preferences.colorBlindMode.toLowerCase();
    }

    // Add animation settings
    if (!preferences.animations || preferences.reducedMotion) {
      vars['--transition-duration'] = '0ms';
      vars['--animation-duration'] = '0ms';
    } else {
      vars['--transition-duration'] = '200ms';
      vars['--animation-duration'] = '300ms';
    }

    return vars;
  }

  // Check if dark mode should be active
  shouldUseDarkMode(mode: ThemeMode, systemPrefersDark: boolean, currentHour?: number): boolean {
    switch (mode) {
      case 'DARK':
        return true;
      case 'LIGHT':
        return false;
      case 'SYSTEM':
        return systemPrefersDark;
      case 'AUTO':
        // Auto mode: dark between 6 PM and 6 AM
        const hour = currentHour ?? new Date().getHours();
        return hour >= 18 || hour < 6;
      default:
        return false;
    }
  }

  // Export theme as JSON
  async exportTheme(userId: string): Promise<string | null> {
    try {
      const preferences = await this.getUserTheme(userId);
      if (!preferences) return null;

      const exportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        preferences,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting theme:', error);
      return null;
    }
  }

  // Import theme from JSON
  async importTheme(userId: string, jsonString: string): Promise<boolean> {
    try {
      const importData = JSON.parse(jsonString);
      
      if (!importData.preferences) {
        throw new Error('Invalid theme export format');
      }

      await this.saveUserTheme(userId, importData.preferences);
      return true;
    } catch (error) {
      console.error('Error importing theme:', error);
      return false;
    }
  }

  // Save a custom theme preset
  async saveThemePreset(userId: string, presetName: string): Promise<boolean> {
    try {
      const preferences = await this.getUserTheme(userId);
      if (!preferences) return false;

      const savedThemes = (preferences.savedThemes as any[]) || [];
      const preset = {
        name: presetName,
        timestamp: new Date().toISOString(),
        settings: {
          mode: preferences.mode,
          colorScheme: preferences.colorScheme,
          density: preferences.density,
          fontSize: preferences.fontSize,
          fontFamily: preferences.fontFamily,
          highContrast: preferences.highContrast,
          reducedMotion: preferences.reducedMotion,
          colorBlindMode: preferences.colorBlindMode,
          customPrimary: preferences.customPrimary,
          customSecondary: preferences.customSecondary,
          customAccent: preferences.customAccent,
          customBackground: preferences.customBackground,
          customText: preferences.customText,
          borderRadius: preferences.borderRadius,
          shadowIntensity: preferences.shadowIntensity,
          animations: preferences.animations,
        },
      };

      // Add or update preset
      const existingIndex = savedThemes.findIndex((t: any) => t.name === presetName);
      if (existingIndex >= 0) {
        savedThemes[existingIndex] = preset;
      } else {
        savedThemes.push(preset);
      }

      await prisma.themePreferences.update({
        where: { userId },
        data: { savedThemes },
      });

      return true;
    } catch (error) {
      console.error('Error saving theme preset:', error);
      return false;
    }
  }

  // Load a saved theme preset
  async loadThemePreset(userId: string, presetName: string): Promise<boolean> {
    try {
      const preferences = await this.getUserTheme(userId);
      if (!preferences) return false;

      const savedThemes = (preferences.savedThemes as any[]) || [];
      const preset = savedThemes.find((t: any) => t.name === presetName);
      
      if (!preset) {
        throw new Error('Preset not found');
      }

      await this.saveUserTheme(userId, preset.settings);
      return true;
    } catch (error) {
      console.error('Error loading theme preset:', error);
      return false;
    }
  }

  // Delete a saved theme preset
  async deleteThemePreset(userId: string, presetName: string): Promise<boolean> {
    try {
      const preferences = await this.getUserTheme(userId);
      if (!preferences) return false;

      const savedThemes = ((preferences.savedThemes as any[]) || [])
        .filter((t: any) => t.name !== presetName);

      await prisma.themePreferences.update({
        where: { userId },
        data: { savedThemes },
      });

      return true;
    } catch (error) {
      console.error('Error deleting theme preset:', error);
      return false;
    }
  }
}

// Export singleton instance
export const themeService = new ThemeService();