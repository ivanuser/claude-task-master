'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ShieldCheckIcon,
  ClockIcon,
  ArrowUturnLeftIcon,
  DocumentTextIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

interface DataManagementProps {
  userId?: string;
}

export function DataManagement({ userId }: DataManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [importStrategy, setImportStrategy] = useState<'merge' | 'replace' | 'skip'>('merge');
  const [retentionDays, setRetentionDays] = useState(90);
  const [undoTokens, setUndoTokens] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export data
  const handleExport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        format: exportFormat,
        types: 'all', // Could be customizable
      });

      const response = await fetch(`/api/user/data/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const contentType = response.headers.get('content-type');
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taskmaster-export-${Date.now()}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Data exported successfully as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Import data
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      // First validate the file
      const formData = new FormData();
      formData.append('file', file);

      const validateResponse = await fetch('/api/user/data/import', {
        method: 'OPTIONS',
        body: formData,
      });

      const validation = await validateResponse.json();

      if (!validation.valid) {
        toast.error(validation.error || 'Invalid file format');
        return;
      }

      // Show validation summary
      const confirmImport = window.confirm(
        `Import file contains:\n` +
        `- ${validation.stats.projects || 0} projects\n` +
        `- ${validation.stats.tasks || 0} tasks\n` +
        `- ${validation.stats.notifications || 0} notifications\n` +
        `${validation.warnings.length > 0 ? '\nWarnings:\n' + validation.warnings.join('\n') : ''}\n\n` +
        `Strategy: ${importStrategy}\n` +
        `Proceed with import?`
      );

      if (!confirmImport) return;

      // Perform actual import
      const importFormData = new FormData();
      importFormData.append('file', file);
      importFormData.append('strategy', importStrategy);

      const response = await fetch('/api/user/data/import', {
        method: 'POST',
        body: importFormData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      toast.success(result.message);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to import data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update retention settings
  const handleRetentionUpdate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/data/retention', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays }),
      });

      if (!response.ok) {
        throw new Error('Failed to update retention settings');
      }

      toast.success('Retention settings updated');
    } catch (error) {
      toast.error('Failed to update retention settings');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute data cleanup
  const handleCleanup = async (dryRun = true) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/data/retention?dryRun=${dryRun}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Cleanup failed');
      }

      if (dryRun) {
        const confirmCleanup = window.confirm(
          `Data cleanup will delete:\n` +
          `- ${result.wouldDelete.notifications || 0} notifications\n` +
          `- ${result.wouldDelete.tasks || 0} completed tasks\n` +
          `- ${result.wouldDelete.projects || 0} archived projects\n\n` +
          `Proceed with cleanup?`
        );

        if (confirmCleanup) {
          await handleCleanup(false);
        }
      } else {
        toast.success(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to execute cleanup');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle GDPR actions
  const handleGDPRAction = async (action: 'anonymize' | 'delete') => {
    setIsLoading(true);
    try {
      if (action === 'anonymize') {
        const confirm = window.confirm(
          'This will anonymize your account by replacing all personal information with random data. ' +
          'You will still be able to use the account but your identity will be hidden. Continue?'
        );

        if (!confirm) return;

        const response = await fetch('/api/user/data/gdpr', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmAnonymize: true }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        toast.success(result.message);
      } else if (action === 'delete') {
        const confirmText = window.prompt(
          'This will PERMANENTLY delete your account and all associated data. ' +
          'This action cannot be undone.\n\n' +
          'Type "DELETE_MY_ACCOUNT" to confirm:'
        );

        if (confirmText !== 'DELETE_MY_ACCOUNT') return;

        const response = await fetch('/api/user/data/gdpr?confirm=DELETE_MY_ACCOUNT', {
          method: 'DELETE',
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        toast.success(result.message);
        // Redirect to home after account deletion
        window.location.href = '/';
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} account`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Export/Import Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Data Export & Import</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export */}
          <div>
            <h4 className="text-sm font-medium mb-3">Export Your Data</h4>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setExportFormat('json')}
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    exportFormat === 'json'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <DocumentTextIcon className="w-4 h-4 inline mr-1" />
                  JSON
                </button>
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    exportFormat === 'csv'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <TableCellsIcon className="w-4 h-4 inline mr-1" />
                  CSV
                </button>
              </div>
              <button
                onClick={handleExport}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="w-4 h-4 inline mr-2" />
                Export as {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>

          {/* Import */}
          <div>
            <h4 className="text-sm font-medium mb-3">Import Data</h4>
            <div className="space-y-3">
              <select
                value={importStrategy}
                onChange={(e) => setImportStrategy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <option value="merge">Merge with existing</option>
                <option value="replace">Replace existing</option>
                <option value="skip">Skip conflicts</option>
              </select>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isLoading}
                className="hidden"
                id="import-file"
              />
              <label
                htmlFor="import-file"
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer inline-block text-center"
              >
                <ArrowUpTrayIcon className="w-4 h-4 inline mr-2" />
                Import JSON File
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Data Retention Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Data Retention Policy</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Retention Period (days)
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                min="7"
                max="3650"
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
              <button
                onClick={handleRetentionUpdate}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Update
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Data older than {retentionDays} days will be eligible for cleanup
            </p>
          </div>

          <button
            onClick={() => handleCleanup(true)}
            disabled={isLoading}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            <ClockIcon className="w-4 h-4 inline mr-2" />
            Preview & Execute Cleanup
          </button>
        </div>
      </div>

      {/* GDPR Compliance Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">GDPR & Privacy</h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <ShieldCheckIcon className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              You have the right to data portability, rectification, erasure, and more under GDPR.
              Use the options below to exercise your rights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleGDPRAction('anonymize')}
              disabled={isLoading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              <ShieldCheckIcon className="w-4 h-4 inline mr-2" />
              Anonymize Account
            </button>

            <button
              onClick={() => handleGDPRAction('delete')}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <TrashIcon className="w-4 h-4 inline mr-2" />
              Delete Account Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}