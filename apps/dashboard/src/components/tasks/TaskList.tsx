'use client';

import React, { useState } from 'react';
import { Task } from '@/types/task';
import { TaskRow } from './TaskRow';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  selectedTasks: Set<string>;
  onTaskSelect: (taskId: string) => void;
  onSelectAll: () => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: Task['status']) => void;
}

export function TaskList({
  tasks,
  selectedTasks,
  onTaskSelect,
  onSelectAll,
  onTaskEdit,
  onTaskDelete,
  onTaskStatusChange,
}: TaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const allSelected = tasks.length > 0 && tasks.every(t => selectedTasks.has(t.id));
  const someSelected = tasks.some(t => selectedTasks.has(t.id));

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-4 text-sm font-medium text-gray-900">No tasks found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first task for this project.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Task
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Priority
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dependencies
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Subtasks
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tasks.map((task) => (
            <React.Fragment key={task.id}>
              <TaskRow
                task={task}
                isSelected={selectedTasks.has(task.id)}
                isExpanded={expandedTasks.has(task.id)}
                onSelect={() => onTaskSelect(task.id)}
                onToggleExpand={() => toggleExpanded(task.id)}
                onEdit={() => onTaskEdit(task)}
                onDelete={() => onTaskDelete(task.id)}
                onStatusChange={(status) => onTaskStatusChange(task.id, status)}
                level={0}
              />
              
              {/* Render subtasks if expanded */}
              {expandedTasks.has(task.id) && task.subtasks && task.subtasks.map((subtask) => (
                <TaskRow
                  key={subtask.id}
                  task={subtask}
                  isSelected={selectedTasks.has(subtask.id)}
                  isExpanded={expandedTasks.has(subtask.id)}
                  onSelect={() => onTaskSelect(subtask.id)}
                  onToggleExpand={() => toggleExpanded(subtask.id)}
                  onEdit={() => onTaskEdit(subtask)}
                  onDelete={() => onTaskDelete(subtask.id)}
                  onStatusChange={(status) => onTaskStatusChange(subtask.id, status)}
                  level={1}
                />
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}