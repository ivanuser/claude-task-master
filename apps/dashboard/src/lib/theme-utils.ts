/**
 * Theme utility functions for dynamic styling based on theme context
 */

import { ColorScheme } from '@/types/theme';

// Map color schemes to Tailwind class prefixes
const colorSchemeMap: Record<ColorScheme | string, string> = {
  blue: 'blue',
  purple: 'purple',
  green: 'green',
  orange: 'orange',
  red: 'red',
  teal: 'teal',
  pink: 'pink',
  gray: 'gray',
  custom: 'primary',
  default: 'blue'
};

/**
 * Get dynamic button classes based on theme
 */
export function getButtonClasses(
  colorScheme: ColorScheme | string,
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary',
  size: 'sm' | 'md' | 'lg' = 'md',
  isDark: boolean = false
) {
  const color = colorSchemeMap[colorScheme] || 'blue';
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  const baseClasses = `${sizeClasses[size]} rounded-lg font-medium transition-all duration-200`;

  if (variant === 'primary') {
    if (colorScheme === 'custom') {
      // Use CSS variables for custom colors
      return `${baseClasses} bg-[hsl(var(--primary))] text-white hover:opacity-90 focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-opacity-50`;
    }
    return `${baseClasses} bg-${color}-600 text-white hover:bg-${color}-700 dark:bg-${color}-500 dark:hover:bg-${color}-600 focus:ring-2 focus:ring-${color}-500 focus:ring-opacity-50`;
  }

  if (variant === 'secondary') {
    if (colorScheme === 'custom') {
      return `${baseClasses} bg-[hsl(var(--secondary))] text-white hover:opacity-90 focus:ring-2 focus:ring-[hsl(var(--secondary))] focus:ring-opacity-50`;
    }
    return `${baseClasses} bg-${color}-100 text-${color}-700 hover:bg-${color}-200 dark:bg-${color}-900 dark:text-${color}-100 dark:hover:bg-${color}-800 focus:ring-2 focus:ring-${color}-500 focus:ring-opacity-50`;
  }

  if (variant === 'outline') {
    if (colorScheme === 'custom') {
      return `${baseClasses} border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-white focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-opacity-50`;
    }
    return `${baseClasses} border-2 border-${color}-600 text-${color}-600 hover:bg-${color}-600 hover:text-white dark:border-${color}-400 dark:text-${color}-400 dark:hover:bg-${color}-500 dark:hover:text-white focus:ring-2 focus:ring-${color}-500 focus:ring-opacity-50`;
  }

  // ghost variant
  if (colorScheme === 'custom') {
    return `${baseClasses} text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-opacity-50`;
  }
  return `${baseClasses} text-${color}-600 hover:bg-${color}-100 dark:text-${color}-400 dark:hover:bg-${color}-900 focus:ring-2 focus:ring-${color}-500 focus:ring-opacity-50`;
}

/**
 * Get dynamic badge classes based on theme
 */
export function getBadgeClasses(
  colorScheme: ColorScheme | string,
  variant: 'solid' | 'outline' = 'solid'
) {
  const color = colorSchemeMap[colorScheme] || 'blue';
  
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

  if (variant === 'solid') {
    if (colorScheme === 'custom') {
      return `${baseClasses} bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]`;
    }
    return `${baseClasses} bg-${color}-100 text-${color}-800 dark:bg-${color}-900 dark:text-${color}-100`;
  }

  // outline variant
  if (colorScheme === 'custom') {
    return `${baseClasses} border border-[hsl(var(--primary))] text-[hsl(var(--primary))]`;
  }
  return `${baseClasses} border border-${color}-600 text-${color}-600 dark:border-${color}-400 dark:text-${color}-400`;
}

/**
 * Get dynamic card classes based on theme
 */
export function getCardClasses(
  colorScheme: ColorScheme | string,
  variant: 'default' | 'bordered' | 'elevated' = 'default',
  isDark: boolean = false
) {
  const color = colorSchemeMap[colorScheme] || 'blue';
  
  const baseClasses = 'rounded-lg p-6';

  if (variant === 'default') {
    return `${baseClasses} bg-white dark:bg-gray-800`;
  }

  if (variant === 'bordered') {
    if (colorScheme === 'custom') {
      return `${baseClasses} bg-white dark:bg-gray-800 border-2 border-[hsl(var(--primary))]/20`;
    }
    return `${baseClasses} bg-white dark:bg-gray-800 border-2 border-${color}-200 dark:border-${color}-800`;
  }

  // elevated variant
  return `${baseClasses} bg-white dark:bg-gray-800 shadow-lg`;
}

/**
 * Get dynamic input classes based on theme
 */
export function getInputClasses(
  colorScheme: ColorScheme | string,
  error: boolean = false
) {
  const color = colorSchemeMap[colorScheme] || 'blue';
  
  const baseClasses = 'w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200';

  if (error) {
    return `${baseClasses} border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500 focus:ring-opacity-50`;
  }

  if (colorScheme === 'custom') {
    return `${baseClasses} border-gray-300 dark:border-gray-600 focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-opacity-50`;
  }

  return `${baseClasses} border-gray-300 dark:border-gray-600 focus:border-${color}-500 focus:ring-2 focus:ring-${color}-500 focus:ring-opacity-50`;
}

/**
 * Get dynamic switch/toggle classes based on theme
 */
export function getSwitchClasses(
  colorScheme: ColorScheme | string,
  checked: boolean = false
) {
  const color = colorSchemeMap[colorScheme] || 'blue';
  
  if (colorScheme === 'custom') {
    return checked 
      ? 'bg-[hsl(var(--primary))]' 
      : 'bg-gray-200 dark:bg-gray-700';
  }

  return checked 
    ? `bg-${color}-600 dark:bg-${color}-500` 
    : 'bg-gray-200 dark:bg-gray-700';
}

/**
 * Get dynamic link classes based on theme
 */
export function getLinkClasses(
  colorScheme: ColorScheme | string,
  variant: 'default' | 'underline' | 'hover' = 'default'
) {
  const color = colorSchemeMap[colorScheme] || 'blue';
  
  const baseClasses = 'transition-colors duration-200';

  if (colorScheme === 'custom') {
    if (variant === 'underline') {
      return `${baseClasses} text-[hsl(var(--primary))] underline hover:text-[hsl(var(--primary))]/80`;
    }
    if (variant === 'hover') {
      return `${baseClasses} text-gray-600 dark:text-gray-400 hover:text-[hsl(var(--primary))]`;
    }
    return `${baseClasses} text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]/80`;
  }

  if (variant === 'underline') {
    return `${baseClasses} text-${color}-600 dark:text-${color}-400 underline hover:text-${color}-700 dark:hover:text-${color}-300`;
  }
  
  if (variant === 'hover') {
    return `${baseClasses} text-gray-600 dark:text-gray-400 hover:text-${color}-600 dark:hover:text-${color}-400`;
  }

  return `${baseClasses} text-${color}-600 dark:text-${color}-400 hover:text-${color}-700 dark:hover:text-${color}-300`;
}

/**
 * Get dynamic text classes based on theme
 */
export function getTextClasses(
  colorScheme: ColorScheme | string,
  variant: 'primary' | 'secondary' | 'muted' | 'accent' = 'primary'
) {
  const color = colorSchemeMap[colorScheme] || 'blue';

  if (variant === 'primary') {
    return 'text-gray-900 dark:text-gray-100';
  }

  if (variant === 'secondary') {
    return 'text-gray-700 dark:text-gray-300';
  }

  if (variant === 'muted') {
    return 'text-gray-500 dark:text-gray-400';
  }

  // accent variant
  if (colorScheme === 'custom') {
    return 'text-[hsl(var(--primary))]';
  }
  return `text-${color}-600 dark:text-${color}-400`;
}

/**
 * Generate all required Tailwind classes for a color scheme
 * This ensures Tailwind includes these classes in the build
 */
export function generateColorClasses(color: string) {
  return {
    // Background colors
    bg: [
      `bg-${color}-50`,
      `bg-${color}-100`,
      `bg-${color}-200`,
      `bg-${color}-300`,
      `bg-${color}-400`,
      `bg-${color}-500`,
      `bg-${color}-600`,
      `bg-${color}-700`,
      `bg-${color}-800`,
      `bg-${color}-900`
    ],
    // Text colors
    text: [
      `text-${color}-50`,
      `text-${color}-100`,
      `text-${color}-200`,
      `text-${color}-300`,
      `text-${color}-400`,
      `text-${color}-500`,
      `text-${color}-600`,
      `text-${color}-700`,
      `text-${color}-800`,
      `text-${color}-900`
    ],
    // Border colors
    border: [
      `border-${color}-50`,
      `border-${color}-100`,
      `border-${color}-200`,
      `border-${color}-300`,
      `border-${color}-400`,
      `border-${color}-500`,
      `border-${color}-600`,
      `border-${color}-700`,
      `border-${color}-800`,
      `border-${color}-900`
    ],
    // Hover states
    hover: [
      `hover:bg-${color}-100`,
      `hover:bg-${color}-200`,
      `hover:bg-${color}-300`,
      `hover:bg-${color}-400`,
      `hover:bg-${color}-500`,
      `hover:bg-${color}-600`,
      `hover:bg-${color}-700`,
      `hover:bg-${color}-800`,
      `hover:bg-${color}-900`,
      `hover:text-${color}-300`,
      `hover:text-${color}-400`,
      `hover:text-${color}-500`,
      `hover:text-${color}-600`,
      `hover:text-${color}-700`
    ],
    // Focus states
    focus: [
      `focus:ring-${color}-500`,
      `focus:border-${color}-500`,
      `focus:border-${color}-600`
    ],
    // Dark mode
    dark: [
      `dark:bg-${color}-100`,
      `dark:bg-${color}-400`,
      `dark:bg-${color}-500`,
      `dark:bg-${color}-600`,
      `dark:bg-${color}-800`,
      `dark:bg-${color}-900`,
      `dark:text-${color}-100`,
      `dark:text-${color}-300`,
      `dark:text-${color}-400`,
      `dark:border-${color}-400`,
      `dark:border-${color}-800`,
      `dark:hover:bg-${color}-600`,
      `dark:hover:bg-${color}-800`,
      `dark:hover:text-${color}-300`
    ]
  };
}