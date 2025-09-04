'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { ProjectStats } from '@/components/projects/ProjectStats';
import { TaskEditModal } from '@/components/tasks/TaskEditModal';
import { BulkActionsBar } from '@/components/tasks/BulkActionsBar';
import { useProject } from '@/hooks/useProject';
import { useTasks } from '@/hooks/useTasks';
import { Task } from '@/types/task';
import { 
  ArrowLeft, 
  Plus, 
  RefreshCw, 
  Download, 
  Upload,
  Settings,
  GitBranch,
  Loader2
} from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { project, isLoading: projectLoading, error: projectError, refetch: refetchProject } = useProject(projectId);
  const { tasks, isLoading: tasksLoading, error: tasksError, refetch: refetchTasks, updateTask, createTask, deleteTask } = useTasks(projectId);

  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskFilters, setTaskFilters] = useState({
    search: '',
    status: [] as string[],
    priority: [] as string[],
    hasSubtasks: null as boolean | null,
    sortBy: 'id' as 'id' | 'title' | 'priority' | 'status' | 'dependencies',
    sortOrder: 'asc' as 'asc' | 'desc',
  });

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/sync`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await refetchProject();
        await refetchTasks();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTaskSelect = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === tasks?.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks?.map(t => t.id) || []));
    }
  };

  const handleBulkAction = async (action: string, value?: any) => {
    const taskIds = Array.from(selectedTasks);
    
    try {
      switch (action) {
        case 'status':
          await Promise.all(taskIds.map(id => updateTask(id, { status: value })));
          break;
        case 'priority':
          await Promise.all(taskIds.map(id => updateTask(id, { priority: value })));
          break;
        case 'delete':
          await Promise.all(taskIds.map(id => deleteTask(id)));
          break;
      }
      
      setSelectedTasks(new Set());
      await refetchTasks();
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const handleCreateTask = () => {
    setIsCreatingTask(true);
    setEditingTask({
      id: '',
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      dependencies: [],
      subtasks: [],
      details: '',
      testStrategy: '',
    } as Task);
  };

  const handleSaveTask = async (task: Task) => {
    try {
      if (task.id) {
        await updateTask(task.id, task);
      } else {
        await createTask(task);
      }
      
      setEditingTask(null);
      setIsCreatingTask(false);
      await refetchTasks();
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
        await refetchTasks();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  // Apply filters to tasks
  const filteredTasks = tasks?.filter(task => {
    if (taskFilters.search && !task.title.toLowerCase().includes(taskFilters.search.toLowerCase())) {
      return false;
    }
    if (taskFilters.status.length > 0 && !taskFilters.status.includes(task.status)) {
      return false;
    }
    if (taskFilters.priority.length > 0 && !taskFilters.priority.includes(task.priority)) {
      return false;
    }
    if (taskFilters.hasSubtasks !== null) {
      const hasSubtasks = task.subtasks && task.subtasks.length > 0;
      if (taskFilters.hasSubtasks !== hasSubtasks) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => {
    let aVal: any, bVal: any;
    
    switch (taskFilters.sortBy) {
      case 'title':
        aVal = a.title;
        bVal = b.title;
        break;
      case 'priority':
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        aVal = priorityOrder[a.priority as keyof typeof priorityOrder];
        bVal = priorityOrder[b.priority as keyof typeof priorityOrder];
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'dependencies':
        aVal = a.dependencies.length;
        bVal = b.dependencies.length;
        break;
      default:
        aVal = a.id;
        bVal = b.id;
    }

    if (taskFilters.sortOrder === 'desc') {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    } else {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }
  });

  if (projectError || tasksError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Project</h2>
          <p className="text-gray-600 mb-4">{projectError || tasksError}</p>
          <div className="flex space-x-4">
            <button
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => {
                refetchProject();
                refetchTasks();
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLoading = projectLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading project...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Dashboard
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">{project?.name}</span>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync
              </button>
              
              <Link
                href={`/projects/${projectId}/settings`}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Header */}
        <ProjectHeader project={project!} />

        {/* Project Statistics */}
        <ProjectStats 
          project={project!} 
          tasks={tasks || []}
          className="mb-8"
        />

        {/* Task Management Section */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Tasks ({filteredTasks?.length || 0})
              </h2>
              
              <button
                onClick={handleCreateTask}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </button>
            </div>
          </div>

          {/* Filters */}
          <TaskFilters
            filters={taskFilters}
            onFilterChange={setTaskFilters}
            className="px-6 py-4 border-b border-gray-200"
          />

          {/* Bulk Actions */}
          {selectedTasks.size > 0 && (
            <BulkActionsBar
              selectedCount={selectedTasks.size}
              onAction={handleBulkAction}
              onClear={() => setSelectedTasks(new Set())}
            />
          )}

          {/* Task List */}
          <TaskList
            tasks={filteredTasks || []}
            selectedTasks={selectedTasks}
            onTaskSelect={handleTaskSelect}
            onSelectAll={handleSelectAll}
            onTaskEdit={setEditingTask}
            onTaskDelete={handleDeleteTask}
            onTaskStatusChange={(taskId, status) => updateTask(taskId, { status })}
          />
        </div>
      </div>

      {/* Task Edit Modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          isCreating={isCreatingTask}
          onSave={handleSaveTask}
          onClose={() => {
            setEditingTask(null);
            setIsCreatingTask(false);
          }}
        />
      )}
    </div>
  );
}