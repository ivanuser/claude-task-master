import React from 'react'

interface ViewToggleOption {
  value: string
  icon: string
  label: string
}

interface ViewToggleProps {
  value: string
  onChange: (value: string) => void
  options: ViewToggleOption[]
}

export function ViewToggle({ value, onChange, options }: ViewToggleProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'list':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        )
      case 'kanban':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        )
      case 'timeline':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white">
      {options.map((option, index) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors
            ${index === 0 ? 'rounded-l-lg' : ''}
            ${index === options.length - 1 ? 'rounded-r-lg' : ''}
            ${value === option.value
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'text-gray-700 hover:bg-gray-50'
            }
          `}
          title={option.label}
        >
          {getIcon(option.icon)}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  )
}