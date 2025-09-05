'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  PlusIcon,
  ServerIcon,
  SignalIcon,
  ClockIcon,
  FolderIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface Server {
  id: string;
  name: string;
  description?: string;
  host: string;
  port: number;
  username: string;
  projectPath: string;
  status: string;
  lastPingAt?: string;
  isReachable: boolean;
  createdAt: string;
  updatedAt: string;
  projectCount: number;
  syncCount: number;
  projects: Array<{
    id: string;
    name: string;
    status: string;
    tag: string;
  }>;
}

interface ServerFormData {
  name: string;
  description: string;
  host: string;
  port: number;
  username: string;
  privateKey: string;
  projectPath: string;
}

export default function ServersPage() {
  const { data: session } = useSession();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState<ServerFormData>({
    name: '',
    description: '',
    host: '',
    port: 22,
    username: '',
    privateKey: '',
    projectPath: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const response = await fetch('/api/servers');
      if (response.ok) {
        const data = await response.json();
        setServers(data.servers || []);
      }
    } catch (error) {
      console.error('Error loading servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadServers();
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          description: '',
          host: '',
          port: 22,
          username: '',
          privateKey: '',
          projectPath: ''
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add server');
      }
    } catch (error) {
      setError('Failed to add server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (server: Server) => {
    if (server.status === 'active' && server.isReachable) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    } else if (server.status === 'active' && !server.isReachable) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    } else {
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = (server: Server) => {
    if (server.status === 'active' && server.isReachable) {
      return 'Active';
    } else if (server.status === 'active' && !server.isReachable) {
      return 'Unreachable';
    } else {
      return server.status.charAt(0).toUpperCase() + server.status.slice(1);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Servers</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage remote Task Master instances across your infrastructure
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-taskmaster-600 text-white rounded-md hover:bg-taskmaster-700 text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Server
        </button>
      </div>

      {/* Servers Grid */}
      {servers.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No servers</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first Task Master server.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-taskmaster-600 text-white rounded-md hover:bg-taskmaster-700 text-sm font-medium"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Server
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => (
            <div
              key={server.id}
              className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {server.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {server.description || `${server.username}@${server.host}:${server.port}`}
                  </p>
                  <div className="flex items-center text-sm text-gray-500">
                    {getStatusIcon(server)}
                    <span className="ml-1">{getStatusText(server)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <ServerIcon className="h-4 w-4 mr-2" />
                  <span className="font-mono">{server.host}:{server.port}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <FolderIcon className="h-4 w-4 mr-2" />
                  <span className="truncate">{server.projectPath}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center">
                    <SignalIcon className="h-4 w-4 mr-1" />
                    <span>{server.projectCount} projects</span>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    <span>{formatDate(server.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {server.projects.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-500 mb-2">Recent Projects</div>
                  <div className="space-y-1">
                    {server.projects.slice(0, 3).map((project) => (
                      <div key={project.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 truncate">{project.name}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                    ))}
                    {server.projects.length > 3 && (
                      <div className="text-xs text-gray-400">
                        +{server.projects.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end space-x-2">
                <button className="text-sm text-taskmaster-600 hover:text-taskmaster-700 font-medium">
                  Test Connection
                </button>
                <button className="text-sm text-taskmaster-600 hover:text-taskmaster-700 font-medium">
                  Sync Projects
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Server Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add Task Master Server</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Server Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="Production Server"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="Main production environment"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Host/IP Address *
                  </label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="192.168.1.100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SSH Port
                  </label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="22"
                    min="1"
                    max="65535"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SSH Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="ubuntu"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SSH Private Key
                </label>
                <textarea
                  value={formData.privateKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, privateKey: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  rows={4}
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use SSH agent or password authentication
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Path *
                </label>
                <input
                  type="text"
                  value={formData.projectPath}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectPath: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="/home/user/my-project"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Path to the project directory containing .taskmaster/ folder
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-taskmaster-600 text-white rounded hover:bg-taskmaster-700 disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? 'Adding...' : 'Add Server'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}