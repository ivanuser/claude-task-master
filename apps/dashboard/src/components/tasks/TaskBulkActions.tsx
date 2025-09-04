import React, { useState } from 'react'
import { Task } from '@/types'

interface TaskBulkActionsProps {
  selectedCount: number
  onStatusChange: (status: Task['status']) => void
  onDelete: () => void
}

export function TaskBulkActions({ selectedCount, onStatusChange, onDelete }: TaskBulkActionsProps) {
  const [isOpen, setIsOpen] = useState(false)

  const statusOptions = [
    { value: 'pending' as const, label: 'Mark as Pending' },
    { value: 'in-progress' as const, label: 'Mark as In Progress' },
    { value: 'review' as const, label: 'Mark as Review' },
    { value: 'done' as const, label: 'Mark as Done' },
    { value: 'blocked' as const, label: 'Mark as Blocked' },
    { value: 'deferred' as const, label: 'Mark as Deferred' },
    { value: 'cancelled' as const, label: 'Mark as Cancelled' },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Bulk Actions ({selectedCount})
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-2">
            <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-100">
              {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
            </div>
            
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onStatusChange(option.value)
                  setIsOpen(false)
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50"
              >
                {option.label}
              </button>
            ))}
            
            <div className="border-t border-gray-100 mt-2 pt-2">
              <button
                onClick={() => {
                  onDelete()
                  setIsOpen(false)
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}