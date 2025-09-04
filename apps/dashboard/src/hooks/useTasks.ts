'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task';

interface UseTasksOptions {
  projectId: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useTasks(options: UseTasksOptions) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (options.status?.length) {
        options.status.forEach(s => params.append('status', s));
      }
      if (options.priority?.length) {
        options.priority.forEach(p => params.append('priority', p));
      }
      if (options.search) {
        params.append('search', options.search);
      }
      if (options.sortBy) {
        params.append('sortBy', options.sortBy);
      }
      if (options.sortOrder) {
        params.append('sortOrder', options.sortOrder);
      }

      const response = await fetch(`/api/projects/${options.projectId}/tasks?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      setTasks(data.tasks || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [options.projectId, options.status, options.priority, options.search, options.sortBy, options.sortOrder]);

  useEffect(() => {
    if (options.projectId) {
      fetchTasks();
    }
  }, [fetchTasks, options.projectId]);

  const createTask = async (task: Partial<Task>) => {
    try {
      const response = await fetch(`/api/projects/${options.projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      const newTask = await response.json();
      setTasks([...tasks, newTask]);
      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/projects/${options.projectId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      return updatedTask;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/projects/${options.projectId}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  };

  const bulkUpdateTasks = async (taskIds: string[], updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/projects/${options.projectId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds, updates }),
      });
      if (!response.ok) {
        throw new Error('Failed to bulk update tasks');
      }
      await fetchTasks(); // Refetch to get updated data
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    total,
    createTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    refetch: fetchTasks,
  };
}