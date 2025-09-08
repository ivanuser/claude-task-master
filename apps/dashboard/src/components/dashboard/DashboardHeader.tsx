'use client';

import React from 'react';
import { ViewMode } from '@/app/dashboard/page';
import { Grid, List, Plus } from 'lucide-react';
import Link from 'next/link';

interface DashboardHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalProjects: number;
}

export function DashboardHeader({ viewMode, onViewModeChange, totalProjects }: DashboardHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">Portfolio Dashboard</h1>
            <span className="ml-4 px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
              {totalProjects} {totalProjects === 1 ? 'project' : 'projects'}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`flex items-center px-3 py-1 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
                <span className="ml-2 text-sm font-medium hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`flex items-center px-3 py-1 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
                <span className="ml-2 text-sm font-medium hidden sm:inline">List</span>
              </button>
            </div>

            {/* New Project Button */}
            <Link
              href="/projects/new"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span>New Project</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}