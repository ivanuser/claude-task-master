'use client';

import React, { useEffect, useState } from 'react';
import { ViewMode } from '@/app/dashboard/page';
import { Grid, List, Plus, ShieldCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface DashboardHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalProjects: number;
}

export function DashboardHeader({ viewMode, onViewModeChange, totalProjects }: DashboardHeaderProps) {
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session?.user) {
        try {
          const response = await fetch('/api/admin/stats');
          setIsAdmin(response.ok && response.status !== 403);
        } catch {
          setIsAdmin(false);
        }
      }
    };
    
    checkAdminStatus();
  }, [session]);

  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-foreground">Portfolio Dashboard</h1>
            <span className="ml-4 px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full">
              {totalProjects} {totalProjects === 1 ? 'project' : 'projects'}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-muted rounded-lg p-1">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`flex items-center px-3 py-1 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
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
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
                <span className="ml-2 text-sm font-medium hidden sm:inline">List</span>
              </button>
            </div>

            {/* Admin Button */}
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors shadow-sm"
                title="Admin Dashboard"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

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