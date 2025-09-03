'use client';

import React, { useState } from 'react';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { formatDistanceToNow } from 'date-fns';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp 
} from 'lucide-react';

interface RealtimeSyncIndicatorProps {
  projectId?: string;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function RealtimeSyncIndicator({ 
  projectId, 
  showDetails = false, 
  compact = false,
  className = '' 
}: RealtimeSyncIndicatorProps) {
  const { state, triggerSync, getSyncStatus, isProjectSyncing } = useRealtimeSync();
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [isTriggering, setIsTriggering] = useState(false);

  const syncStatus = projectId ? state.syncStatuses.get(projectId) : null;
  const isSyncing = projectId ? isProjectSyncing(projectId) : false;
  const recentEvents = projectId 
    ? state.recentEvents.filter(e => e.projectId === projectId).slice(0, 5)
    : state.recentEvents.slice(0, 5);

  const handleTriggerSync = async () => {
    if (!projectId || isTriggering) return;
    
    setIsTriggering(true);
    try {
      await triggerSync(projectId);
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleRefreshStatus = () => {
    if (projectId) {
      getSyncStatus(projectId);
    }
  };

  const getStatusIcon = () => {
    if (!state.isConnected) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }

    if (isSyncing || isTriggering) {
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    }

    if (syncStatus?.status === 'COMPLETED') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }

    if (syncStatus?.status === 'FAILED') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }

    return <Wifi className="w-4 h-4 text-gray-500" />;
  };

  const getStatusText = () => {
    if (!state.isConnected) {
      return 'Disconnected';
    }

    if (isSyncing) {
      return 'Syncing...';
    }

    if (isTriggering) {
      return 'Starting sync...';
    }

    if (syncStatus?.status === 'COMPLETED' && syncStatus.lastSync) {
      return `Synced ${formatDistanceToNow(new Date(syncStatus.lastSync), { addSuffix: true })}`;
    }

    if (syncStatus?.status === 'FAILED') {
      return 'Sync failed';
    }

    return 'Ready';
  };

  const getStatusColor = () => {
    if (!state.isConnected) return 'text-red-500';
    if (isSyncing || isTriggering) return 'text-blue-500';
    if (syncStatus?.status === 'COMPLETED') return 'text-green-500';
    if (syncStatus?.status === 'FAILED') return 'text-red-500';
    return 'text-gray-500';
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getStatusIcon()}
        <span className={`text-sm ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Sync Status
              </h3>
              <p className={`text-sm ${getStatusColor()}`}>
                {getStatusText()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {projectId && (
              <button
                onClick={handleTriggerSync}
                disabled={isSyncing || isTriggering || !state.isConnected}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Trigger manual sync"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isTriggering ? 'animate-spin' : ''}`} />
                Sync
              </button>
            )}

            <button
              onClick={handleRefreshStatus}
              className="inline-flex items-center px-2 py-1 text-xs text-gray-500 hover:text-gray-700 focus:outline-none"
              title="Refresh status"
            >
              <RefreshCw className="w-3 h-3" />
            </button>

            {recentEvents.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center px-2 py-1 text-xs text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className="mt-3 flex items-center text-xs text-gray-500">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            state.isConnected ? 'bg-green-400' : 'bg-red-400'
          }`} />
          {state.isConnected ? 'Connected to sync server' : 'Disconnected from sync server'}
        </div>

        {/* Subscribed Projects */}
        {state.subscribedProjects.size > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            Monitoring {state.subscribedProjects.size} project{state.subscribedProjects.size !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Recent Events */}
      {isExpanded && recentEvents.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <h4 className="text-xs font-medium text-gray-900 mb-3">
            Recent Events
          </h4>
          <div className="space-y-2">
            {recentEvents.map((event, index) => (
              <div key={`${event.projectId}-${event.timestamp}-${index}`} className="flex items-center text-xs">
                <div className="flex-shrink-0 mr-2">
                  {event.type === 'sync-started' && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
                  {event.type === 'sync-completed' && <CheckCircle className="w-3 h-3 text-green-500" />}
                  {event.type === 'sync-failed' && <XCircle className="w-3 h-3 text-red-500" />}
                  {event.type === 'task-updated' && <RefreshCw className="w-3 h-3 text-blue-500" />}
                  {event.type === 'project-updated' && <RefreshCw className="w-3 h-3 text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 truncate">
                    {event.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div className="text-gray-500 truncate">
                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RealtimeSyncGlobalIndicator({ className = '' }: { className?: string }) {
  const { state } = useRealtimeSync();
  const [isExpanded, setIsExpanded] = useState(false);

  const activeSyncs = Array.from(state.syncStatuses.values()).filter(status => 
    status.isRunning || status.status === 'RUNNING'
  );

  const recentFailures = Array.from(state.syncStatuses.values()).filter(status => 
    status.status === 'FAILED'
  );

  const getGlobalStatus = () => {
    if (!state.isConnected) return { icon: WifiOff, color: 'text-red-500', text: 'Offline' };
    if (activeSyncs.length > 0) return { icon: Loader2, color: 'text-blue-500 animate-spin', text: `Syncing ${activeSyncs.length}` };
    if (recentFailures.length > 0) return { icon: XCircle, color: 'text-red-500', text: `${recentFailures.length} failed` };
    return { icon: CheckCircle, color: 'text-green-500', text: 'All synced' };
  };

  const status = getGlobalStatus();
  const StatusIcon = status.icon;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <StatusIcon className={`w-4 h-4 ${status.color}`} />
        <span>{status.text}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Sync Overview
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Connection Status</span>
                <span className={state.isConnected ? 'text-green-600' : 'text-red-600'}>
                  {state.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Monitored Projects</span>
                <span className="text-gray-900">{state.subscribedProjects.size}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Active Syncs</span>
                <span className="text-gray-900">{activeSyncs.length}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Recent Events</span>
                <span className="text-gray-900">{state.recentEvents.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}