'use client'

import React, { useState, useEffect } from 'react'
import { X, AlertTriangle, Check, FileCode, Clock } from 'lucide-react'
import { getIndexedDBService, ConflictItem } from '@/lib/offline/indexed-db-service'

interface ConflictResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  onResolved: () => void
}

export function ConflictResolutionModal({ isOpen, onClose, onResolved }: ConflictResolutionModalProps) {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(null)
  const [resolution, setResolution] = useState<'local' | 'remote' | 'merged'>('local')
  const [mergedData, setMergedData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showMergeEditor, setShowMergeEditor] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadConflicts()
    }
  }, [isOpen])

  const loadConflicts = async () => {
    const dbService = getIndexedDBService()
    const unresolvedConflicts = await dbService.getUnresolvedConflicts()
    setConflicts(unresolvedConflicts)
    
    if (unresolvedConflicts.length > 0 && !selectedConflict) {
      setSelectedConflict(unresolvedConflicts[0])
    }
  }

  const handleResolve = async () => {
    if (!selectedConflict) return

    setLoading(true)
    try {
      const dbService = getIndexedDBService()
      
      const finalData = resolution === 'merged' ? mergedData : 
                       resolution === 'local' ? selectedConflict.localData : 
                       selectedConflict.remoteData

      await dbService.resolveConflict(selectedConflict.id, resolution, finalData)
      
      // Remove resolved conflict from list
      const updatedConflicts = conflicts.filter(c => c.id !== selectedConflict.id)
      setConflicts(updatedConflicts)
      
      if (updatedConflicts.length > 0) {
        setSelectedConflict(updatedConflicts[0])
        setResolution('local')
        setMergedData(null)
      } else {
        onResolved()
        onClose()
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      alert('Failed to resolve conflict. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMerge = () => {
    if (!selectedConflict) return
    
    // Initialize merged data with local data
    setMergedData({
      ...selectedConflict.localData,
      // You can customize the merge logic here
      _merged: true,
      _mergedAt: new Date().toISOString(),
    })
    setShowMergeEditor(true)
    setResolution('merged')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const renderDataDiff = (data: any, label: string, highlight: string) => {
    return (
      <div className={`flex-1 p-4 rounded-lg border-2 ${highlight}`}>
        <h4 className="font-medium text-gray-900 mb-2">{label}</h4>
        <pre className="text-xs text-gray-600 overflow-auto max-h-64 bg-gray-50 p-2 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 text-yellow-500 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Resolve Data Conflicts
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} need resolution
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex h-[500px]">
          {/* Conflict List */}
          <div className="w-64 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Conflicts</h3>
              <div className="space-y-2">
                {conflicts.map((conflict) => (
                  <button
                    key={conflict.id}
                    onClick={() => {
                      setSelectedConflict(conflict)
                      setResolution('local')
                      setMergedData(null)
                      setShowMergeEditor(false)
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedConflict?.id === conflict.id
                        ? 'bg-blue-50 border-blue-200 border'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {conflict.localData?.title || conflict.localData?.name || `Conflict ${conflict.id.slice(-6)}`}
                    </div>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(conflict.conflictedAt)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Conflict Details */}
          <div className="flex-1 overflow-y-auto">
            {selectedConflict ? (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Conflicted Data
                  </h3>
                  <p className="text-sm text-gray-600">
                    This item was modified both locally and on the server. Choose which version to keep.
                  </p>
                </div>

                {/* Data Comparison */}
                <div className="flex space-x-4 mb-6">
                  {renderDataDiff(
                    selectedConflict.localData,
                    'Local Changes',
                    resolution === 'local' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  )}
                  {renderDataDiff(
                    selectedConflict.remoteData,
                    'Server Version',
                    resolution === 'remote' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  )}
                </div>

                {/* Resolution Options */}
                <div className="space-y-3 mb-6">
                  <label className="flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="local"
                      checked={resolution === 'local'}
                      onChange={(e) => setResolution(e.target.value as any)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Keep Local Changes</div>
                      <div className="text-sm text-gray-500">Use your local version and discard server changes</div>
                    </div>
                  </label>

                  <label className="flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="remote"
                      checked={resolution === 'remote'}
                      onChange={(e) => setResolution(e.target.value as any)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Keep Server Version</div>
                      <div className="text-sm text-gray-500">Use the server version and discard local changes</div>
                    </div>
                  </label>

                  <button
                    onClick={handleMerge}
                    className={`w-full flex items-center p-3 rounded-lg border transition-colors ${
                      resolution === 'merged' ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <FileCode className="w-5 h-5 mr-3 text-gray-400" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Manual Merge</div>
                      <div className="text-sm text-gray-500">Manually combine changes from both versions</div>
                    </div>
                  </button>
                </div>

                {/* Merge Editor */}
                {showMergeEditor && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Merged Data (Edit as needed)
                    </label>
                    <textarea
                      value={JSON.stringify(mergedData, null, 2)}
                      onChange={(e) => {
                        try {
                          setMergedData(JSON.parse(e.target.value))
                        } catch {
                          // Invalid JSON, keep as is
                        }
                      }}
                      className="w-full h-48 p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No Conflicts</h3>
                  <p className="text-gray-500">All conflicts have been resolved</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between">
            <div className="text-sm text-gray-500">
              Resolving {conflicts.findIndex(c => c.id === selectedConflict?.id) + 1} of {conflicts.length}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!selectedConflict || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resolving...' : 'Apply Resolution'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}