'use client'

export interface SyncQueueItem {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'task' | 'project' | 'comment' | 'notification'
  data: any
  timestamp: string
  retryCount: number
  status: 'pending' | 'syncing' | 'failed' | 'completed'
  error?: string
}

export interface CachedData {
  id: string
  type: string
  data: any
  timestamp: string
  expiresAt?: string
}

export interface ConflictItem {
  id: string
  localData: any
  remoteData: any
  conflictedAt: string
  resolved: boolean
  resolution?: 'local' | 'remote' | 'merged'
  mergedData?: any
}

class IndexedDBService {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'TaskMasterOfflineDB'
  private readonly DB_VERSION = 1
  
  private readonly STORES = {
    SYNC_QUEUE: 'syncQueue',
    CACHED_DATA: 'cachedData',
    CONFLICTS: 'conflicts',
    OFFLINE_ACTIONS: 'offlineActions',
  }

  async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB is not available')
      return
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB initialized successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create sync queue store
        if (!db.objectStoreNames.contains(this.STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(this.STORES.SYNC_QUEUE, { 
            keyPath: 'id' 
          })
          syncStore.createIndex('status', 'status', { unique: false })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
          syncStore.createIndex('entity', 'entity', { unique: false })
        }

        // Create cached data store
        if (!db.objectStoreNames.contains(this.STORES.CACHED_DATA)) {
          const cacheStore = db.createObjectStore(this.STORES.CACHED_DATA, { 
            keyPath: 'id' 
          })
          cacheStore.createIndex('type', 'type', { unique: false })
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Create conflicts store
        if (!db.objectStoreNames.contains(this.STORES.CONFLICTS)) {
          const conflictStore = db.createObjectStore(this.STORES.CONFLICTS, { 
            keyPath: 'id' 
          })
          conflictStore.createIndex('resolved', 'resolved', { unique: false })
          conflictStore.createIndex('conflictedAt', 'conflictedAt', { unique: false })
        }

        // Create offline actions store
        if (!db.objectStoreNames.contains(this.STORES.OFFLINE_ACTIONS)) {
          const actionsStore = db.createObjectStore(this.STORES.OFFLINE_ACTIONS, { 
            keyPath: 'id',
            autoIncrement: true 
          })
          actionsStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  // Sync Queue Operations
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    if (!this.db) await this.initialize()
    
    const syncItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.SYNC_QUEUE], 'readwrite')
      const store = transaction.objectStore(this.STORES.SYNC_QUEUE)
      const request = store.add(syncItem)

      request.onsuccess = () => {
        console.log('Added item to sync queue:', syncItem.id)
        resolve(syncItem.id)
      }

      request.onerror = () => {
        console.error('Failed to add item to sync queue:', request.error)
        reject(request.error)
      }
    })
  }

  async getSyncQueueItems(status?: 'pending' | 'syncing' | 'failed'): Promise<SyncQueueItem[]> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.SYNC_QUEUE], 'readonly')
      const store = transaction.objectStore(this.STORES.SYNC_QUEUE)
      
      const request = status 
        ? store.index('status').getAll(status)
        : store.getAll()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        console.error('Failed to get sync queue items:', request.error)
        reject(request.error)
      }
    })
  }

  async updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.SYNC_QUEUE], 'readwrite')
      const store = transaction.objectStore(this.STORES.SYNC_QUEUE)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const item = getRequest.result
        if (!item) {
          reject(new Error(`Sync queue item ${id} not found`))
          return
        }

        const updatedItem = { ...item, ...updates }
        const updateRequest = store.put(updatedItem)

        updateRequest.onsuccess = () => {
          resolve()
        }

        updateRequest.onerror = () => {
          reject(updateRequest.error)
        }
      }

      getRequest.onerror = () => {
        reject(getRequest.error)
      }
    })
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.SYNC_QUEUE], 'readwrite')
      const store = transaction.objectStore(this.STORES.SYNC_QUEUE)
      const request = store.delete(id)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // Cached Data Operations
  async cacheData(type: string, data: any, expiresInMinutes?: number): Promise<string> {
    if (!this.db) await this.initialize()

    const cachedItem: CachedData = {
      id: `cache_${type}_${Date.now()}`,
      type,
      data,
      timestamp: new Date().toISOString(),
      expiresAt: expiresInMinutes 
        ? new Date(Date.now() + expiresInMinutes * 60000).toISOString()
        : undefined,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.CACHED_DATA], 'readwrite')
      const store = transaction.objectStore(this.STORES.CACHED_DATA)
      const request = store.add(cachedItem)

      request.onsuccess = () => {
        resolve(cachedItem.id)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async getCachedData(type: string): Promise<CachedData[]> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.CACHED_DATA], 'readonly')
      const store = transaction.objectStore(this.STORES.CACHED_DATA)
      const index = store.index('type')
      const request = index.getAll(type)

      request.onsuccess = () => {
        const now = new Date().toISOString()
        const validItems = request.result.filter(item => 
          !item.expiresAt || item.expiresAt > now
        )
        resolve(validItems)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async clearExpiredCache(): Promise<void> {
    if (!this.db) await this.initialize()

    const allCached = await this.getCachedData('')
    const now = new Date().toISOString()
    const expired = allCached.filter(item => item.expiresAt && item.expiresAt <= now)

    for (const item of expired) {
      await this.removeCachedData(item.id)
    }
  }

  async removeCachedData(id: string): Promise<void> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.CACHED_DATA], 'readwrite')
      const store = transaction.objectStore(this.STORES.CACHED_DATA)
      const request = store.delete(id)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // Conflict Management
  async addConflict(localData: any, remoteData: any): Promise<string> {
    if (!this.db) await this.initialize()

    const conflict: ConflictItem = {
      id: `conflict_${Date.now()}`,
      localData,
      remoteData,
      conflictedAt: new Date().toISOString(),
      resolved: false,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.CONFLICTS], 'readwrite')
      const store = transaction.objectStore(this.STORES.CONFLICTS)
      const request = store.add(conflict)

      request.onsuccess = () => {
        resolve(conflict.id)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async getUnresolvedConflicts(): Promise<ConflictItem[]> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.CONFLICTS], 'readonly')
      const store = transaction.objectStore(this.STORES.CONFLICTS)
      const index = store.index('resolved')
      const request = index.getAll(false)

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async resolveConflict(
    id: string, 
    resolution: 'local' | 'remote' | 'merged', 
    mergedData?: any
  ): Promise<void> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORES.CONFLICTS], 'readwrite')
      const store = transaction.objectStore(this.STORES.CONFLICTS)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const conflict = getRequest.result
        if (!conflict) {
          reject(new Error(`Conflict ${id} not found`))
          return
        }

        conflict.resolved = true
        conflict.resolution = resolution
        if (mergedData) {
          conflict.mergedData = mergedData
        }

        const updateRequest = store.put(conflict)

        updateRequest.onsuccess = () => {
          resolve()
        }

        updateRequest.onerror = () => {
          reject(updateRequest.error)
        }
      }

      getRequest.onerror = () => {
        reject(getRequest.error)
      }
    })
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    if (!this.db) await this.initialize()

    const stores = [
      this.STORES.SYNC_QUEUE,
      this.STORES.CACHED_DATA,
      this.STORES.CONFLICTS,
      this.STORES.OFFLINE_ACTIONS,
    ]

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(stores, 'readwrite')
      
      let clearedCount = 0
      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName)
        const request = store.clear()
        
        request.onsuccess = () => {
          clearedCount++
          if (clearedCount === stores.length) {
            resolve()
          }
        }
        
        request.onerror = () => {
          reject(request.error)
        }
      })
    })
  }

  async getStorageStats(): Promise<{
    syncQueueCount: number
    cachedDataCount: number
    conflictsCount: number
    offlineActionsCount: number
  }> {
    if (!this.db) await this.initialize()

    const counts = await Promise.all([
      this.getCount(this.STORES.SYNC_QUEUE),
      this.getCount(this.STORES.CACHED_DATA),
      this.getCount(this.STORES.CONFLICTS),
      this.getCount(this.STORES.OFFLINE_ACTIONS),
    ])

    return {
      syncQueueCount: counts[0],
      cachedDataCount: counts[1],
      conflictsCount: counts[2],
      offlineActionsCount: counts[3],
    }
  }

  private async getCount(storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.count()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }
}

// Singleton instance
let indexedDBService: IndexedDBService | null = null

export function getIndexedDBService(): IndexedDBService {
  if (!indexedDBService) {
    indexedDBService = new IndexedDBService()
  }
  return indexedDBService
}