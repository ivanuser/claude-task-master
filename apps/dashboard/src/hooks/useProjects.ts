import { useState, useEffect, useCallback } from 'react';
import { FilterOptions } from '@/app/dashboard/page';
import { Project } from '@/types/project';

interface UseProjectsReturn {
  projects: Project[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function useProjects(filters: FilterOptions): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchProjects = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        ownership: filters.ownership,
      });

      // Add array parameters
      filters.status.forEach(s => params.append('status', s));
      filters.tags.forEach(t => params.append('tags', t));

      const response = await fetch(`/api/projects?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      
      if (append && projects) {
        setProjects([...projects, ...data.projects]);
      } else {
        setProjects(data.projects);
      }
      
      setHasMore(data.hasMore);
      setPage(pageNum);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [filters, projects]);

  const refetch = useCallback(() => {
    fetchProjects(1, false);
  }, [fetchProjects]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchProjects(page + 1, true);
  }, [fetchProjects, hasMore, isLoading, page]);

  useEffect(() => {
    fetchProjects(1, false);
  }, [filters.search, filters.status, filters.tags, filters.ownership, filters.sortBy, filters.sortOrder]);

  // Apply client-side fuzzy search if needed
  const filteredProjects = projects ? applyFuzzySearch(projects, filters.search) : null;

  return {
    projects: filteredProjects,
    isLoading,
    error,
    refetch,
    hasMore,
    loadMore,
  };
}

// Simple fuzzy search implementation
function applyFuzzySearch(projects: Project[], searchTerm: string): Project[] {
  if (!searchTerm) return projects;

  const term = searchTerm.toLowerCase();
  
  return projects.filter(project => {
    const name = project.name.toLowerCase();
    const description = (project.description || '').toLowerCase();
    const tags = project.tags.join(' ').toLowerCase();
    
    // Direct match
    if (name.includes(term) || description.includes(term) || tags.includes(term)) {
      return true;
    }
    
    // Fuzzy match - check if all characters appear in order
    let searchIndex = 0;
    for (let i = 0; i < name.length && searchIndex < term.length; i++) {
      if (name[i] === term[searchIndex]) {
        searchIndex++;
      }
    }
    
    return searchIndex === term.length;
  });
}