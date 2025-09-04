'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FilterOptions } from '@/app/dashboard/page';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

interface ProjectFiltersProps {
  filters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
  className?: string;
}

const statusOptions = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'paused', label: 'Paused', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-100 text-gray-800' },
];

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'lastActivity', label: 'Last Activity' },
  { value: 'taskCount', label: 'Task Count' },
  { value: 'completion', label: 'Completion' },
];

const ownershipOptions = [
  { value: 'all', label: 'All Projects' },
  { value: 'owned', label: 'Owned by Me' },
  { value: 'member', label: 'Member Of' },
];

export function ProjectFilters({ filters, onFilterChange, className = '' }: ProjectFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [availableTags] = useState(['frontend', 'backend', 'mobile', 'devops', 'ui-ux', 'api', 'database']);

  // Debounced search
  const debouncedSearch = useDebouncedCallback((value: string) => {
    onFilterChange({ search: value });
  }, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleStatusToggle = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFilterChange({ status: newStatus });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFilterChange({ tags: newTags });
  };

  const clearFilters = () => {
    setSearchValue('');
    onFilterChange({
      search: '',
      status: [],
      tags: [],
      ownership: 'all',
      sortBy: 'lastActivity',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters = 
    filters.search || 
    filters.status.length > 0 || 
    filters.tags.length > 0 || 
    filters.ownership !== 'all';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchValue}
              onChange={handleSearchChange}
              placeholder="Search projects by name or description..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchValue && (
              <button
                onClick={() => {
                  setSearchValue('');
                  onFilterChange({ search: '' });
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2">
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange({ sortBy: e.target.value as FilterOptions['sortBy'] })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                Sort by {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => onFilterChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title={`Sort ${filters.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            <span className="text-gray-600">
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </span>
          </button>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`inline-flex items-center px-4 py-2 border rounded-lg transition-colors ${
            showAdvancedFilters || hasActiveFilters
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {filters.status.length + filters.tags.length + (filters.ownership !== 'all' ? 1 : 0)}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          {/* Status Filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Project Status</h3>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(status => (
                <button
                  key={status.value}
                  onClick={() => handleStatusToggle(status.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.status.includes(status.value)
                      ? status.color
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status.label}
                  {filters.status.includes(status.value) && (
                    <span className="ml-2">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Ownership Filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Ownership</h3>
            <div className="flex flex-wrap gap-2">
              {ownershipOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => onFilterChange({ ownership: option.value as FilterOptions['ownership'] })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.ownership === option.value
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.tags.includes(tag)
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  #{tag}
                  {filters.tags.includes(tag) && (
                    <span className="ml-2">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}