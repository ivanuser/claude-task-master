'use client'

import React, { useState, useRef } from 'react'
import { Download, Upload, FileText, Database, Calendar, Shield, Archive, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'

interface ExportJob {
  id: string
  type: 'full' | 'projects' | 'tasks' | 'analytics'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
  downloadUrl?: string
  fileSize?: string
  errorMessage?: string
}

const exportTypes = [
  {
    id: 'full',
    name: 'Complete Data Export',
    description: 'All your data including profile, projects, tasks, and analytics',
    icon: Database,
    includes: ['Profile information', 'All projects', 'All tasks', 'Analytics data', 'Settings'],
  },
  {
    id: 'projects',
    name: 'Projects Only',
    description: 'Export all your projects and their associated tasks',
    icon: FileText,
    includes: ['Project details', 'Task lists', 'Project settings', 'Member assignments'],
  },
  {
    id: 'tasks',
    name: 'Tasks Only',
    description: 'Export all tasks across all projects',
    icon: CheckCircle,
    includes: ['Task details', 'Status history', 'Comments', 'Attachments'],
  },
  {
    id: 'analytics',
    name: 'Analytics Data',
    description: 'Export your performance analytics and reports',
    icon: Calendar,
    includes: ['Time tracking', 'Performance metrics', 'Usage statistics', 'Reports'],
  },
]

const importFormats = [
  { id: 'json', name: 'JSON', description: 'Native Task Master format' },
  { id: 'csv', name: 'CSV', description: 'Spreadsheet compatible format' },
  { id: 'trello', name: 'Trello', description: 'Import from Trello boards' },
  { id: 'asana', name: 'Asana', description: 'Import from Asana projects' },
  { id: 'notion', name: 'Notion', description: 'Import from Notion databases' },
]

export function DataSection() {
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([
    {
      id: '1',
      type: 'full',
      status: 'completed',
      createdAt: '2024-01-20T10:30:00Z',
      completedAt: '2024-01-20T10:35:00Z',
      downloadUrl: '/api/exports/full-export-2024-01-20.zip',
      fileSize: '2.4 MB',
    },
    {
      id: '2',
      type: 'projects',
      status: 'processing',
      createdAt: '2024-01-20T14:15:00Z',
    },
  ])
  
  const [selectedExportType, setSelectedExportType] = useState<string>('full')
  const [selectedImportFormat, setSelectedImportFormat] = useState<string>('json')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusIcon = (status: ExportJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <RefreshCw className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (status: ExportJob['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'processing':
        return 'Processing'
      case 'failed':
        return 'Failed'
      default:
        return 'Pending'
    }
  }

  const handleExportData = async () => {
    setLoading('export')
    try {
      const newJob: ExportJob = {
        id: Date.now().toString(),
        type: selectedExportType as ExportJob['type'],
        status: 'processing',
        createdAt: new Date().toISOString(),
      }

      setExportJobs(prev => [newJob, ...prev])
      
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update job to completed
      setExportJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? {
              ...job,
              status: 'completed',
              completedAt: new Date().toISOString(),
              downloadUrl: `/api/exports/${selectedExportType}-export-${Date.now()}.zip`,
              fileSize: Math.random() > 0.5 ? '1.2 MB' : '3.7 MB',
            }
          : job
      ))
      
      console.log('Export completed:', selectedExportType)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to start export')
    } finally {
      setLoading(null)
    }
  }

  const handleDownload = (job: ExportJob) => {
    if (job.downloadUrl) {
      // In a real app, this would trigger a download
      console.log('Downloading:', job.downloadUrl)
      alert('Download started (simulated)')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
    }
  }

  const handleImportData = async () => {
    if (!importFile) {
      alert('Please select a file to import')
      return
    }

    setLoading('import')
    try {
      // Simulate import process
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      console.log('Import completed:', importFile.name, selectedImportFormat)
      setImportFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      alert('Data imported successfully!')
    } catch (error) {
      console.error('Import failed:', error)
      alert('Failed to import data')
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteExport = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this export?')) {
      return
    }

    try {
      setExportJobs(prev => prev.filter(job => job.id !== jobId))
      console.log('Export deleted:', jobId)
    } catch (error) {
      console.error('Failed to delete export:', error)
      alert('Failed to delete export')
    }
  }

  return (
    <div className="p-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-lg font-medium text-gray-900">Data Management</h2>
        <p className="text-sm text-gray-500 mt-1">
          Export your data for backup or migration, or import data from other tools.
        </p>
      </div>

      <div className="space-y-8">
        {/* Export Data Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Download className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Export Data</h3>
          </div>
          
          <p className="text-sm text-gray-600 mb-6">
            Choose what data you want to export. Exports are provided in JSON format and include all associated metadata.
          </p>

          {/* Export Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {exportTypes.map((type) => {
              const IconComponent = type.icon
              return (
                <label
                  key={type.id}
                  className={`block p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedExportType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportType"
                    value={type.id}
                    checked={selectedExportType === type.id}
                    onChange={(e) => setSelectedExportType(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-start">
                    <IconComponent className={`w-5 h-5 mt-1 mr-3 ${
                      selectedExportType === type.id ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div>
                      <h4 className="font-medium text-gray-900">{type.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Includes:</p>
                        <ul className="text-xs text-gray-500 ml-2">
                          {type.includes.map((item, index) => (
                            <li key={index}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>

          <button
            onClick={handleExportData}
            disabled={loading === 'export'}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'export' ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Creating Export...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Start Export
              </>
            )}
          </button>
        </div>

        {/* Export History */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Archive className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Export History</h3>
          </div>
          
          {exportJobs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No exports yet</p>
          ) : (
            <div className="space-y-4">
              {exportJobs.map((job) => (
                <div key={job.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(job.status)}
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">
                          {exportTypes.find(t => t.id === job.type)?.name || job.type}
                        </div>
                        <div className="text-sm text-gray-600">
                          Created: {formatDate(job.createdAt)}
                          {job.completedAt && (
                            <span> • Completed: {formatDate(job.completedAt)}</span>
                          )}
                          {job.fileSize && (
                            <span> • Size: {job.fileSize}</span>
                          )}
                        </div>
                        {job.status === 'failed' && job.errorMessage && (
                          <div className="text-sm text-red-600 mt-1">
                            Error: {job.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        job.status === 'completed' ? 'bg-green-100 text-green-800' :
                        job.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        job.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getStatusText(job.status)}
                      </span>
                      
                      {job.status === 'completed' && job.downloadUrl && (
                        <button
                          onClick={() => handleDownload(job)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Download
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteExport(job.id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Import Data Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Upload className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Import Data</h3>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-yellow-600 mr-2" />
              <div>
                <h4 className="font-medium text-yellow-800">Important Notes</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Importing data will add to your existing data. Duplicate items may be created. 
                  We recommend exporting your current data as a backup before importing.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Import Format
              </label>
              <select
                value={selectedImportFormat}
                onChange={(e) => setSelectedImportFormat(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {importFormats.map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.name} - {format.description}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <div className="flex items-center space-x-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".json,.csv,.zip"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {importFile && (
                  <span className="text-sm text-gray-600">
                    {importFile.name} ({Math.round(importFile.size / 1024)}KB)
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: JSON, CSV, ZIP. Maximum file size: 10MB
              </p>
            </div>

            <button
              onClick={handleImportData}
              disabled={loading === 'import' || !importFile}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'import' ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Importing Data...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </>
              )}
            </button>
          </div>
        </div>

        {/* Data Retention Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Data Retention Policy</h4>
              <p className="text-sm text-blue-800 mt-1">
                Export files are automatically deleted after 30 days. Download your exports promptly to ensure you have access to your data. 
                Your account data is backed up regularly and stored securely according to our privacy policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}