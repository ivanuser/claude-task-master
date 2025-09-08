import React, { useState } from 'react'

interface TaskExportProps {
  onExport: (format: 'csv' | 'json' | 'pdf') => void
}

export function TaskExport({ onExport }: TaskExportProps) {
  const [isOpen, setIsOpen] = useState(false)

  const exportOptions = [
    { value: 'csv' as const, label: 'CSV (.csv)', icon: '📊' },
    { value: 'json' as const, label: 'JSON (.json)', icon: '🔧' },
    { value: 'pdf' as const, label: 'PDF (.pdf)', icon: '📄' },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border z-50">
          <div className="py-2">
            <div className="px-4 py-2 text-sm font-medium text-foreground border-b border-border">
              Export Tasks
            </div>
            {exportOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onExport(option.value)
                  setIsOpen(false)
                }}
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent focus:bg-accent flex items-center gap-2"
              >
                <span>{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}