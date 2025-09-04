'use client';

import React from 'react';
import { ProjectCard } from './ProjectCard';
import { Project } from '@/types/project';
import { RealtimeSyncState } from '@/hooks/useRealtimeSync';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Loader2 } from 'lucide-react';

interface ProjectGridProps {
  projects: Project[];
  onProjectUpdate: () => void;
  syncState: RealtimeSyncState;
  enableInfiniteScroll?: boolean;
  loadMore?: () => Promise<void>;
  hasMore?: boolean;
}

export function ProjectGrid({
  projects,
  onProjectUpdate,
  syncState,
  enableInfiniteScroll = true,
  loadMore,
  hasMore = false,
}: ProjectGridProps) {
  const { loadMoreRef, isLoadingMore } = useInfiniteScroll({
    enabled: enableInfiniteScroll && hasMore,
    onLoadMore: loadMore || (() => Promise.resolve()),
  });

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            isSyncing={syncState.syncStatuses.get(project.id)?.isRunning || false}
            lastSync={syncState.syncStatuses.get(project.id)?.lastSync || null}
            onUpdate={onProjectUpdate}
            className="h-full"
          />
        ))}
      </div>

      {/* Infinite Scroll Loader */}
      {enableInfiniteScroll && hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isLoadingMore && (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading more projects...</span>
            </>
          )}
        </div>
      )}
    </>
  );
}