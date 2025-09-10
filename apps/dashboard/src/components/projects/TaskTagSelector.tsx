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
        <div className="h-10 bg-secondary rounded-md w-48"></div>
      </div>
    )
  }

  const selectedTag = showAll ? null : tags.find(t => t.name === currentTag)

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground border border-primary rounded-lg hover:bg-primary/90 transition-colors"
      >
        {showAll ? (
          <>
            <FolderIcon className="h-5 w-5" />
            <span className="font-medium">All Tags</span>
            <span className="text-sm opacity-80">({totalTasks} tasks)</span>
          </>
        ) : selectedTag ? (
          <>
            <HashtagIcon className="h-5 w-5" />
            <span className="font-medium">{selectedTag.name}</span>
            <span className="text-sm opacity-80">({selectedTag.taskCount} tasks)</span>
          </>
        ) : (
          <>
            <TagIcon className="h-5 w-5" />
            <span className="font-medium">Select Tag</span>
          </>
        )}
        <ChevronDownIcon className={cn(
          "h-4 w-4 opacity-80 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-80 bg-card rounded-lg shadow-lg border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Task Tags</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Organize tasks by context or branch
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* All Tags Option */}
            <button
              onClick={() => handleTagSelect('all')}
              className={cn(
                "w-full px-4 py-3 hover:bg-accent transition-colors text-left",
                showAll && "bg-primary/10"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FolderIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">All Tags</p>
                    <p className="text-xs text-muted-foreground">View all tasks across tags</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{totalTasks}</p>
                  <div className="flex items-center space-x-1">
                    <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 dark:bg-green-400 transition-all"
                        style={{ width: `${overallCompletion}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{overallCompletion}%</span>
                  </div>
                </div>
              </div>
            </button>

            <div className="border-t border-border">
              {tags.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <TagIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tags available</p>
                  <button
                    onClick={onCreateTag}
                    className="mt-3 text-sm text-primary hover:text-primary/80 font-medium"
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
                        "w-full px-4 py-3 hover:bg-accent transition-colors text-left",
                        currentTag === tag.name && !showAll && "bg-primary/10"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <HashtagIcon className={cn(
                            "h-5 w-5",
                            tag.isCurrent ? "text-primary" : "text-muted-foreground"
                          )} />
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-foreground">{tag.name}</p>
                              {tag.isCurrent && (
                                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                  Active
                                </span>
                              )}
                            </div>
                            {tag.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {tag.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{tag.taskCount}</p>
                          <div className="flex items-center space-x-1">
                            <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 dark:bg-green-400 transition-all"
                                style={{ width: `${completion}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{completion}%</span>
                          </div>
                        </div>
                      </div>
                      {currentTag === tag.name && !showAll && (
                        <CheckIcon className="h-4 w-4 text-primary absolute right-4" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {tags.length > 0 && (
            <div className="p-3 border-t border-border">
              <button
                onClick={() => {
                  setIsOpen(false)
                  onCreateTag?.()
                }}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
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