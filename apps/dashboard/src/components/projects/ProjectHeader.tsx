'use client';

import React from 'react';
import { Project } from '@/types/project';
import { GitBranch, Users, Calendar, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProjectHeaderProps {
  project: Project;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const getStatusColor = () => {
    if (project.status === 'active') return 'bg-green-100 text-green-800';
    if (project.status === 'paused') return 'bg-yellow-100 text-yellow-800';
    if (project.status === 'completed') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {project.name}
          </h1>
          <p className="text-gray-600">
            {project.description || 'No description provided'}
          </p>
        </div>

        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
          {project.status}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="flex items-center text-sm text-gray-600">
          <GitBranch className="w-4 h-4 mr-2 text-gray-400" />
          <span className="font-medium mr-2">Branch:</span>
          <span>{project.gitBranch || 'main'}</span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <Users className="w-4 h-4 mr-2 text-gray-400" />
          <span className="font-medium mr-2">Members:</span>
          <span>{project.memberCount || 1}</span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          <span className="font-medium mr-2">Last activity:</span>
          <span>
            {project.lastActivity
              ? formatDistanceToNow(new Date(project.lastActivity), { addSuffix: true })
              : 'Never'}
          </span>
        </div>

        {project.gitUrl && (
          <a
            href={project.gitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Repository
          </a>
        )}
      </div>

      {project.tags && project.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}