'use client';

import React, { useState } from 'react';
import { X, CheckCircle, Clock, AlertCircle, Trash2, Tag } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onAction: (action: string, value?: any) => void;
  onClear: () => void;
}

export function BulkActionsBar({ selectedCount, onAction, onClear }: BulkActionsBarProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const statuses = [
    { value: 'pending', label: 'Pending', icon: Clock },
    { value: 'in-progress', label: 'In Progress', icon: Clock },
    { value: 'review', label: 'Review', icon: AlertCircle },
    { value: 'done', label: 'Done', icon: CheckCircle },
    { value: 'blocked', label: 'Blocked', icon: X },
    { value: 'deferred', label: 'Deferred', icon: Clock },
  ];

  const priorities = [
    { value: 'critical', label: 'Critical', color: 'text-red-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'low', label: 'Low', color: 'text-gray-500' },
  ];

  return (
    <div className="bg-blue-50 px-6 py-3 border-b border-blue-200 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-blue-900">
          {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
        </span>

        <div className="flex items-center space-x-2">
          {/* Update Status */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="inline-flex items-center px-3 py-1.5 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Update Status
            </button>

            {showStatusMenu && (
              <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
                {statuses.map((status) => {
                  const Icon = status.icon;
                  return (
                    <button
                      key={status.value}
                      onClick={() => {
                        onAction('status', status.value);
                        setShowStatusMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      <span className="flex items-center">
                        <Icon className="w-4 h-4 mr-2 text-gray-400" />
                        {status.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Update Priority */}
          <div className="relative">
            <button
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              className="inline-flex items-center px-3 py-1.5 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500"
            >
              <Tag className="w-4 h-4 mr-1.5" />
              Update Priority
            </button>

            {showPriorityMenu && (
              <div className="absolute z-10 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg">
                {priorities.map((priority) => (
                  <button
                    key={priority.value}
                    onClick={() => {
                      onAction('priority', priority.value);
                      setShowPriorityMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    <span className={`${priority.color} font-medium`}>
                      {priority.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete ${selectedCount} task(s)?`)) {
                onAction('delete');
              }
            }}
            className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-red-500"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </button>
        </div>
      </div>

      <button
        onClick={onClear}
        className="text-sm text-blue-700 hover:text-blue-900"
      >
        Clear selection
      </button>
    </div>
  );
}