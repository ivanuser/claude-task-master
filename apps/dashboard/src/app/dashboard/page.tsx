'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ProjectGrid } from '@/components/dashboard/ProjectGrid';
import { ProjectList } from '@/components/dashboard/ProjectList';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ProjectFilters } from '@/components/dashboard/ProjectFilters';
import { useProjects } from '@/hooks/useProjects';
// import { useRealtimeSync } from '@/hooks/useRealtimeSync';
// import { RealtimeSyncGlobalIndicator } from '@/components/sync/RealtimeSyncIndicator';
import { SimpleConnectionStatus } from '@/components/sync/SimpleConnectionStatus';
import { Loader2 } from 'lucide-react';

export type ViewMode = 'grid' | 'list';

export interface FilterOptions {
  search: string;
  status: string[];
  tags: string[];
  ownership: 'all' | 'owned' | 'member';
  sortBy: 'name' | 'lastActivity' | 'taskCount' | 'completion';
  sortOrder: 'asc' | 'desc';
}

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: [],
    tags: [],
    ownership: 'all',
    sortBy: 'lastActivity',
    sortOrder: 'desc',
  });

  const { projects, isLoading, error, refetch } = useProjects(filters);
  // Removed useRealtimeSync to prevent infinite re-renders
  const initRef = useRef(false);

  // Initialize file watchers once on mount for projects with local paths
  useEffect(() => {
    if (initRef.current || !projects || projects.length === 0) return;
    initRef.current = true;
    
    // Start file watchers for projects with local paths
    projects.forEach(async (project) => {
      if (project.settings?.localPath) {
        try {
          const response = await fetch(`/api/projects/${project.id}/watch`, {
            method: 'POST',
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            console.log(`📁 File watcher started for ${project.name}:`, data);
          }
        } catch (error) {
          // Silently ignore errors for projects without access
        }
      }
    });
  }, [projects]); // Run once when projects load

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleProjectUpdate = () => {
    refetch();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Dashboard</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={refetch}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalProjects={projects?.length || 0}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Real-time Sync Indicator */}
        <div className="mb-6 flex justify-end">
          <SimpleConnectionStatus />
        </div>

        {/* Dashboard Statistics */}
        <DashboardStats projects={projects || []} className="mb-8" />

        {/* Filters and Search */}
        <ProjectFilters 
          filters={filters}
          onFilterChange={handleFilterChange}
          className="mb-6"
        />

        {/* Project Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading projects...</span>
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="transition-all duration-300">
            {viewMode === 'grid' ? (
              <ProjectGrid 
                projects={projects}
                onProjectUpdate={handleProjectUpdate}
              />
            ) : (
              <ProjectList 
                projects={projects}
                onProjectUpdate={handleProjectUpdate}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-card rounded-lg shadow-sm p-8">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-foreground">No projects found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {filters.search || filters.status.length > 0 || filters.tags.length > 0
                  ? 'Try adjusting your filters or search query.'
                  : 'Get started by creating your first project.'}
              </p>
              {(filters.search || filters.status.length > 0 || filters.tags.length > 0) && (
                <button
                  onClick={() => setFilters({
                    search: '',
                    status: [],
                    tags: [],
                    ownership: 'all',
                    sortBy: 'lastActivity',
                    sortOrder: 'desc',
                  })}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}