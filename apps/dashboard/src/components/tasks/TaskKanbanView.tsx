import React from 'react'
import { Task, Project } from '@/types'

interface TaskKanbanViewProps {
  tasks: Task[]
  projects?: Project[] | null
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
  onTaskMove: (taskId: string, updates: Partial<Task>) => void
}

export function TaskKanbanView({
  tasks,
  projects,
  onTaskUpdate,
  onTaskMove,
}: TaskKanbanViewProps) {
  const columns = [
    { id: 'pending', title: 'To Do', status: 'pending' as const },
    { id: 'in_progress', title: 'In Progress', status: 'in_progress' as const },
    { id: 'review', title: 'Review', status: 'review' as const },
    { id: 'done', title: 'Done', status: 'done' as const },
  ]

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => task.status === status)
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500'
      case 'high': return 'border-l-orange-500'
      case 'medium': return 'border-l-blue-500'
      case 'low': return 'border-l-gray-500'
      default: return 'border-l-gray-300'
    }
  }

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('application/json', JSON.stringify(task))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault()
    const taskData = e.dataTransfer.getData('application/json')
    if (taskData) {
      const task = JSON.parse(taskData) as Task
      if (task.status !== newStatus) {
        onTaskMove(task.id, { status: newStatus })
      }
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="flex gap-6 p-6 min-h-[600px] overflow-x-auto">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.status)
        
        return (
          <div key={column.id} className="flex-shrink-0 w-72">
            <div className="bg-secondary/50 dark:bg-secondary/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">{column.title}</h3>
                <span className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full">
                  {columnTasks.length}
                </span>
              </div>
              
              <div 
                className="space-y-3 min-h-[500px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.status)}
              >
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    className={`bg-card rounded-lg p-4 shadow-sm border-l-4 cursor-move hover:shadow-md transition-shadow ${getPriorityColor(task.priority)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-foreground line-clamp-2">
                        {task.title}
                      </h4>
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                        task.priority === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' :
                        task.priority === 'medium' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        'bg-secondary text-secondary-foreground'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      {task.projectName && (
                        <div className="text-xs text-muted-foreground">
                          📁 {task.projectName}
                        </div>
                      )}
                      
                      {task.dueDate && (
                        <div className="text-xs text-muted-foreground">
                          📅 {formatDate(task.dueDate)}
                        </div>
                      )}
                      
                      {task.assignedTo && (
                        <div className="text-xs text-muted-foreground">
                          👤 Assigned
                        </div>
                      )}
                    </div>
                    
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {task.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                            {tag}
                          </span>
                        ))}
                        {task.tags.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{task.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                    
                    {task.dependencies && task.dependencies.length > 0 && (
                      <div className="mt-2 text-xs text-amber-600">
                        🔗 {task.dependencies.length} dependencies
                      </div>
                    )}
                  </div>
                ))}
                
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-sm">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}