'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  ChevronRightIcon, 
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import BackButton from '@/components/ui/BackButton';
import { TaskTagSelector } from '@/components/projects/TaskTagSelector';
import { TagManagementModal } from '@/components/projects/TagManagementModal';

interface Task {
  id: string;
  taskId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  complexity?: number;
  details?: string;
  testStrategy?: string;
  data: any;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  gitUrl?: string;
  gitBranch?: string;
  _count?: {
    tasks: number;
  };
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentTag, setCurrentTag] = useState<string>('all');
  const [showTagModal, setShowTagModal] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchProjectAndTasks();
    }
  }, [params.id, currentTag]);

  const fetchProjectAndTasks = async () => {
    try {
      // Fetch project details
      const projectRes = await fetch(`/api/projects/${params.id}`);
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData);
      }

      // Fetch tasks for this project with tag filter
      const tagParam = currentTag !== 'all' ? `?tag=${currentTag}` : '';
      const tasksRes = await fetch(`/api/projects/${params.id}/tasks${tagParam}`);
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTagChange = async (tag: string | 'all') => {
    setCurrentTag(tag);
    if (tag !== 'all' && tag !== currentTag) {
      // Switch the active tag in Task Master
      await fetch(`/api/projects/${params.id}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName: tag })
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DONE':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400';
      case 'IN_PROGRESS':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400';
      case 'BLOCKED':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400';
      case 'REVIEW':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'HIGH':
      case 'CRITICAL':
        return 'text-red-600 dark:text-red-400';
      case 'LOW':
        return 'text-gray-500 dark:text-gray-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DONE':
        return <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'IN_PROGRESS':
        return <ClockIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'BLOCKED':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default:
        return null;
    }
  };

  const filteredTasks = statusFilter === 'all' 
    ? tasks 
    : tasks.filter(task => task.status.toUpperCase() === statusFilter.toUpperCase());

  const taskStats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'DONE').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    blocked: tasks.filter(t => t.status === 'BLOCKED').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-taskmaster-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
        <button
          onClick={() => router.push('/projects')}
          className="text-taskmaster-600 hover:text-taskmaster-700"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <BackButton href="/projects" label="Back to Projects" className="mb-4" />
        
        <div className="bg-card rounded-lg shadow border border-border px-6 py-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">{project.name}</h1>
              <p className="text-muted-foreground">{project.description}</p>
            </div>
            
            {/* Tag Selector */}
            <TaskTagSelector
              projectId={params.id as string}
              currentTag={currentTag}
              onTagChange={handleTagChange}
              onCreateTag={() => setShowTagModal(true)}
              className="ml-4"
            />
          </div>
          
          {project.gitUrl && (
            <div className="flex items-center text-sm text-muted-foreground mb-4">
              <span className="mr-4">
                <strong>Repository:</strong> {project.gitUrl}
              </span>
              <span>
                <strong>Branch:</strong> {project.gitBranch || 'main'}
              </span>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-5 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{taskStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{taskStats.done}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{taskStats.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{taskStats.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{taskStats.blocked}</div>
              <div className="text-sm text-muted-foreground">Blocked</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{Math.round((taskStats.done / taskStats.total) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all"
                style={{ width: `${(taskStats.done / taskStats.total) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="-mb-px flex space-x-8">
          {['all', 'PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${statusFilter === status
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }
              `}
            >
              {status === 'all' ? 'All Tasks' : status.replace('_', ' ')}
              <span className="ml-2 text-muted-foreground">
                ({status === 'all' ? taskStats.total : 
                  tasks.filter(t => t.status === status).length})
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task List */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Tasks</h2>
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`
                  bg-card rounded-lg shadow border border-border p-4 cursor-pointer transition-all
                  ${selectedTask?.id === task.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      {getStatusIcon(task.status)}
                      <h3 className="ml-2 text-sm font-medium text-foreground">
                        Task {task.taskId}: {task.title}
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                    <div className="mt-2 flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority} Priority
                      </span>
                      {task.complexity && (
                        <span className="text-xs text-muted-foreground">
                          Complexity: {task.complexity}
                        </span>
                      )}
                      {task.data?.dependencies && task.data.dependencies.length > 0 && (
                        <span className="text-xs text-blue-600 dark:text-blue-400" title={`Depends on: ${task.data.dependencies.join(', ')}`}>
                          📌 {task.data.dependencies.length} dep{task.data.dependencies.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-muted-foreground ml-2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Detail */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Task Details</h2>
          {selectedTask ? (
            <div className="bg-card rounded-lg shadow border border-border p-6">
              <h3 className="text-lg font-medium text-foreground mb-2">
                Task {selectedTask.taskId}: {selectedTask.title}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground">Description</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedTask.description}</p>
                </div>

                {selectedTask.details && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Implementation Details</h4>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{selectedTask.details}</p>
                  </div>
                )}

                {selectedTask.testStrategy && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Test Strategy</h4>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{selectedTask.testStrategy}</p>
                  </div>
                )}

                {selectedTask.data?.subtasks && selectedTask.data.subtasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Subtasks</h4>
                    <div className="space-y-2">
                      {selectedTask.data.subtasks.map((subtask: any) => (
                        <div key={subtask.id} className="border-l-2 border-border pl-3">
                          <div className="flex items-center">
                            {subtask.status === 'done' ? (
                              <CheckCircleIcon className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-muted mr-2" />
                            )}
                            <span className={`text-sm ${subtask.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                              {subtask.id}: {subtask.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTask.data?.dependencies && selectedTask.data.dependencies.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Dependencies</h4>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedTask.data.dependencies.map((depId: number) => {
                        const depTask = tasks.find(t => t.data?.id === depId);
                        return (
                          <button
                            key={depId}
                            onClick={() => depTask && setSelectedTask(depTask)}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-800/30 text-blue-700 dark:text-blue-400 text-xs rounded cursor-pointer transition-colors"
                            title={depTask?.title || `Task ${depId}`}
                          >
                            Task {depId}: {depTask?.title || 'Unknown'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Show tasks that depend on this one */}
                {(() => {
                  const dependentTasks = tasks.filter(t => 
                    t.data?.dependencies && 
                    Array.isArray(t.data.dependencies) && 
                    t.data.dependencies.includes(selectedTask.data?.id)
                  );
                  return dependentTasks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground">Dependent Tasks</h4>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {dependentTasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 hover:bg-purple-200 dark:hover:bg-purple-800/30 text-purple-700 dark:text-purple-400 text-xs rounded cursor-pointer transition-colors"
                            title={task.title}
                          >
                            Task {task.data?.id}: {task.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow border border-border p-6 text-center text-muted-foreground">
              Select a task to view details
            </div>
          )}
        </div>
      </div>

      {/* Tag Management Modal */}
      <TagManagementModal
        projectId={params.id as string}
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        onSuccess={() => {
          setShowTagModal(false);
          fetchProjectAndTasks();
        }}
      />
    </div>
  );
}