'use client';

import React from 'react';
import { Search, Filter, X } from 'lucide-react';

interface TaskFiltersProps {
  filters: {
    search: string;
    status: string[];
    priority: string[];
    hasSubtasks: boolean | null;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  onFilterChange: (filters: any) => void;
  className?: string;
}

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'review', label: 'Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-800' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-800' },
  { value: 'deferred', label: 'Deferred', color: 'bg-gray-100 text-gray-600' },
];

const priorityOptions = [
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'low', label: 'Low', color: 'text-gray-500' },
];

const sortOptions = [
  { value: 'id', label: 'ID' },
  { value: 'title', label: 'Title' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'dependencies', label: 'Dependencies' },
];

export function TaskFilters({ filters, onFilterChange, className = '' }: TaskFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handleStatusToggle = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFilterChange({ ...filters, status: newStatus });
  };

  const handlePriorityToggle = (priority: string) => {
    const newPriority = filters.priority.includes(priority)
      ? filters.priority.filter(p => p !== priority)
      : [...filters.priority, priority];
    onFilterChange({ ...filters, priority: newPriority });
  };

  const handleSubtasksFilter = (value: boolean | null) => {
    onFilterChange({ ...filters, hasSubtasks: value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      status: [],
      priority: [],
      hasSubtasks: null,
      sortBy: 'id',
      sortOrder: 'asc',
    });
  };

  const hasActiveFilters = 
    filters.search || 
    filters.status.length > 0 || 
    filters.priority.length > 0 ||
    filters.hasSubtasks !== null;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2">
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                Sort by {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => onFilterChange({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title={`Sort ${filters.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            <span className="text-gray-600">
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </span>
          </button>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {/* Status Filters */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Status:</span>
          {statusOptions.map(status => (
            <button
              key={status.value}
              onClick={() => handleStatusToggle(status.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.status.includes(status.value)
                  ? status.color
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.label}
              {filters.status.includes(status.value) && (
                <span className="ml-1">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Priority Filters */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Priority:</span>
          {priorityOptions.map(priority => (
            <button
              key={priority.value}
              onClick={() => handlePriorityToggle(priority.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filters.priority.includes(priority.value)
                  ? `bg-gray-100 ${priority.color}`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {priority.label}
              {filters.priority.includes(priority.value) && (
                <span className="ml-1">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Subtasks Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Subtasks:</span>
          <button
            onClick={() => handleSubtasksFilter(filters.hasSubtasks === true ? null : true)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filters.hasSubtasks === true
                ? 'bg-purple-100 text-purple-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Has subtasks
          </button>
          <button
            onClick={() => handleSubtasksFilter(filters.hasSubtasks === false ? null : false)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filters.hasSubtasks === false
                ? 'bg-purple-100 text-purple-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            No subtasks
          </button>
        </div>
      </div>
    </div>
  );
}