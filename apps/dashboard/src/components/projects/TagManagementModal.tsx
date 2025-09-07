'use client'

import React, { useState, useEffect } from 'react'
import { 
  XMarkIcon, 
  TagIcon, 
  PlusIcon,
  HashtagIcon,
  DocumentDuplicateIcon,
  CodeBranchIcon
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TaskTag {
  name: string
  taskCount: number
  completedCount: number
  description?: string
  isCurrent: boolean
  created: string
}

interface TagManagementModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function TagManagementModal({
  projectId,
  isOpen,
  onClose,
  onSuccess
}: TagManagementModalProps) {
  const [tagName, setTagName] = useState('')
  const [description, setDescription] = useState('')
  const [copyFromTag, setCopyFromTag] = useState<string>('')
  const [existingTags, setExistingTags] = useState<TaskTag[]>([])
  const [creating, setCreating] = useState(false)
  const [loadingTags, setLoadingTags] = useState(false)
  const [createFromBranch, setCreateFromBranch] = useState(false)

  const fetchTags = async () => {
    try {
      setLoadingTags(true)
      const response = await fetch(`/api/projects/${projectId}/tags`)
      if (response.ok) {
        const data = await response.json()
        setExistingTags(data.tags || [])
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    } finally {
      setLoadingTags(false)
    }
  }

  useEffect(() => {
    if (isOpen && projectId) {
      fetchTags()
    }
  }, [isOpen, projectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!tagName.trim()) {
      toast.error('Please provide a tag name')
      return
    }

    // Validate tag name (alphanumeric, hyphens, underscores)
    const tagRegex = /^[a-zA-Z0-9-_]+$/
    if (!tagRegex.test(tagName)) {
      toast.error('Tag name can only contain letters, numbers, hyphens, and underscores')
      return
    }

    setCreating(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tagName,
          description: description.trim() || undefined,
          copyFromTag: copyFromTag || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Tag "${tagName}" created successfully`)
        if (data.tasksCopied > 0) {
          toast.info(`Copied ${data.tasksCopied} tasks from "${copyFromTag}"`)
        }
        setTagName('')
        setDescription('')
        setCopyFromTag('')
        onSuccess?.()
        onClose()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create tag')
      }
    } catch (error: any) {
      console.error('Error creating tag:', error)
      toast.error(error.message || 'Failed to create tag')
    } finally {
      setCreating(false)
    }
  }

  const getCurrentBranch = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/git/branch`)
      if (response.ok) {
        const data = await response.json()
        return data.branch
      }
    } catch (error) {
      console.error('Failed to get current branch:', error)
    }
    return null
  }

  const handleCreateFromBranch = async () => {
    const branch = await getCurrentBranch()
    if (branch) {
      setTagName(branch)
      setDescription(`Tasks for ${branch} branch`)
      setCreateFromBranch(true)
    } else {
      toast.error('Could not determine current Git branch')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all sm:w-full sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-center mb-4">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-taskmaster-100 sm:mx-0 sm:h-10 sm:w-10">
                  <TagIcon className="h-6 w-6 text-taskmaster-600" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">
                    Create Task Tag
                  </h3>
                  <p className="text-sm text-gray-500">
                    Organize tasks by context, branch, or feature
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="tagName" className="block text-sm font-medium text-gray-700">
                    Tag Name
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                      <HashtagIcon className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      id="tagName"
                      value={tagName}
                      onChange={(e) => setTagName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      className="block w-full flex-1 rounded-none rounded-r-md border-gray-300 focus:border-taskmaster-500 focus:ring-taskmaster-500 sm:text-sm"
                      placeholder="feature-auth"
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Use lowercase letters, numbers, hyphens, and underscores
                  </p>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-taskmaster-500 focus:ring-taskmaster-500 sm:text-sm"
                    placeholder="Tasks for authentication feature implementation..."
                  />
                </div>

                {existingTags.length > 0 && (
                  <div>
                    <label htmlFor="copyFrom" className="block text-sm font-medium text-gray-700">
                      Copy Tasks From (Optional)
                    </label>
                    <select
                      id="copyFrom"
                      value={copyFromTag}
                      onChange={(e) => setCopyFromTag(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-taskmaster-500 focus:ring-taskmaster-500 sm:text-sm"
                    >
                      <option value="">Don't copy tasks</option>
                      {existingTags.map((tag) => (
                        <option key={tag.name} value={tag.name}>
                          {tag.name} ({tag.taskCount} tasks)
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Start with a copy of tasks from another tag
                    </p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Quick Actions</p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleCreateFromBranch}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <CodeBranchIcon className="h-4 w-4 text-gray-500" />
                        <span>Use current Git branch name</span>
                      </div>
                    </button>
                    
                    {existingTags.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const latestTag = existingTags.find(t => t.isCurrent) || existingTags[0]
                          setCopyFromTag(latestTag.name)
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <DocumentDuplicateIcon className="h-4 w-4 text-gray-500" />
                          <span>Copy from current tag</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Existing Tags */}
                {existingTags.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-2">Existing Tags</p>
                    <div className="space-y-1">
                      {existingTags.map((tag) => (
                        <div key={tag.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <HashtagIcon className="h-3 w-3 text-gray-400" />
                            <span className="font-medium">{tag.name}</span>
                            {tag.isCurrent && (
                              <span className="text-xs bg-taskmaster-100 text-taskmaster-700 px-1.5 py-0.5 rounded">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-gray-500">
                            {tag.taskCount} tasks
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={creating || !tagName.trim()}
                className={cn(
                  'inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto',
                  creating || !tagName.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-taskmaster-600 hover:bg-taskmaster-700'
                )}
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Tag
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}