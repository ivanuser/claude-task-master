// Service Worker for Task Master Dashboard
// Handles background sync, offline caching, and push notifications

const CACHE_NAME = 'task-master-v1'
const SYNC_TAG = 'task-master-sync'
const API_CACHE = 'task-master-api-v1'

// URLs to cache for offline access
const STATIC_CACHE_URLS = [
  '/',
  '/dashboard',
  '/projects',
  '/tasks',
  '/settings',
  '/manifest.json',
  '/offline.html',
]

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching static assets')
      return cache.addAll(STATIC_CACHE_URLS).catch((error) => {
        console.error('[ServiceWorker] Failed to cache static assets:', error)
      })
    })
  )
  
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== API_CACHE
          })
          .map((cacheName) => {
            console.log('[ServiceWorker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          })
      )
    })
  )
  
  self.clients.claim()
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle API requests differently
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // For navigation requests, use network-first strategy
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Serve from cache or offline page
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/offline.html')
          })
        })
    )
    return
  }

  // For other requests, use cache-first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(request).then((response) => {
        // Don't cache non-ok responses
        if (!response.ok) {
          return response
        }

        // Cache successful responses
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone)
        })

        return response
      })
    })
  )
})

// Handle API requests with offline queue
async function handleApiRequest(request) {
  try {
    const response = await fetch(request.clone())
    
    // Cache successful GET requests
    if (request.method === 'GET' && response.ok) {
      const responseClone = response.clone()
      const cache = await caches.open(API_CACHE)
      await cache.put(request, responseClone)
    }
    
    return response
  } catch (error) {
    // If offline, return cached response for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        console.log('[ServiceWorker] Serving API response from cache:', request.url)
        return cachedResponse
      }
    }
    
    // For non-GET requests, queue for background sync
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
      await queueRequest(request)
      
      // Return a response indicating the request was queued
      return new Response(
        JSON.stringify({
          queued: true,
          message: 'Request queued for sync when online',
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    
    // Return error response
    return new Response(
      JSON.stringify({
        error: 'Network request failed and no cache available',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// Queue request for background sync
async function queueRequest(request) {
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text(),
    timestamp: new Date().toISOString(),
  }
  
  // Store in IndexedDB for persistence
  const db = await openSyncDatabase()
  const tx = db.transaction(['sync-queue'], 'readwrite')
  const store = tx.objectStore('sync-queue')
  await store.add(requestData)
  
  // Register for background sync
  if ('sync' in self.registration) {
    await self.registration.sync.register(SYNC_TAG)
    console.log('[ServiceWorker] Background sync registered')
  }
}

// Open IndexedDB for sync queue
function openSyncDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TaskMasterSyncDB', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('sync-queue')) {
        const store = db.createObjectStore('sync-queue', { 
          keyPath: 'id', 
          autoIncrement: true 
        })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync triggered:', event.tag)
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processSyncQueue())
  }
})

// Process queued requests
async function processSyncQueue() {
  const db = await openSyncDatabase()
  const tx = db.transaction(['sync-queue'], 'readwrite')
  const store = tx.objectStore('sync-queue')
  const requests = await store.getAll()
  
  console.log(`[ServiceWorker] Processing ${requests.length} queued requests`)
  
  for (const requestData of requests) {
    try {
      const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body || undefined,
      })
      
      if (response.ok) {
        // Remove from queue on success
        await store.delete(requestData.id)
        console.log('[ServiceWorker] Synced request:', requestData.url)
        
        // Notify clients of successful sync
        await notifyClients('sync-success', {
          url: requestData.url,
          method: requestData.method,
        })
      } else {
        console.error('[ServiceWorker] Sync failed:', response.status)
      }
    } catch (error) {
      console.error('[ServiceWorker] Sync error:', error)
      // Keep in queue for retry
    }
  }
}

// Notify all clients of an event
async function notifyClients(type, data) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  
  clients.forEach((client) => {
    client.postMessage({
      type: type,
      data: data,
      timestamp: new Date().toISOString(),
    })
  })
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received')
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Task Master',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      timestamp: new Date().toISOString(),
      url: '/',
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' },
    ],
  }
  
  event.waitUntil(
    self.registration.showNotification('Task Master', options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.action)
  
  event.notification.close()
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    )
  }
})

// Message event for client communication
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data)
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  } else if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
      })
    )
  } else if (event.data.type === 'SYNC_NOW') {
    event.waitUntil(processSyncQueue())
  }
})

console.log('[ServiceWorker] Loaded')