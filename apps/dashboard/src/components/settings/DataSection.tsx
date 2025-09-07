'use client';

import { DataManagement } from './DataManagement';

export function DataSection() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Data Management
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Export, import, and manage your data according to your preferences and privacy rights.
        </p>
      </div>
      
      <DataManagement />
    </div>
  );
}