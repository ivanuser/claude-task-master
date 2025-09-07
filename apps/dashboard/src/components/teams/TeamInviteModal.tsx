'use client'

import React, { useState } from 'react'
import { XMarkIcon, UserPlusIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TeamInviteModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function TeamInviteModal({
  projectId,
  isOpen,
  onClose,
  onSuccess
}: TeamInviteModalProps) {
  const [emails, setEmails] = useState('')
  const [role, setRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const emailList = emails
      .split(/[,\s]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0)

    if (emailList.length === 0) {
      toast.error('Please enter at least one email address')
      return
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emailList.filter(email => !emailRegex.test(email))
    
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email format: ${invalidEmails.join(', ')}`)
      return
    }

    setSending(true)
    let successCount = 0
    let failedEmails: string[] = []

    for (const email of emailList) {
      try {
        const response = await fetch(`/api/teams/${projectId}/invitations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            role,
            message: message.trim() || undefined,
          }),
        })

        if (response.ok) {
          successCount++
        } else {
          const error = await response.json()
          console.error(`Failed to invite ${email}:`, error)
          failedEmails.push(email)
        }
      } catch (error) {
        console.error(`Error inviting ${email}:`, error)
        failedEmails.push(email)
      }
    }

    setSending(false)

    if (successCount > 0) {
      toast.success(`Successfully sent ${successCount} invitation${successCount > 1 ? 's' : ''}`)
      setEmails('')
      setMessage('')
      setRole('MEMBER')
      onSuccess?.()
      
      if (failedEmails.length === 0) {
        onClose()
      }
    }

    if (failedEmails.length > 0) {
      toast.error(`Failed to invite: ${failedEmails.join(', ')}`)
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
                  <UserPlusIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">
                    Invite Team Members
                  </h3>
                  <p className="text-sm text-gray-500">
                    Send invitations to join the project
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
                  <label htmlFor="emails" className="block text-sm font-medium text-gray-700">
                    Email Addresses
                  </label>
                  <textarea
                    id="emails"
                    rows={3}
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-taskmaster-500 focus:ring-taskmaster-500 sm:text-sm"
                    placeholder="Enter email addresses separated by commas or new lines"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Example: john@example.com, jane@example.com
                  </p>
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-taskmaster-500 focus:ring-taskmaster-500 sm:text-sm"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Admins can manage team members and project settings
                  </p>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    id="message"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-taskmaster-500 focus:ring-taskmaster-500 sm:text-sm"
                    placeholder="Add a personal message to the invitation..."
                  />
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-2">Invitation Preview</p>
                  <div className="bg-white rounded border border-gray-200 p-3">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
                        <EnvelopeIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          You're invited to join a project
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          You've been invited to join as a {role.toLowerCase()}
                        </p>
                        {message && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                            {message}
                          </div>
                        )}
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
                {sending ? 'Sending...' : 'Send Invitations'}
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