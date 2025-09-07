'use client'

import { createContext, useContext, useEffect, useState } from 'react';
import { ReactNode } from 'react';
// Define types inline to avoid import issues
type ThemeMode = 'light' | 'dark' | 'system' | 'auto';
type ColorScheme = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal' | 'pink' | 'gray' | 'custom';
type UIDensity = 'comfortable' | 'compact' | 'spacious';
type FontSize = 'small' | 'medium' | 'large' | 'extraLarge';
type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

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
  borderRadius?: number | null;
  shadowIntensity?: number | null;
}

interface ThemeContextType {
  theme: ThemePreferences | null;
  isDark: boolean;
  updateTheme: (preferences: Partial<ThemePreferences>) => Promise<void>;
  exportTheme: () => Promise<void>;
  importTheme: (file: File) => Promise<void>;
  savePreset: (name: string) => Promise<void>;
  loadPreset: (name: string) => Promise<void>;
  deletePreset: (name: string) => Promise<void>;
}


const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreferences | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  // Load theme preferences on mount
  useEffect(() => {
    loadThemePreferences();
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme when preferences change
  useEffect(() => {
    if (theme) {
      applyTheme(theme);
      
      // Determine if dark mode should be active
      const shouldBeDark = calculateDarkMode(theme.mode, systemPrefersDark);
      setIsDark(shouldBeDark);
      
      // Apply to document - Add or remove the 'dark' class for Tailwind
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      document.documentElement.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-high-contrast', String(theme.highContrast));
      document.documentElement.setAttribute('data-reduced-motion', String(theme.reducedMotion));
      
      if (theme.colorBlindMode) {
        document.documentElement.setAttribute('data-color-blind', theme.colorBlindMode.toLowerCase());
      } else {
        document.documentElement.removeAttribute('data-color-blind');
      }
      
      // Apply density class
      document.body.className = document.body.className.replace(/ui-\w+/, '');
      document.body.classList.add(`ui-${theme.density.toLowerCase()}`);
      
      // Apply font size class
      document.body.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
      document.body.classList.add(`font-${theme.fontSize.toLowerCase().replace('_', '-')}`);
    }
  }, [theme, systemPrefersDark]);

  const loadThemePreferences = async () => {
    try {
      const response = await fetch('/api/user/theme', {
        credentials: 'include',
      });
      if (response.ok) {
        const preferences = await response.json();
        setTheme(preferences);
      } else {
        // Use defaults when not authenticated or API returns error
        console.log('Theme API returned', response.status, '- using default theme');
        setTheme({
          mode: 'system',
          colorScheme: 'default',
          density: 'comfortable',
          fontSize: 'medium',
          fontFamily: 'system',
          highContrast: false,
          reducedMotion: false,
          colorBlindMode: null,
          animations: true,
        });
      }
    } catch (error) {
      console.error('Failed to load theme preferences:', error);
      // Use defaults on network error
      setTheme({
        mode: 'system',
        colorScheme: 'default',
        density: 'comfortable',
        fontSize: 'medium',
        fontFamily: 'system',
        highContrast: false,
        reducedMotion: false,
        colorBlindMode: null,
        animations: true,
      });
    }
  };

  const calculateDarkMode = (mode: ThemeMode, systemDark: boolean): boolean => {
    switch (mode) {
      case 'dark':
        return true;
      case 'light':
        return false;
      case 'system':
        return systemDark;
      case 'auto':
        const hour = new Date().getHours();
        return hour >= 18 || hour < 6;
      default:
        return false;
    }
  };

  const applyTheme = (preferences: ThemePreferences) => {
    // Generate and apply CSS variables
    const root = document.documentElement;
    const isDarkMode = calculateDarkMode(preferences.mode, systemPrefersDark);
    
    // Get color scheme
    const colors = getColorScheme(preferences.colorScheme, preferences);
    
    // Apply colors - convert to HSL format for Tailwind
    const hexToHSL = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    
    // Apply colors using Tailwind's variable names
    try {
      root.style.setProperty('--primary', hexToHSL(colors.primary));
      root.style.setProperty('--secondary', hexToHSL(colors.secondary));
      root.style.setProperty('--accent', hexToHSL(colors.accent));
      
      // Apply background and foreground
      if (isDarkMode) {
        root.style.setProperty('--background', hexToHSL(colors.background.dark));
        root.style.setProperty('--foreground', hexToHSL(colors.text.dark));
      } else {
        root.style.setProperty('--background', hexToHSL(colors.background.light));
        root.style.setProperty('--foreground', hexToHSL(colors.text.light));
      }
    } catch (error) {
      console.error('Error applying theme colors:', error);
    }
    
    // Apply other settings
    if (preferences.fontFamily && preferences.fontFamily !== 'system') {
      root.style.setProperty('--font-family', preferences.fontFamily);
    }
    
    // Apply border radius
    const borderRadiusMap: Record<string, string> = {
      small: '0.25rem',
      medium: '0.375rem',
      large: '0.5rem',
      xl: '0.75rem',
    };
    root.style.setProperty('--border-radius', borderRadiusMap[preferences.borderRadius || 'medium']);
    
    // Apply shadow intensity
    const shadowMap: Record<string, string> = {
      none: 'none',
      light: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      medium: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      heavy: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    };
    root.style.setProperty('--shadow', shadowMap[preferences.shadowIntensity || 'medium']);
    
    // Apply animation settings
    if (!preferences.animations || preferences.reducedMotion) {
      root.style.setProperty('--transition-duration', '0ms');
      root.style.setProperty('--animation-duration', '0ms');
    } else {
      root.style.setProperty('--transition-duration', '200ms');
      root.style.setProperty('--animation-duration', '300ms');
    }
  };

  const getColorScheme = (scheme: ColorScheme, preferences: ThemePreferences) => {
    if (scheme === 'custom' && preferences.customPrimary) {
      return {
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
      };
    }
    
    // Default color schemes - use lowercase keys to match database values
    const schemes: Record<string, any> = {
      blue: {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        accent: '#60A5FA',
        background: { light: '#FFFFFF', dark: '#0F172A' },
        text: { light: '#1F2937', dark: '#F3F4F6' },
      },
      purple: {
        primary: '#8B5CF6',
        secondary: '#6D28D9',
        accent: '#A78BFA',
        background: { light: '#FFFFFF', dark: '#0F172A' },
        text: { light: '#1F2937', dark: '#F3F4F6' },
      },
      green: {
        primary: '#10B981',
        secondary: '#059669',
        accent: '#34D399',
        background: { light: '#FFFFFF', dark: '#0F172A' },
        text: { light: '#1F2937', dark: '#F3F4F6' },
      },
      orange: {
        primary: '#F97316',
        secondary: '#EA580C',
        accent: '#FB923C',
        background: { light: '#FFFFFF', dark: '#0F172A' },
        text: { light: '#1F2937', dark: '#F3F4F6' },
      },
      red: {
        primary: '#EF4444',
        secondary: '#DC2626',
        accent: '#F87171',
        background: { light: '#FFFFFF', dark: '#0F172A' },
        text: { light: '#1F2937', dark: '#F3F4F6' },
      },
      teal: {
        primary: '#14B8A6',
        secondary: '#0D9488',
        accent: '#2DD4BF',
        background: { light: '#FFFFFF', dark: '#0F172A' },
        text: { light: '#1F2937', dark: '#F3F4F6' },
      },
      pink: {
        primary: '#EC4899',
        secondary: '#DB2777',
        accent: '#F472B6',
        background: { light: '#FFFFFF', dark: '#0F172A' },
        text: { light: '#1F2937', dark: '#F3F4F6' },
      },
      gray: {
        primary: '#6B7280',
        secondary: '#4B5563',
        accent: '#9CA3AF',
        background: { light: '#FFFFFF', dark: '#0F172A' },
        text: { light: '#1F2937', dark: '#F3F4F6' },
      },
      default: {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        accent: '#60A5FA',
        background: { light: '#FFFFFF', dark: '#0F172A' },
        text: { light: '#1F2937', dark: '#F3F4F6' },
      },
    };
    
    // Convert scheme to lowercase to match database values
    const schemeKey = (scheme || 'blue').toLowerCase();
    return schemes[schemeKey] || schemes.blue;
  };

  const updateTheme = async (preferences: Partial<ThemePreferences>) => {
    try {
      const response = await fetch('/api/user/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(preferences),
      });
      
      if (response.ok) {
        const { preferences: updatedPreferences } = await response.json();
        setTheme(updatedPreferences);
      }
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  const exportTheme = async () => {
    try {
      const response = await fetch('/api/user/theme/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskmaster-theme-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export theme:', error);
    }
  };

  const importTheme = async (file: File) => {
    try {
      const text = await file.text();
      const response = await fetch('/api/user/theme/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeData: text }),
      });
      
      if (response.ok) {
        await loadThemePreferences();
      }
    } catch (error) {
      console.error('Failed to import theme:', error);
    }
  };

  const savePreset = async (name: string) => {
    try {
      const response = await fetch('/api/user/theme/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetName: name }),
      });
      
      if (response.ok) {
        await loadThemePreferences();
      }
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  };

  const loadPreset = async (name: string) => {
    try {
      const response = await fetch('/api/user/theme/presets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetName: name }),
      });
      
      if (response.ok) {
        await loadThemePreferences();
      }
    } catch (error) {
      console.error('Failed to load preset:', error);
    }
  };

  const deletePreset = async (name: string) => {
    try {
      const response = await fetch(`/api/user/theme/presets?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadThemePreferences();
      }
    } catch (error) {
      console.error('Failed to delete preset:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      isDark,
      updateTheme,
      exportTheme,
      importTheme,
      savePreset,
      loadPreset,
      deletePreset,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}