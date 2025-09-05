'use client'

import React, { useState } from 'react'
import { Key, Plus, Copy, Eye, EyeOff, Calendar, Trash2, Edit2 } from 'lucide-react'

interface APIKey {
  id: string
  name: string
  key: string
  maskedKey: string
  scopes: string[]
  createdAt: string
  expiresAt?: string
  lastUsed?: string
  usage: number
  isActive: boolean
}

const availableScopes = [
  { id: 'read', name: 'Read Access', description: 'View projects and tasks' },
  { id: 'write', name: 'Write Access', description: 'Create and update content' },
  { id: 'delete', name: 'Delete Access', description: 'Delete projects and tasks' },
  { id: 'team:manage', name: 'Team Management', description: 'Manage team members and settings' },
  { id: 'analytics:read', name: 'Analytics', description: 'Access analytics and reports' },
  { id: 'integrations:manage', name: 'Integrations', description: 'Configure third-party integrations' },
]

export function APIKeySection() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: '1',
      name: 'Task Master CLI',
      key: 'tm_1234567890abcdef1234567890abcdef',
      maskedKey: 'tm_12345...cdef',
      scopes: ['read', 'write'],
      createdAt: '2024-01-15T10:00:00Z',
      expiresAt: '2025-01-15T10:00:00Z',
      lastUsed: '2024-01-20T14:30:00Z',
      usage: 1250,
      isActive: true,
    },
    {
      id: '2',
      name: 'CI/CD Pipeline',
      key: 'tm_abcdef1234567890abcdef1234567890',
      maskedKey: 'tm_abcde...7890',
      scopes: ['read', 'write', 'analytics:read'],
      createdAt: '2024-01-10T08:00:00Z',
      lastUsed: '2024-01-19T09:15:00Z',
      usage: 3420,
      isActive: true,
    },
  ])
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [newKeyForm, setNewKeyForm] = useState({
    name: '',
    scopes: [] as string[],
    expiresIn: '1year',
  })
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const generateAPIKey = () => {
    const prefix = 'tm_'
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let key = prefix
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return key
  }

  const handleCreateKey = async () => {
    if (!newKeyForm.name.trim() || newKeyForm.scopes.length === 0) {
      alert('Please provide a name and select at least one scope')
      return
    }

    setLoading(true)
    try {
      const newKey = generateAPIKey()
      const expiresAt = newKeyForm.expiresIn === 'never' 
        ? undefined 
        : new Date(Date.now() + (newKeyForm.expiresIn === '1year' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString()

      const apiKey: APIKey = {
        id: Date.now().toString(),
        name: newKeyForm.name,
        key: newKey,
        maskedKey: `${newKey.substring(0, 8)}...${newKey.substring(newKey.length - 4)}`,
        scopes: newKeyForm.scopes,
        createdAt: new Date().toISOString(),
        expiresAt,
        usage: 0,
        isActive: true,
      }

      setApiKeys(prev => [...prev, apiKey])
      setGeneratedKey(newKey)
      setNewKeyForm({ name: '', scopes: [], expiresIn: '1year' })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('API key created:', apiKey)
    } catch (error) {
      console.error('Failed to create API key:', error)
      alert('Failed to create API key')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      setApiKeys(prev => prev.filter(k => k.id !== keyId))
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300))
      console.log('API key deleted:', keyId)
    } catch (error) {
      console.error('Failed to delete API key:', error)
      alert('Failed to delete API key')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev)
      if (newSet.has(keyId)) {
        newSet.delete(keyId)
      } else {
        newSet.add(keyId)
      }
      return newSet
    })
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    alert('API key copied to clipboard')
  }

  const handleScopeToggle = (scope: string) => {
    setNewKeyForm(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope]
    }))
  }

  return (
    <div className="p-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">API Keys</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage personal access tokens for CLI and third-party integrations.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Key
          </button>
        </div>
      </div>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No API keys yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first API key to start using the Task Master CLI and integrations.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </button>
          </div>
        ) : (
          apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Key className="w-5 h-5 text-gray-400 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">{apiKey.name}</h3>
                    <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                      apiKey.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {apiKey.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center space-x-2">
                      <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                        {visibleKeys.has(apiKey.id) ? apiKey.key : apiKey.maskedKey}
                      </code>
                      <button
                        onClick={() => handleToggleKeyVisibility(apiKey.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title={visibleKeys.has(apiKey.id) ? 'Hide key' : 'Show key'}
                      >
                        {visibleKeys.has(apiKey.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleCopyKey(apiKey.key)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <p className="font-medium">Scopes</p>
                      <p>{apiKey.scopes.map(s => s.replace(':', ': ')).join(', ')}</p>
                    </div>
                    <div>
                      <p className="font-medium">Created</p>
                      <p>{formatDate(apiKey.createdAt)}</p>
                      {apiKey.expiresAt && (
                        <p className="text-orange-600">Expires {formatDate(apiKey.expiresAt)}</p>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Usage</p>
                      <p>{apiKey.usage.toLocaleString()} requests</p>
                      {apiKey.lastUsed && (
                        <p>Last used {formatDate(apiKey.lastUsed)}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex space-x-2">
                  <button
                    onClick={() => setEditingKey(apiKey.id)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Edit key"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteKey(apiKey.id)}
                    className="p-2 text-red-400 hover:text-red-600"
                    title="Delete key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Create New API Key</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setGeneratedKey(null)
                    setNewKeyForm({ name: '', scopes: [], expiresIn: '1year' })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {generatedKey ? (
                <div className="text-center">
                  <div className="mb-4">
                    <Key className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">API Key Created!</h4>
                    <p className="text-gray-600 mb-4">
                      Copy your API key now. You won't be able to see it again.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <code className="block bg-white p-3 rounded border text-sm font-mono break-all">
                      {generatedKey}
                    </code>
                    <button
                      onClick={() => handleCopyKey(generatedKey)}
                      className="mt-3 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy to Clipboard
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setGeneratedKey(null)
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleCreateKey(); }}>
                  {/* Key Name */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Key Name
                    </label>
                    <input
                      type="text"
                      value={newKeyForm.name}
                      onChange={(e) => setNewKeyForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="My API Key"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Choose a descriptive name to help you identify this key later.
                    </p>
                  </div>

                  {/* Scopes */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Permissions (Scopes)
                    </label>
                    <div className="space-y-3">
                      {availableScopes.map((scope) => (
                        <label
                          key={scope.id}
                          className={`block p-3 rounded-lg border cursor-pointer transition-colors ${
                            newKeyForm.scopes.includes(scope.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={newKeyForm.scopes.includes(scope.id)}
                            onChange={() => handleScopeToggle(scope.id)}
                            className="sr-only"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{scope.name}</p>
                            <p className="text-sm text-gray-500">{scope.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Expiration */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiration
                    </label>
                    <select
                      value={newKeyForm.expiresIn}
                      onChange={(e) => setNewKeyForm(prev => ({ ...prev, expiresIn: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="30days">30 days</option>
                      <option value="1year">1 year</option>
                      <option value="never">Never expires</option>
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create API Key'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}