'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  PlusIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CalendarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import BackButton from '@/components/ui/BackButton';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  gitUrl?: string;
  gitBranch?: string;
  updatedAt: string;
  totalTasks: number;
  memberCount: number;
  members: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      image: string;
    };
  }>;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any) => Promise<void>;
}

function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [tasksFilePath, setTasksFilePath] = useState('/home/ihoner/claude-task-master/.taskmaster/tasks/tasks.json');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAvailableTags();
    }
  }, [isOpen]);

  const loadAvailableTags = async () => {
    try {
      const response = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasksFilePath })
      });
      const data = await response.json();
      if (data.availableTags) {
        setAvailableTags(data.availableTags);
      }
    } catch (error) {
      setError('Failed to load available tags');
    }
  };

  const handleImport = async () => {
    if (!selectedTag) {
      setError('Please select a tag to import');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onImport({
        tagName: selectedTag,
        projectName: projectName || undefined,
        projectDescription: projectDescription || undefined,
        tasksFilePath
      });
      onClose();
      // Reset form
      setSelectedTag('');
      setProjectName('');
      setProjectDescription('');
    } catch (error) {
      setError('Failed to import project');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Import Task Master Project</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tasks File Path
            </label>
            <input
              type="text"
              value={tasksFilePath}
              onChange={(e) => setTasksFilePath(e.target.value)}
              onBlur={loadAvailableTags}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              placeholder="/path/to/tasks.json"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tag to Import *
            </label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              required
            >
              <option value="">Select a tag...</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name (optional)
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              placeholder="Will use tag name if empty"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Description (optional)
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              rows={3}
              placeholder="Brief description of the project"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isLoading || !selectedTag}
            className="px-4 py-2 bg-taskmaster-600 text-white rounded hover:bg-taskmaster-700 disabled:opacity-50 text-sm"
          >
            {isLoading ? 'Importing...' : 'Import Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (importData: any) => {
    try {
      const response = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Import successful:', result);
        await loadProjects(); // Reload projects
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-gray-100 text-gray-800';
      case 'ARCHIVED': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-taskmaster-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <BackButton href="/dashboard" label="Back to Dashboard" />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage and monitor all your Task Master projects
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Import Project
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-taskmaster-600 text-white rounded-md hover:bg-taskmaster-700 text-sm font-medium">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Project
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <ArrowDownTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No projects</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by importing a Task Master project.</p>
          <div className="mt-6">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-taskmaster-600 text-white rounded-md hover:bg-taskmaster-700 text-sm font-medium"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Import Project
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {project.description}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {formatDate(project.updatedAt)}
                </div>
                <div className="flex items-center">
                  <UserGroupIcon className="h-4 w-4 mr-1" />
                  {project.memberCount}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium text-gray-900">{project.totalTasks}</span>
                  <span className="text-gray-500"> tasks</span>
                </div>
                <div className="flex items-center text-sm text-taskmaster-600 hover:text-taskmaster-700">
                  <EyeIcon className="h-4 w-4 mr-1" />
                  View
                </div>
              </div>

              {project.gitUrl && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center text-xs text-gray-500">
                    <span className="truncate">{project.gitUrl}</span>
                    {project.gitBranch && (
                      <span className="ml-2 px-2 py-1 bg-gray-100 rounded">
                        {project.gitBranch}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}