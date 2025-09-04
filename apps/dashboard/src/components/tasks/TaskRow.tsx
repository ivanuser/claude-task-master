'use client';

import React, { useState } from 'react';
import { Task } from '@/types/task';
import { 
  ChevronRight, 
  ChevronDown, 
  Edit, 
  Trash2, 
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Pause
} from 'lucide-react';

interface TaskRowProps {
  task: Task;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: Task['status']) => void;
  level: number;
}

export function TaskRow({
  task,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onEdit,
  onDelete,
  onStatusChange,
  level,
}: TaskRowProps) {
  const [showActions, setShowActions] = useState(false);

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'review':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'blocked':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'deferred':
        return <Pause className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'deferred':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 font-bold';
      case 'high':
        return 'text-orange-600 font-semibold';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-gray-500';
      default:
        return 'text-gray-600';
    }
  };

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  return (
    <tr className={`hover:bg-gray-50 ${level > 0 ? 'bg-gray-50' : ''}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex items-center">
          {level > 0 && <span className="mr-2 text-gray-400">↳</span>}
          {task.id}
        </div>
      </td>
      
      <td className="px-6 py-4">
        <div className="flex items-start">
          {hasSubtasks && (
            <button
              onClick={onToggleExpand}
              className="mr-2 mt-0.5 text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {task.title}
            </div>
            {task.description && (
              <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                {task.description}
              </div>
            )}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="relative inline-block">
          <button
            onClick={() => setShowActions(!showActions)}
            className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}
          >
            {getStatusIcon(task.status)}
            <span className="ml-1.5">{task.status}</span>
          </button>
          
          {showActions && (
            <div className="absolute z-10 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg">
              {(['pending', 'in-progress', 'review', 'done', 'blocked', 'cancelled', 'deferred'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    onStatusChange(status);
                    setShowActions(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                    task.status === status ? 'bg-gray-50 font-semibold' : ''
                  }`}
                >
                  <span className="flex items-center">
                    {getStatusIcon(status)}
                    <span className="ml-2">{status}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`text-sm ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {task.dependencies.length > 0 ? (
          <span className="inline-flex items-center">
            {task.dependencies.slice(0, 2).join(', ')}
            {task.dependencies.length > 2 && (
              <span className="ml-1 text-gray-400">
                +{task.dependencies.length - 2}
              </span>
            )}
          </span>
        ) : (
          <span className="text-gray-400">None</span>
        )}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {hasSubtasks ? (
          <span className="inline-flex items-center">
            <span className="font-medium">{task.subtasks!.length}</span>
            <span className="ml-1 text-gray-400">
              ({task.subtasks!.filter(s => s.status === 'done').length} done)
            </span>
          </span>
        ) : (
          <span className="text-gray-400">None</span>
        )}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-900"
            title="Edit task"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-900"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}