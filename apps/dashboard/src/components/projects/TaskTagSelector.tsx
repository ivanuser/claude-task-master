'use client'

import React, { useState, useEffect } from 'react'
import { 
  TagIcon, 
  PlusIcon, 
  CheckIcon,
  ChevronDownIcon,
  FolderIcon,
  HashtagIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface TaskTag {
  name: string
  taskCount: number
  completedCount: number
  description?: string
  isCurrent: boolean
  created: string
}

interface TaskTagSelectorProps {
  projectId: string
  currentTag: string
  onTagChange: (tag: string | 'all') => void
  onCreateTag?: () => void
  className?: string
}

export function TaskTagSelector({
  projectId,
  currentTag,
  onTagChange,
  onCreateTag,
  className
}: TaskTagSelectorProps) {
  const [tags, setTags] = useState<TaskTag[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const fetchTags = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/tags`)
      if (response.ok) {
        const data = await response.json()
        setTags(data.tags || [])
        setShowAll(currentTag === 'all')
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchTags()
    }
  }, [projectId])

  const handleTagSelect = (tagName: string | 'all') => {
    if (tagName === 'all') {
      setShowAll(true)
    } else {
      setShowAll(false)
    }
    onTagChange(tagName)
    setIsOpen(false)
  }

  const getCompletionPercentage = (tag: TaskTag) => {
    if (tag.taskCount === 0) return 0
    return Math.round((tag.completedCount / tag.taskCount) * 100)
  }

  const totalTasks = tags.reduce((sum, tag) => sum + tag.taskCount, 0)
  const totalCompleted = tags.reduce((sum, tag) => sum + tag.completedCount, 0)
  const overallCompletion = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0

  if (loading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-10 bg-gray-200 rounded-md w-48"></div>
      </div>
    )
  }

  const selectedTag = showAll ? null : tags.find(t => t.name === currentTag)

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        {showAll ? (
          <>
            <FolderIcon className="h-5 w-5 text-gray-500" />
            <span className="font-medium">All Tags</span>
            <span className="text-sm text-gray-500">({totalTasks} tasks)</span>
          </>
        ) : selectedTag ? (
          <>
            <HashtagIcon className="h-5 w-5 text-taskmaster-500" />
            <span className="font-medium">{selectedTag.name}</span>
            <span className="text-sm text-gray-500">({selectedTag.taskCount} tasks)</span>
          </>
        ) : (
          <>
            <TagIcon className="h-5 w-5 text-gray-500" />
            <span className="font-medium">Select Tag</span>
          </>
        )}
        <ChevronDownIcon className={cn(
          "h-4 w-4 text-gray-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Task Tags</h3>
            <p className="text-xs text-gray-500 mt-1">
              Organize tasks by context or branch
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* All Tags Option */}
            <button
              onClick={() => handleTagSelect('all')}
              className={cn(
                "w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left",
                showAll && "bg-taskmaster-50"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FolderIcon className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">All Tags</p>
                    <p className="text-xs text-gray-500">View all tasks across tags</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{totalTasks}</p>
                  <div className="flex items-center space-x-1">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${overallCompletion}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{overallCompletion}%</span>
                  </div>
                </div>
              </div>
            </button>

            <div className="border-t border-gray-100">
              {tags.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <TagIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No tags available</p>
                  <button
                    onClick={onCreateTag}
                    className="mt-3 text-sm text-taskmaster-600 hover:text-taskmaster-700 font-medium"
                  >
                    Create first tag
                  </button>
                </div>
              ) : (
                tags.map((tag) => {
                  const completion = getCompletionPercentage(tag)
                  return (
                    <button
                      key={tag.name}
                      onClick={() => handleTagSelect(tag.name)}
                      className={cn(
                        "w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left",
                        currentTag === tag.name && !showAll && "bg-taskmaster-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <HashtagIcon className={cn(
                            "h-5 w-5",
                            tag.isCurrent ? "text-taskmaster-500" : "text-gray-400"
                          )} />
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">{tag.name}</p>
                              {tag.isCurrent && (
                                <span className="text-xs bg-taskmaster-100 text-taskmaster-700 px-1.5 py-0.5 rounded">
                                  Active
                                </span>
                              )}
                            </div>
                            {tag.description && (
                              <p className="text-xs text-gray-500 truncate max-w-[180px]">
                                {tag.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{tag.taskCount}</p>
                          <div className="flex items-center space-x-1">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 transition-all"
                                style={{ width: `${completion}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{completion}%</span>
                          </div>
                        </div>
                      </div>
                      {currentTag === tag.name && !showAll && (
                        <CheckIcon className="h-4 w-4 text-taskmaster-600 absolute right-4" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {tags.length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsOpen(false)
                  onCreateTag?.()
                }}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-taskmaster-600 hover:bg-taskmaster-50 rounded-md transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Create New Tag</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}