'use client'

import React, { useState } from 'react'
import { Plug, Check, X, Settings, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  category: 'development' | 'communication' | 'productivity' | 'storage'
  connected: boolean
  config?: Record<string, any>
  lastSync?: string
  status: 'connected' | 'error' | 'disconnected' | 'syncing'
  errorMessage?: string
  features: string[]
}

const integrations: Integration[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get task notifications and updates in your Slack channels',
    icon: '#1F2937',
    category: 'communication',
    connected: true,
    config: { channel: '#general', webhookUrl: 'https://hooks.slack.com/...' },
    lastSync: '2024-01-20T10:30:00Z',
    status: 'connected',
    features: ['Task notifications', 'Project updates', 'Mentions'],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Link tasks to GitHub issues and pull requests',
    icon: '#1F2937',
    category: 'development',
    connected: false,
    status: 'disconnected',
    features: ['Issue linking', 'PR status updates', 'Commit references'],
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'Connect with GitLab for issue tracking and merge requests',
    icon: '#FC6D26',
    category: 'development',
    connected: false,
    status: 'disconnected',
    features: ['Issue sync', 'MR tracking', 'Pipeline status'],
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Send notifications to Discord servers and channels',
    icon: '#5865F2',
    category: 'communication',
    connected: true,
    config: { serverId: '123456789', channelId: '987654321' },
    lastSync: '2024-01-19T15:45:00Z',
    status: 'error',
    errorMessage: 'Webhook URL expired',
    features: ['Channel notifications', 'Direct messages', 'Bot commands'],
  },
  {
    id: 'googledrive',
    name: 'Google Drive',
    description: 'Store and share project files in Google Drive',
    icon: '#4285F4',
    category: 'storage',
    connected: false,
    status: 'disconnected',
    features: ['File storage', 'Document sharing', 'Backup sync'],
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync tasks and projects with your Notion workspace',
    icon: '#000000',
    category: 'productivity',
    connected: false,
    status: 'disconnected',
    features: ['Database sync', 'Page creation', 'Template generation'],
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect with 5000+ apps through Zapier automation',
    icon: '#FF4A00',
    category: 'productivity',
    connected: true,
    config: { webhookUrl: 'https://hooks.zapier.com/...' },
    lastSync: '2024-01-20T09:15:00Z',
    status: 'connected',
    features: ['Custom automations', 'Multi-app workflows', 'Trigger actions'],
  },
]

const categories = [
  { id: 'development', name: 'Development', icon: '⚡' },
  { id: 'communication', name: 'Communication', icon: '💬' },
  { id: 'productivity', name: 'Productivity', icon: '📊' },
  { id: 'storage', name: 'Storage', icon: '💾' },
]

export function IntegrationsSection() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showConfigModal, setShowConfigModal] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [integrationList, setIntegrationList] = useState(integrations)

  const filteredIntegrations = selectedCategory === 'all' 
    ? integrationList 
    : integrationList.filter(i => i.category === selectedCategory)

  const connectedCount = integrationList.filter(i => i.connected).length

  const handleConnect = async (integrationId: string) => {
    setLoading(integrationId)
    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setIntegrationList(prev => prev.map(i => 
        i.id === integrationId 
          ? { ...i, connected: true, status: 'connected', lastSync: new Date().toISOString() }
          : i
      ))
      
      console.log('Integration connected:', integrationId)
    } catch (error) {
      console.error('Failed to connect integration:', error)
      alert('Failed to connect integration')
    } finally {
      setLoading(null)
    }
  }

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) {
      return
    }

    setLoading(integrationId)
    try {
      // Simulate disconnection process
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setIntegrationList(prev => prev.map(i => 
        i.id === integrationId 
          ? { ...i, connected: false, status: 'disconnected', config: undefined, errorMessage: undefined }
          : i
      ))
      
      console.log('Integration disconnected:', integrationId)
    } catch (error) {
      console.error('Failed to disconnect integration:', error)
      alert('Failed to disconnect integration')
    } finally {
      setLoading(null)
    }
  }

  const handleRefreshSync = async (integrationId: string) => {
    setLoading(integrationId)
    try {
      // Simulate sync refresh
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setIntegrationList(prev => prev.map(i => 
        i.id === integrationId 
          ? { ...i, status: 'connected', lastSync: new Date().toISOString(), errorMessage: undefined }
          : i
      ))
      
      console.log('Integration sync refreshed:', integrationId)
    } catch (error) {
      console.error('Failed to refresh sync:', error)
      alert('Failed to refresh sync')
    } finally {
      setLoading(null)
    }
  }

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <Check className="w-4 h-4 text-green-600" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      default:
        return <X className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return 'Connected'
      case 'error':
        return 'Error'
      case 'syncing':
        return 'Syncing'
      default:
        return 'Not connected'
    }
  }

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-lg font-medium text-gray-900">Integrations</h2>
        <p className="text-sm text-gray-500 mt-1">
          Connect Task Master with your favorite tools and services.
        </p>
        <div className="mt-3 flex items-center space-x-4 text-sm">
          <span className="text-gray-600">
            {connectedCount} of {integrationList.length} integrations connected
          </span>
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${(connectedCount / integrationList.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Integrations
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredIntegrations.map((integration) => (
          <div
            key={integration.id}
            className={`bg-white border rounded-lg p-6 transition-all ${
              integration.connected ? 'border-green-200 bg-green-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: integration.icon }}
                >
                  {integration.name.charAt(0)}
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{integration.name}</h3>
                  <div className="flex items-center mt-1">
                    {getStatusIcon(integration.status)}
                    <span className={`ml-1 text-sm ${
                      integration.status === 'connected' ? 'text-green-600' :
                      integration.status === 'error' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {getStatusText(integration.status)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {integration.connected && (
                  <button
                    onClick={() => setShowConfigModal(integration.id)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Configure"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {}}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Learn more"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4">{integration.description}</p>

            {/* Features */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {integration.features.map((feature, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {integration.status === 'error' && integration.errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                  <p className="text-sm text-red-700">{integration.errorMessage}</p>
                </div>
              </div>
            )}

            {/* Connection Info */}
            {integration.connected && integration.lastSync && (
              <div className="text-xs text-gray-500 mb-4">
                Last synced: {formatLastSync(integration.lastSync)}
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2">
              {integration.connected ? (
                <>
                  {integration.status === 'error' && (
                    <button
                      onClick={() => handleRefreshSync(integration.id)}
                      disabled={loading === integration.id}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {loading === integration.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        'Retry Connection'
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleDisconnect(integration.id)}
                    disabled={loading === integration.id}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConnect(integration.id)}
                  disabled={loading === integration.id}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading === integration.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Connect'
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Configure Integration</h3>
                <button
                  onClick={() => setShowConfigModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {(() => {
                const integration = integrationList.find(i => i.id === showConfigModal)
                if (!integration) return null

                return (
                  <div>
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900">{integration.name}</h4>
                      <p className="text-sm text-gray-600">{integration.description}</p>
                    </div>

                    {/* Configuration form would go here */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Webhook URL
                        </label>
                        <input
                          type="url"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://hooks.example.com/..."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notification Events
                        </label>
                        <div className="space-y-2">
                          {['Task created', 'Task completed', 'Task assigned', 'Project updated'].map((event) => (
                            <label key={event} className="flex items-center">
                              <input type="checkbox" className="rounded border-gray-300 mr-2" />
                              <span className="text-sm text-gray-700">{event}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        onClick={() => setShowConfigModal(null)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setShowConfigModal(null)
                          console.log('Configuration saved')
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Save Configuration
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}