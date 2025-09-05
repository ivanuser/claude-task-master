'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  ChevronRightIcon, 
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

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

  useEffect(() => {
    if (params.id) {
      fetchProjectAndTasks();
    }
  }, [params.id]);

  const fetchProjectAndTasks = async () => {
    try {
      // Fetch project details
      const projectRes = await fetch(`/api/projects/${params.id}`);
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData);
      }

      // Fetch tasks for this project
      const tasksRes = await fetch(`/api/projects/${params.id}/tasks`);
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

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DONE':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'BLOCKED':
        return 'bg-red-100 text-red-800';
      case 'REVIEW':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'HIGH':
      case 'CRITICAL':
        return 'text-red-600';
      case 'LOW':
        return 'text-gray-500';
      default:
        return 'text-yellow-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DONE':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'IN_PROGRESS':
        return <ClockIcon className="h-5 w-5 text-blue-600" />;
      case 'BLOCKED':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
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
        <button
          onClick={() => router.push('/projects')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Projects
        </button>
        
        <div className="bg-white rounded-lg shadow px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
          <p className="text-gray-600 mb-4">{project.description}</p>
          
          {project.gitUrl && (
            <div className="flex items-center text-sm text-gray-500 mb-4">
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
              <div className="text-2xl font-bold text-gray-900">{taskStats.total}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{taskStats.done}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{taskStats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{taskStats.blocked}</div>
              <div className="text-sm text-gray-600">Blocked</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{Math.round((taskStats.done / taskStats.total) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${(taskStats.done / taskStats.total) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['all', 'PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${statusFilter === status
                  ? 'border-taskmaster-500 text-taskmaster-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {status === 'all' ? 'All Tasks' : status.replace('_', ' ')}
              <span className="ml-2 text-gray-400">
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
          <h2 className="text-lg font-semibold mb-4">Tasks</h2>
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`
                  bg-white rounded-lg shadow p-4 cursor-pointer transition-all
                  ${selectedTask?.id === task.id ? 'ring-2 ring-taskmaster-500' : 'hover:shadow-md'}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      {getStatusIcon(task.status)}
                      <h3 className="ml-2 text-sm font-medium text-gray-900">
                        Task {task.taskId}: {task.title}
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
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
                        <span className="text-xs text-gray-500">
                          Complexity: {task.complexity}
                        </span>
                      )}
                      {task.data?.dependencies && task.data.dependencies.length > 0 && (
                        <span className="text-xs text-blue-600" title={`Depends on: ${task.data.dependencies.join(', ')}`}>
                          📌 {task.data.dependencies.length} dep{task.data.dependencies.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Detail */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Task Details</h2>
          {selectedTask ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Task {selectedTask.taskId}: {selectedTask.title}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Description</h4>
                  <p className="mt-1 text-sm text-gray-600">{selectedTask.description}</p>
                </div>

                {selectedTask.details && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Implementation Details</h4>
                    <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{selectedTask.details}</p>
                  </div>
                )}

                {selectedTask.testStrategy && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Test Strategy</h4>
                    <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{selectedTask.testStrategy}</p>
                  </div>
                )}

                {selectedTask.data?.subtasks && selectedTask.data.subtasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Subtasks</h4>
                    <div className="space-y-2">
                      {selectedTask.data.subtasks.map((subtask: any) => (
                        <div key={subtask.id} className="border-l-2 border-gray-200 pl-3">
                          <div className="flex items-center">
                            {subtask.status === 'done' ? (
                              <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-gray-300 mr-2" />
                            )}
                            <span className={`text-sm ${subtask.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
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
                    <h4 className="text-sm font-medium text-gray-700">Dependencies</h4>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedTask.data.dependencies.map((depId: number) => {
                        const depTask = tasks.find(t => t.data?.id === depId);
                        return (
                          <button
                            key={depId}
                            onClick={() => depTask && setSelectedTask(depTask)}
                            className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs rounded cursor-pointer transition-colors"
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
                      <h4 className="text-sm font-medium text-gray-700">Dependent Tasks</h4>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {dependentTasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs rounded cursor-pointer transition-colors"
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
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              Select a task to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}