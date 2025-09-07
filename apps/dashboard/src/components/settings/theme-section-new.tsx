'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Palette, Monitor, Sun, Moon, Contrast, Layout, Type, 
  Download, Upload, Save, Trash2, Eye, EyeOff, Sliders,
  Check, ChevronDown, Loader2
} from 'lucide-react'
import { useTheme } from '@/providers/theme-provider'
import { toast } from 'sonner'
import {
  getButtonClasses,
  getBadgeClasses,
  getCardClasses,
  getInputClasses,
  getSwitchClasses,
  getTextClasses
} from '@/lib/theme-utils'
// Define types inline to avoid import issues
type ThemeMode = 'light' | 'dark' | 'system' | 'auto';
type ColorScheme = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal' | 'pink' | 'gray' | 'custom';
type UIDensity = 'comfortable' | 'compact' | 'spacious';  
type FontSize = 'small' | 'medium' | 'large' | 'extraLarge';
type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

// Map for color scheme to Tailwind color names
const colorSchemeMap: Record<string, string> = {
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

const colorSchemes = [
  { id: 'blue' as ColorScheme, name: 'Blue', color: '#3B82F6' },
  { id: 'purple' as ColorScheme, name: 'Purple', color: '#8B5CF6' },
  { id: 'green' as ColorScheme, name: 'Green', color: '#10B981' },
  { id: 'orange' as ColorScheme, name: 'Orange', color: '#F97316' },
  { id: 'red' as ColorScheme, name: 'Red', color: '#EF4444' },
  { id: 'teal' as ColorScheme, name: 'Teal', color: '#14B8A6' },
  { id: 'pink' as ColorScheme, name: 'Pink', color: '#EC4899' },
  { id: 'gray' as ColorScheme, name: 'Gray', color: '#6B7280' },
  { id: 'custom' as ColorScheme, name: 'Custom', color: 'linear-gradient(45deg, #3B82F6, #8B5CF6)' },
]

const densityOptions = [
  { id: 'compact' as UIDensity, name: 'Compact', description: 'More content, less spacing' },
  { id: 'comfortable' as UIDensity, name: 'Comfortable', description: 'Balanced spacing' },
  { id: 'spacious' as UIDensity, name: 'Spacious', description: 'More breathing room' },
]

const fontSizes = [
  { id: 'small' as FontSize, name: 'Small', size: '14px' },
  { id: 'medium' as FontSize, name: 'Medium', size: '16px' },
  { id: 'large' as FontSize, name: 'Large', size: '18px' },
  { id: 'extraLarge' as FontSize, name: 'Extra Large', size: '20px' },
]

const borderRadiusOptions = [
  { id: 'small', name: 'Small', value: '0.25rem' },
  { id: 'medium', name: 'Medium', value: '0.375rem' },
  { id: 'large', name: 'Large', value: '0.5rem' },
  { id: 'xl', name: 'Extra Large', value: '0.75rem' },
]

const shadowOptions = [
  { id: 'none', name: 'None' },
  { id: 'light', name: 'Light' },
  { id: 'medium', name: 'Medium' },
  { id: 'heavy', name: 'Heavy' },
]

const colorBlindModes = [
  { id: null, name: 'None', description: 'No color adjustment' },
  { id: 'protanopia' as ColorBlindMode, name: 'Protanopia', description: 'Red-blind' },
  { id: 'deuteranopia' as ColorBlindMode, name: 'Deuteranopia', description: 'Green-blind' },
  { id: 'tritanopia' as ColorBlindMode, name: 'Tritanopia', description: 'Blue-blind' },
  { id: 'achromatopsia' as ColorBlindMode, name: 'Achromatopsia', description: 'Total color blindness' },
]

export function ThemeSectionNew() {
  const { theme, isDark, updateTheme, exportTheme, importTheme, savePreset, loadPreset, deletePreset } = useTheme()
  const [loading, setLoading] = useState(false)
  const [showCustomColors, setShowCustomColors] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [showPresets, setShowPresets] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleThemeChange = async (key: string, value: any) => {
    setLoading(true)
    try {
      await updateTheme({ [key]: value })
      toast.success('Theme updated')
    } catch (error) {
      toast.error('Failed to update theme')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      await exportTheme()
      toast.success('Theme exported successfully')
    } catch (error) {
      toast.error('Failed to export theme')
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        await importTheme(file)
        toast.success('Theme imported successfully')
      } catch (error) {
        toast.error('Failed to import theme')
      }
    }
  }

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast.error('Please enter a preset name')
      return
    }
    
    try {
      await savePreset(presetName)
      toast.success(`Preset "${presetName}" saved`)
      setPresetName('')
    } catch (error) {
      toast.error('Failed to save preset')
    }
  }

  const handleLoadPreset = async (name: string) => {
    try {
      await loadPreset(name)
      toast.success(`Preset "${name}" loaded`)
    } catch (error) {
      toast.error('Failed to load preset')
    }
  }

  const handleDeletePreset = async (name: string) => {
    if (!confirm(`Delete preset "${name}"?`)) return
    
    try {
      await deletePreset(name)
      toast.success(`Preset "${name}" deleted`)
    } catch (error) {
      toast.error('Failed to delete preset')
    }
  }

  if (!theme) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const savedThemes = (theme.savedThemes as any[]) || []

  return (
    <div className="p-6 space-y-8">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-medium text-gray-900">Theme & Appearance</h2>
        <p className="text-sm text-gray-500 mt-1">
          Customize the look and feel of your dashboard
        </p>
      </div>

      {/* Theme Mode */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Monitor className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium">Theme Mode</h3>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { id: 'light' as ThemeMode, name: 'Light', icon: Sun },
            { id: 'dark' as ThemeMode, name: 'Dark', icon: Moon },
            { id: 'system' as ThemeMode, name: 'System', icon: Monitor },
            { id: 'auto' as ThemeMode, name: 'Auto', icon: Sliders },
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => handleThemeChange('mode', mode.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                theme.mode === mode.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
              style={theme.mode === mode.id ? {
                borderColor: `hsl(var(--primary))`,
                backgroundColor: `hsl(var(--primary) / 0.1)`
              } : {}}
            >
              <mode.icon className="h-6 w-6 mx-auto mb-2" />
              <div className="text-sm font-medium">{mode.name}</div>
              {mode.id === 'auto' && (
                <div className="text-xs text-gray-500 mt-1">6pm-6am</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Color Scheme */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium">Color Scheme</h3>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {colorSchemes.map(scheme => (
            <button
              key={scheme.id}
              onClick={() => {
                handleThemeChange('colorScheme', scheme.id)
                if (scheme.id === 'custom') {
                  setShowCustomColors(true)
                }
              }}
              className={`p-3 rounded-lg border-2 transition-all ${
                theme.colorScheme === scheme.id
                  ? 'border-gray-900 shadow-lg dark:border-gray-100'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
              style={theme.colorScheme === scheme.id ? {
                borderColor: `hsl(var(--primary))`,
                boxShadow: `0 10px 15px -3px hsl(var(--primary) / 0.1)`
              } : {}}
            >
              <div
                className="h-8 w-full rounded mb-2"
                style={{
                  background: scheme.id === 'custom' ? scheme.color : scheme.color,
                  backgroundColor: scheme.id !== 'custom' ? scheme.color : undefined,
                }}
              />
              <div className="text-sm font-medium">{scheme.name}</div>
            </button>
          ))}
        </div>

        {/* Custom Colors */}
        {(showCustomColors || theme.colorScheme === 'custom') && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <h4 className="font-medium text-sm">Custom Colors</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'customPrimary', label: 'Primary' },
                { key: 'customSecondary', label: 'Secondary' },
                { key: 'customAccent', label: 'Accent' },
                { key: 'customBackground', label: 'Background' },
                { key: 'customText', label: 'Text' },
              ].map(color => (
                <div key={color.key}>
                  <label className="text-sm text-gray-600">{color.label}</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={(theme as any)[color.key] || '#000000'}
                      onChange={(e) => handleThemeChange(color.key, e.target.value)}
                      className="h-10 w-full rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={(theme as any)[color.key] || ''}
                      onChange={(e) => handleThemeChange(color.key, e.target.value)}
                      placeholder="#000000"
                      className="flex-1 px-2 py-1 text-sm border rounded"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* UI Density */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Layout className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium">UI Density</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {densityOptions.map(option => (
            <button
              key={option.id}
              onClick={() => handleThemeChange('density', option.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                theme.density === option.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
              style={theme.density === option.id ? {
                borderColor: `hsl(var(--primary))`,
                backgroundColor: `hsl(var(--primary) / 0.1)`
              } : {}}
            >
              <div className="font-medium text-sm">{option.name}</div>
              <div className="text-xs text-gray-500 mt-1">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Type className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium">Font Size</h3>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {fontSizes.map(size => (
            <button
              key={size.id}
              onClick={() => handleThemeChange('fontSize', size.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                theme.fontSize === size.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
              style={theme.fontSize === size.id ? {
                borderColor: `hsl(var(--primary))`,
                backgroundColor: `hsl(var(--primary) / 0.1)`
              } : {}}
            >
              <div className="font-medium" style={{ fontSize: size.size }}>Aa</div>
              <div className="text-xs text-gray-500 mt-1">{size.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Accessibility */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Contrast className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium">Accessibility</h3>
        </div>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <div className="font-medium text-sm">High Contrast</div>
              <div className="text-xs text-gray-500">Increase contrast for better visibility</div>
            </div>
            <input
              type="checkbox"
              checked={theme.highContrast}
              onChange={(e) => handleThemeChange('highContrast', e.target.checked)}
              className="h-5 w-5"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <div className="font-medium text-sm">Reduced Motion</div>
              <div className="text-xs text-gray-500">Minimize animations and transitions</div>
            </div>
            <input
              type="checkbox"
              checked={theme.reducedMotion}
              onChange={(e) => handleThemeChange('reducedMotion', e.target.checked)}
              className="h-5 w-5"
            />
          </label>

          <div>
            <label className="text-sm font-medium">Color Blind Mode</label>
            <select
              value={theme.colorBlindMode || ''}
              onChange={(e) => handleThemeChange('colorBlindMode', e.target.value || null)}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            >
              {colorBlindModes.map(mode => (
                <option key={mode.id || 'none'} value={mode.id || ''}>
                  {mode.name} {mode.description && `- ${mode.description}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="space-y-4">
        <h3 className="font-medium">Advanced Settings</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Border Radius</label>
            <select
              value={theme.borderRadius || 'medium'}
              onChange={(e) => handleThemeChange('borderRadius', e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            >
              {borderRadiusOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Shadow Intensity</label>
            <select
              value={theme.shadowIntensity || 'medium'}
              onChange={(e) => handleThemeChange('shadowIntensity', e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            >
              {shadowOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
          <div>
            <div className="font-medium text-sm">Enable Animations</div>
            <div className="text-xs text-gray-500">Show animations and transitions</div>
          </div>
          <input
            type="checkbox"
            checked={theme.animations}
            onChange={(e) => handleThemeChange('animations', e.target.checked)}
            className="h-5 w-5"
          />
        </label>
      </div>

      {/* Theme Presets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Theme Presets</h3>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className={theme.colorScheme === 'custom' 
              ? 'text-sm text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]/80'
              : `text-sm text-${colorSchemeMap[theme.colorScheme] || 'blue'}-600 hover:text-${colorSchemeMap[theme.colorScheme] || 'blue'}-700 dark:text-${colorSchemeMap[theme.colorScheme] || 'blue'}-400 dark:hover:text-${colorSchemeMap[theme.colorScheme] || 'blue'}-300`}
          >
            {showPresets ? 'Hide' : 'Show'} Presets
          </button>
        </div>

        {showPresets && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Enter preset name"
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                style={{
                  backgroundColor: `hsl(var(--primary))`,
                }}
              >
                <Save className="h-4 w-4" />
              </button>
            </div>

            {savedThemes.length > 0 && (
              <div className="space-y-2">
                {savedThemes.map((preset: any) => (
                  <div key={preset.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{preset.name}</div>
                      <div className="text-xs text-gray-500">
                        Saved {new Date(preset.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadPreset(preset.name)}
                        className={theme.colorScheme === 'custom'
                          ? 'p-2 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 rounded'
                          : `p-2 text-${colorSchemeMap[theme.colorScheme] || 'blue'}-600 hover:bg-${colorSchemeMap[theme.colorScheme] || 'blue'}-50 dark:text-${colorSchemeMap[theme.colorScheme] || 'blue'}-400 dark:hover:bg-${colorSchemeMap[theme.colorScheme] || 'blue'}-900 rounded`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePreset(preset.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import/Export */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          <Download className="h-4 w-4" />
          Export Theme
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          <Upload className="h-4 w-4" />
          Import Theme
        </button>
      </div>
    </div>
  )
}