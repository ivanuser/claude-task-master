'use client'

import React, { useState } from 'react'
import { XMarkIcon, MegaphoneIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TeamAnnouncementModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function TeamAnnouncementModal({
  projectId,
  isOpen,
  onClose,
  onSuccess
}: TeamAnnouncementModalProps) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !message.trim()) {
      toast.error('Please provide both title and message')
      return
    }

    setSending(true)
    try {
      const response = await fetch(`/api/teams/${projectId}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          message,
          priority,
        }),
      })

      if (response.ok) {
        toast.success('Announcement sent successfully')
        setTitle('')
        setMessage('')
        setPriority('HIGH')
        onSuccess?.()
        onClose()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send announcement')
      }
    } catch (error: any) {
      console.error('Error sending announcement:', error)
      toast.error(error.message || 'Failed to send announcement')
    } finally {
      setSending(false)
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
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <MegaphoneIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">
                    Send Team Announcement
                  </h3>
                  <p className="text-sm text-gray-500">
                    Broadcast a message to all team members
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
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-taskmaster-500 focus:ring-taskmaster-500 sm:text-sm"
                    placeholder="Important update..."
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-taskmaster-500 focus:ring-taskmaster-500 sm:text-sm"
                    placeholder="Share your announcement with the team..."
                    required
                  />
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-taskmaster-500 focus:ring-taskmaster-500 sm:text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-2">Preview</p>
                  <div className="bg-white rounded border border-gray-200 p-3">
                    <div className="flex items-start space-x-3">
                      <div className={cn(
                        'p-2 rounded-full flex-shrink-0',
                        priority === 'CRITICAL' ? 'bg-red-100' :
                        priority === 'HIGH' ? 'bg-orange-100' :
                        priority === 'MEDIUM' ? 'bg-yellow-100' :
                        'bg-blue-100'
                      )}>
                        <MegaphoneIcon className={cn(
                          'h-5 w-5',
                          priority === 'CRITICAL' ? 'text-red-600' :
                          priority === 'HIGH' ? 'text-orange-600' :
                          priority === 'MEDIUM' ? 'text-yellow-600' :
                          'text-blue-600'
                        )} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          📢 {title || 'Announcement Title'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {message || 'Your announcement message will appear here...'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={sending}
                className={cn(
                  'inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto',
                  sending
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-taskmaster-600 hover:bg-taskmaster-700'
                )}
              >
                {sending ? 'Sending...' : 'Send Announcement'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
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