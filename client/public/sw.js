// Service Worker for Push Notifications and Background Sync
const CACHE_NAME = 'prontuario-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - dynamic caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // For navigation requests (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match('/') || caches.match(request);
        })
    );
    return;
  }

  // For assets (JS, CSS, etc.) - network first, then cache
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // For PWA essentials (manifest, icons) - cache first for performance
  if (url.pathname === '/manifest.json' ||
      url.pathname === '/favicon.ico' ||
      url.pathname.endsWith('.webmanifest')) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          return response || fetch(request).then(fetchResponse => {
            if (fetchResponse.ok) {
              const responseClone = fetchResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return fetchResponse;
          });
        })
    );
    return;
  }

  // For other requests, use cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(response => {
        return response || fetch(request).then(fetchResponse => {
          // Cache successful responses
          if (fetchResponse.ok) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'MPROTOCOLO',
    body: 'Nova notificação disponível',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'prontuario-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'dismiss',
        title: 'Dispensar'
      }
    ]
  };

  // Try to parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      console.log('Could not parse push data:', e);
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform enhanced background sync operations with sectors check
      syncDataWithSectorsCheck()
    );
  }
});

async function syncData() {
  try {
    console.log('Performing background sync...');

    // Send a message to the main thread to sync data
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        timestamp: Date.now()
      });
    });

    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
    throw error;
  }
}

// Periodic check for sectors data integrity
async function checkSectorsIntegrity() {
  try {
    console.log('Checking sectors integrity...');

    // Open IndexedDB and check if sectors exist
    const dbName = 'ProntuarioApp';
    const storeName = 'user';
    const sectorsKey = 'sectors';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => {
        console.log('Failed to open IndexedDB for sectors check');
        resolve(false);
      };

      request.onsuccess = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(storeName)) {
          console.log('User store does not exist, sectors need refresh');
          db.close();
          resolve(false);
          return;
        }

        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(sectorsKey);

        getRequest.onsuccess = () => {
          const sectorsData = getRequest.result;

          if (!sectorsData) {
            console.log('No sectors data found in cache, triggering refresh');
            db.close();
            resolve(false);
            return;
          }

          if (!sectorsData.sectors || !Array.isArray(sectorsData.sectors) || sectorsData.sectors.length === 0) {
            console.log('Sectors list is empty or invalid, triggering refresh');
            db.close();
            resolve(false);
            return;
          }

          // Check if sectors data is stale (older than 2 hours)
          const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
          const now = Date.now();
          const isStale = now - sectorsData.updatedAt > TWO_HOURS_MS;

          if (isStale) {
            console.log('Sectors data is stale, triggering refresh');
            db.close();
            resolve(false);
            return;
          }

          console.log(`Sectors integrity check passed: ${sectorsData.sectors.length} sectors found`);
          db.close();
          resolve(true);
        };

        getRequest.onerror = () => {
          console.log('Error reading sectors from cache');
          db.close();
          resolve(false);
        };
      };
    });
  } catch (error) {
    console.error('Error during sectors integrity check:', error);
    return false;
  }
}

// Enhanced sync data function with sectors check
async function syncDataWithSectorsCheck() {
  try {
    console.log('Performing enhanced background sync with sectors check...');

    // Check sectors integrity first
    const sectorsOk = await checkSectorsIntegrity();

    // Send a message to the main thread to sync data
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        timestamp: Date.now(),
        sectorsNeedRefresh: !sectorsOk
      });
    });

    console.log('Enhanced background sync completed', { sectorsOk });
  } catch (error) {
    console.error('Enhanced background sync failed:', error);
    throw error;
  }
}

// Periodic sectors check - runs every 5 minutes
setInterval(async () => {
  try {
    const sectorsOk = await checkSectorsIntegrity();

    if (!sectorsOk) {
      console.log('Periodic check: Sectors need refresh, notifying app...');

      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SECTORS_INTEGRITY_CHECK',
          sectorsNeedRefresh: true,
          timestamp: Date.now()
        });
      });
    }
  } catch (error) {
    console.error('Periodic sectors check failed:', error);
  }
}, 5 * 60 * 1000); // Every 5 minutes

// Page visibility change event - check sectors when user returns to tab
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PAGE_VISIBLE') {
    console.log('Page became visible, checking sectors integrity...');

    // Check sectors integrity when page becomes visible
    checkSectorsIntegrity().then(sectorsOk => {
      if (!sectorsOk) {
        console.log('Page visible check: Sectors need refresh');

        // Notify the main thread
        event.source.postMessage({
          type: 'SECTORS_INTEGRITY_CHECK',
          sectorsNeedRefresh: true,
          timestamp: Date.now(),
          trigger: 'page-visible'
        });
      }
    }).catch(error => {
      console.error('Page visible sectors check failed:', error);
    });
  }
});
