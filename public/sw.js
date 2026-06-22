const CACHE_NAME = 'tan-hung-he-2026-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/public/manifest.json'
];

// Installs and caches structural base resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Intelligent precaching of core assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Cleans up any mismatched previous caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheKeys => {
      return Promise.all(
        cacheKeys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache bundle:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Main interceptor to serve resources from cache or fetch with smart strategies
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Focus only on GET requests bypass others
  if (request.method !== 'GET') {
    return;
  }

  // Define strategy for HTML files and root path (Network-First then fallback to cache)
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // Put the fresh HTML in the cache
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, cacheCopy);
          });
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // Strategy for Images (both local, dynamic base64, or external Unsplash, cloud assets)
  // We use Cache-First, falling back to network and updating cache.
  const isImage = request.destination === 'image' || 
                  url.hostname.includes('unsplash.com') || 
                  url.hostname.includes('images.unsplash.com') ||
                  url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i);

  if (isImage) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          // Serve from cache but fetch fresh image in background to update cache (Stale-while-revalidate)
          fetch(request).then(networkResponse => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => {/* Ignore background error */});
          return cachedResponse;
        }

        // If not in cache, fetch from network and save to cache
        return fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, cacheCopy);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Return placeholder if offline and image not cached
          return caches.match('/favicon.ico');
        });
      })
    );
    return;
  }

  // Strategy for external fonts (Google Fonts) and stylesheets, scripts
  if (url.hostname.includes('fonts.googleapis.com') || 
      url.hostname.includes('fonts.gstatic.com') || 
      request.destination === 'font' || 
      request.destination === 'style' || 
      request.destination === 'script') {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        const fetchPromise = fetch(request).then(networkResponse => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => {
          return null;
        });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Standard Stale-While-Revalidate for other local static assets
  if (request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        const fetchPromise = fetch(request).then(networkResponse => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => {
          console.warn('[Service Worker] Offline fallback for origin resource:', url.pathname);
        });

        return cachedResponse || fetchPromise;
      })
    );
  }
});

/* ==========================================================================
   ROBUST PWA BACKGROUND SYNC SYSTEM WITH INDEXEDDB
   Allows kids' and volunteers' attendance submissions to be safely queued
   offline, automatically syncing with the central database on network recovery.
   ========================================================================== */

function openDatabase() {
  return new Promise((resolve, reject) => {
    // Open or create the IndexedDB store
    const request = indexedDB.open('attendance-sync-db', 1);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getQueue() {
  return openDatabase().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('queue', 'readonly');
      const store = tx.objectStore('queue');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

function removeFromQueue(id) {
  return openDatabase().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('queue', 'readwrite');
      const store = tx.objectStore('queue');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

async function syncQueue() {
  try {
    const records = await getQueue();
    if (!records || records.length === 0) {
      console.log('[Background Sync] No offline records to sync.');
      return;
    }
    
    console.log(`[Background Sync] Processing ${records.length} queued records...`);
    for (const record of records) {
      try {
        const destEndpoint = record.endpoint || '/api/register-attendance';
        const response = await fetch(destEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ record: record.data })
        });
        
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success) {
            await removeFromQueue(record.id);
            console.log('[Background Sync] Successfully synced record with ' + destEndpoint + ':', record.id);
          } else {
            console.warn('[Background Sync] Server returned failure for record:', record.id, resJson.error);
          }
        } else {
          console.warn('[Background Sync] Network returned bad status for record:', record.id, response.status);
          break; // Stop and retry later if server is down or erroring
        }
      } catch (err) {
        console.error('[Background Sync] Fetch failed for record:', record.id, err);
        break; // Network issue, retry on next sync trigger
      }
    }
  } catch (err) {
    console.error('[Background Sync] Queue processing threw an error:', err);
  }
}

// Background Sync Listener
self.addEventListener('sync', event => {
  if (event.tag === 'sync-attendance') {
    console.log('[Service Worker] Sync event triggered:', event.tag);
    event.waitUntil(syncQueue());
  }
});

// Sync Fallback triggered directly via client postMessage
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SYNC_NOW') {
    console.log('[Service Worker] Manual sync message triggered');
    event.waitUntil(syncQueue());
  }
});

