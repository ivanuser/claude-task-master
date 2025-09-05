'use client'

import { getIndexedDBService, SyncQueueItem } from './indexed-db-service'

export interface SyncOptions {
  maxRetries: number
  retryDelay: number
  batchSize: number
  conflictResolution: 'local-wins' | 'remote-wins' | 'manual'
}

export interface SyncResult {
  success: boolean
  itemId: string
  error?: string
  conflict?: {
    localData: any
    remoteData: any
  }
}

export type SyncProgressCallback = (progress: {
  total: number
  completed: number
  failed: number
  inProgress: number
}) => void

class SyncQueueManager {
  private isProcessing: boolean = false
  private syncOptions: SyncOptions = {
    maxRetries: 3,
    retryDelay: 2000,
    batchSize: 5,
    conflictResolution: 'manual',
  }
  private progressCallbacks: Set<SyncProgressCallback> = new Set()
  private abortController: AbortController | null = null

  constructor(options?: Partial<SyncOptions>) {
    if (options) {
      this.syncOptions = { ...this.syncOptions, ...options }
    }
  }

  async addToQueue(
    type: 'create' | 'update' | 'delete',
    entity: 'task' | 'project' | 'comment' | 'notification',
    data: any
  ): Promise<string> {
    const dbService = getIndexedDBService()
    return await dbService.addToSyncQueue({ type, entity, data })
  }

  async startSync(): Promise<void> {
    if (this.isProcessing) {
      console.log('Sync already in progress')
      return
    }

    this.isProcessing = true
    this.abortController = new AbortController()

    try {
      await this.processSyncQueue()
    } finally {
      this.isProcessing = false
      this.abortController = null
    }
  }

  stopSync(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.isProcessing = false
    }
  }

  private async processSyncQueue(): Promise<void> {
    const dbService = getIndexedDBService()
    
    while (this.isProcessing && !this.abortController?.signal.aborted) {
      const pendingItems = await dbService.getSyncQueueItems('pending')
      
      if (pendingItems.length === 0) {
        console.log('No pending items in sync queue')
        break
      }

      // Process items in batches
      const batches = this.createBatches(pendingItems, this.syncOptions.batchSize)
      
      for (const batch of batches) {
        if (this.abortController?.signal.aborted) break

        await this.processBatch(batch)
        
        // Update progress
        await this.updateProgress()
      }

      // Check for failed items that can be retried
      const failedItems = await dbService.getSyncQueueItems('failed')
      const retriableItems = failedItems.filter(
        item => item.retryCount < this.syncOptions.maxRetries
      )

      if (retriableItems.length > 0) {
        // Wait before retrying
        await new Promise(resolve => 
          setTimeout(resolve, this.syncOptions.retryDelay)
        )

        // Reset status for retry
        for (const item of retriableItems) {
          await dbService.updateSyncQueueItem(item.id, {
            status: 'pending',
            retryCount: item.retryCount + 1,
          })
        }
      } else {
        break // No more items to process
      }
    }
  }

  private async processBatch(batch: SyncQueueItem[]): Promise<void> {
    const dbService = getIndexedDBService()
    const promises = batch.map(async (item) => {
      try {
        // Update status to syncing
        await dbService.updateSyncQueueItem(item.id, { status: 'syncing' })

        // Process the sync item
        const result = await this.syncItem(item)

        if (result.success) {
          // Remove from queue on success
          await dbService.removeSyncQueueItem(item.id)
        } else if (result.conflict) {
          // Handle conflict
          await this.handleConflict(item, result.conflict)
        } else {
          // Mark as failed
          await dbService.updateSyncQueueItem(item.id, {
            status: 'failed',
            error: result.error,
          })
        }

        return result
      } catch (error) {
        console.error('Error processing sync item:', error)
        await dbService.updateSyncQueueItem(item.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        return { success: false, itemId: item.id, error: String(error) }
      }
    })

    await Promise.all(promises)
  }

  private async syncItem(item: SyncQueueItem): Promise<SyncResult> {
    const endpoint = this.getEndpoint(item.entity, item.type)
    const method = this.getHttpMethod(item.type)

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Id': item.id,
          'X-Sync-Timestamp': item.timestamp,
        },
        body: item.type !== 'delete' ? JSON.stringify(item.data) : undefined,
        signal: this.abortController?.signal,
      })

      if (response.ok) {
        return { success: true, itemId: item.id }
      }

      if (response.status === 409) {
        // Conflict detected
        const remoteData = await response.json()
        return {
          success: false,
          itemId: item.id,
          conflict: {
            localData: item.data,
            remoteData,
          },
        }
      }

      const errorText = await response.text()
      return {
        success: false,
        itemId: item.id,
        error: `Server error: ${response.status} - ${errorText}`,
      }
    } catch (error) {
      return {
        success: false,
        itemId: item.id,
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  private async handleConflict(
    item: SyncQueueItem,
    conflict: { localData: any; remoteData: any }
  ): Promise<void> {
    const dbService = getIndexedDBService()

    switch (this.syncOptions.conflictResolution) {
      case 'local-wins':
        // Force local data
        item.data = conflict.localData
        await dbService.updateSyncQueueItem(item.id, {
          status: 'pending',
          data: item.data,
        })
        break

      case 'remote-wins':
        // Discard local changes
        await dbService.removeSyncQueueItem(item.id)
        break

      case 'manual':
      default:
        // Add to conflicts for manual resolution
        await dbService.addConflict(conflict.localData, conflict.remoteData)
        await dbService.updateSyncQueueItem(item.id, {
          status: 'failed',
          error: 'Conflict requires manual resolution',
        })
        break
    }
  }

  private getEndpoint(entity: string, type: string): string {
    const baseUrl = '/api'
    const entityPlural = entity === 'task' ? 'tasks' : 
                        entity === 'project' ? 'projects' :
                        entity === 'comment' ? 'comments' : 'notifications'
    
    return `${baseUrl}/${entityPlural}`
  }

  private getHttpMethod(type: 'create' | 'update' | 'delete'): string {
    switch (type) {
      case 'create':
        return 'POST'
      case 'update':
        return 'PUT'
      case 'delete':
        return 'DELETE'
      default:
        return 'POST'
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  private async updateProgress(): Promise<void> {
    const dbService = getIndexedDBService()
    const [pending, syncing, failed] = await Promise.all([
      dbService.getSyncQueueItems('pending'),
      dbService.getSyncQueueItems('syncing'),
      dbService.getSyncQueueItems('failed'),
    ])

    const total = pending.length + syncing.length + failed.length
    const completed = 0 // We remove completed items, so they're not in the queue
    const inProgress = syncing.length

    this.progressCallbacks.forEach(callback => {
      callback({
        total,
        completed,
        failed: failed.length,
        inProgress,
      })
    })
  }

  onProgress(callback: SyncProgressCallback): () => void {
    this.progressCallbacks.add(callback)
    return () => {
      this.progressCallbacks.delete(callback)
    }
  }

  async getQueueStatus(): Promise<{
    pending: number
    syncing: number
    failed: number
    total: number
  }> {
    const dbService = getIndexedDBService()
    const [pending, syncing, failed] = await Promise.all([
      dbService.getSyncQueueItems('pending'),
      dbService.getSyncQueueItems('syncing'),
      dbService.getSyncQueueItems('failed'),
    ])

    return {
      pending: pending.length,
      syncing: syncing.length,
      failed: failed.length,
      total: pending.length + syncing.length + failed.length,
    }
  }

  async clearQueue(): Promise<void> {
    const dbService = getIndexedDBService()
    const allItems = await dbService.getSyncQueueItems()
    
    for (const item of allItems) {
      await dbService.removeSyncQueueItem(item.id)
    }
  }

  async retryFailed(): Promise<void> {
    const dbService = getIndexedDBService()
    const failedItems = await dbService.getSyncQueueItems('failed')
    
    for (const item of failedItems) {
      await dbService.updateSyncQueueItem(item.id, {
        status: 'pending',
        retryCount: 0,
        error: undefined,
      })
    }

    if (failedItems.length > 0 && !this.isProcessing) {
      await this.startSync()
    }
  }
}

// Singleton instance
let syncQueueManager: SyncQueueManager | null = null

export function getSyncQueueManager(options?: Partial<SyncOptions>): SyncQueueManager {
  if (!syncQueueManager) {
    syncQueueManager = new SyncQueueManager(options)
  }
  return syncQueueManager
}