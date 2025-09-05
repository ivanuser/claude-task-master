'use client'

import React, { useState, useEffect } from 'react'
import { Palette, Monitor, Sun, Moon, Contrast, Layout, Type } from 'lucide-react'

interface ThemeSettings {
  mode: 'light' | 'dark' | 'system'
  colorScheme: 'blue' | 'purple' | 'green' | 'orange' | 'red'
  density: 'comfortable' | 'compact' | 'spacious'
  fontSize: 'small' | 'medium' | 'large'
  borderRadius: 'none' | 'small' | 'medium' | 'large'
}

const colorSchemes = [
  { id: 'blue', name: 'Blue', color: 'bg-blue-600' },
  { id: 'purple', name: 'Purple', color: 'bg-purple-600' },
  { id: 'green', name: 'Green', color: 'bg-green-600' },
  { id: 'orange', name: 'Orange', color: 'bg-orange-600' },
  { id: 'red', name: 'Red', color: 'bg-red-600' },
]

const densityOptions = [
  { id: 'compact', name: 'Compact', description: 'More content, less spacing' },
  { id: 'comfortable', name: 'Comfortable', description: 'Balanced spacing and content' },
  { id: 'spacious', name: 'Spacious', description: 'More spacing, easier scanning' },
]

export function ThemeSection() {
  const [settings, setSettings] = useState<ThemeSettings>({
    mode: 'system',
    colorScheme: 'blue',
    density: 'comfortable',
    fontSize: 'medium',
    borderRadius: 'medium',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const savedSettings = localStorage.getItem('themeSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handleSettingChange = (key: keyof ThemeSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const applyTheme = () => {
    const root = document.documentElement
    
    // Apply theme mode
    if (settings.mode === 'dark' || (settings.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Apply color scheme CSS variables
    const colorMapping = {
      blue: { primary: '59 130 246', secondary: '37 99 235' },
      purple: { primary: '147 51 234', secondary: '126 34 206' },
      green: { primary: '34 197 94', secondary: '22 163 74' },
      orange: { primary: '249 115 22', secondary: '234 88 12' },
      red: { primary: '239 68 68', secondary: '220 38 38' },
    }

    const colors = colorMapping[settings.colorScheme]
    root.style.setProperty('--color-primary', colors.primary)
    root.style.setProperty('--color-primary-dark', colors.secondary)

    // Apply density
    const densityMapping = {
      compact: { spacing: '0.75rem', fontSize: '0.875rem' },
      comfortable: { spacing: '1rem', fontSize: '1rem' },
      spacious: { spacing: '1.5rem', fontSize: '1.125rem' },
    }

    const density = densityMapping[settings.density]
    root.style.setProperty('--spacing-base', density.spacing)

    // Apply font size
    const fontSizeMapping = {
      small: '14px',
      medium: '16px',
      large: '18px',
    }
    root.style.setProperty('--font-size-base', fontSizeMapping[settings.fontSize])

    // Apply border radius
    const borderRadiusMapping = {
      none: '0px',
      small: '4px',
      medium: '8px',
      large: '12px',
    }
    root.style.setProperty('--border-radius-base', borderRadiusMapping[settings.borderRadius])
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Save to localStorage
      localStorage.setItem('themeSettings', JSON.stringify(settings))
      
      // Apply theme
      applyTheme()

      // Simulate API call to save user preferences
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('Theme settings saved:', settings)
    } catch (error) {
      console.error('Failed to save theme settings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    applyTheme()
  }, [settings])

  return (
    <div className="p-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-lg font-medium text-gray-900">Appearance Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Customize the look and feel of your workspace.
        </p>
      </div>

      <div className="space-y-8">
        {/* Theme Mode */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Contrast className="w-5 h-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Theme Mode</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleSettingChange('mode', 'light')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                settings.mode === 'light'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Sun className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <p className="font-medium">Light</p>
              <p className="text-sm text-gray-500">Clean and bright</p>
            </button>

            <button
              onClick={() => handleSettingChange('mode', 'dark')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                settings.mode === 'dark'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Moon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="font-medium">Dark</p>
              <p className="text-sm text-gray-500">Easy on the eyes</p>
            </button>

            <button
              onClick={() => handleSettingChange('mode', 'system')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                settings.mode === 'system'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Monitor className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="font-medium">System</p>
              <p className="text-sm text-gray-500">Follows system setting</p>
            </button>
          </div>
        </div>

        {/* Color Scheme */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Palette className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Color Scheme</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {colorSchemes.map((scheme) => (
              <button
                key={scheme.id}
                onClick={() => handleSettingChange('colorScheme', scheme.id)}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  settings.colorScheme === scheme.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-full mx-auto mb-2 ${scheme.color}`}></div>
                <p className="text-sm font-medium">{scheme.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* UI Density */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Layout className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">UI Density</h3>
          </div>
          
          <div className="space-y-3">
            {densityOptions.map((option) => (
              <label
                key={option.id}
                className={`block p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  settings.density === option.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="density"
                  value={option.id}
                  checked={settings.density === option.id}
                  onChange={(e) => handleSettingChange('density', e.target.value)}
                  className="sr-only"
                />
                <div>
                  <p className="font-medium text-gray-900">{option.name}</p>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Type className="w-5 h-5 text-orange-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Typography</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
              <select
                value={settings.fontSize}
                onChange={(e) => handleSettingChange('fontSize', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="small">Small (14px)</option>
                <option value="medium">Medium (16px)</option>
                <option value="large">Large (18px)</option>
              </select>
            </div>

            {/* Border Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Border Radius</label>
              <select
                value={settings.borderRadius}
                onChange={(e) => handleSettingChange('borderRadius', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="none">None (Sharp corners)</option>
                <option value="small">Small (4px)</option>
                <option value="medium">Medium (8px)</option>
                <option value="large">Large (12px)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Sample Interface</h4>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">
                Primary Button
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              This is how your interface will look with the current theme settings. 
              You can see the color scheme, typography, and spacing applied.
            </p>
            <div className="flex space-x-2">
              <button className="px-3 py-1 border border-gray-300 rounded text-sm">
                Secondary
              </button>
              <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                Tertiary
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Applying Theme...
              </>
            ) : (
              <>
                <Palette className="w-4 h-4 mr-2" />
                Save Theme Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}