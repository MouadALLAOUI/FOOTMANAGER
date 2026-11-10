/* Service Worker — أجي نقصرو (Aji Nqssro) PWA & Push Notifications */

const CACHE_VERSION = 'aji-v1.0.1'
const STATIC_CACHE_NAME = `aji-static-${CACHE_VERSION}`
const IMAGE_CACHE_NAME = `aji-images-${CACHE_VERSION}`
const DYNAMIC_CACHE_NAME = `aji-dynamic-${CACHE_VERSION}`

const MAX_IMAGE_ITEMS = 60
const NETWORK_TIMEOUT_MS = 4000 // 4 seconds timeout for API/Pages

// Core App Shell assets to precache immediately
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png',
  '/logo.jpeg',
  '/hero-morocco-800w.webp'
]

// Patterns that MUST NEVER be cached
const NEVER_CACHE_PATTERNS = [
  /\/login/i,
  /\/register/i,
  /\/api\/login/i,
  /\/api\/register/i,
  /\/api\/logout/i,
  /\/sanctum\/csrf-cookie/i,
  /\/api\/user/i,
  /\/api\/me/i,
  /\/dashboard/i,
  /\/admin/i,
  /\/committee/i,
  /\/booking/i,
  /\/payment/i,
  /\/notifications\/unread-count/i,
  /\/api\/genie/i
]

function shouldNeverCache(url, method, request) {
  if (method !== 'GET') return true
  if (request && request.headers && request.headers.has('Authorization')) return true
  if (/\/api\//i.test(url)) return true
  return NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(url))
}

// Trim cache to maximum items
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    if (keys.length > maxItems) {
      await cache.delete(keys[0])
      await trimCache(cacheName, maxItems)
    }
  } catch (err) {
    console.warn('[SW] trimCache error:', err)
  }
}

// 1. Install event: Precache core static shell
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_ASSETS)
      } catch (err) {
        console.warn('[SW] Precache failed for some assets:', err)
      }
    })
  )
})

// 2. Activate event: Clean up previous cache versions & claim clients
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE_NAME, IMAGE_CACHE_NAME, DYNAMIC_CACHE_NAME]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!currentCaches.includes(name)) {
            return caches.delete(name)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// 3. Message event: Allow client to trigger skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// 4. Fetch event: StaleWhileRevalidate for images, NetworkFirst (4s timeout) for pages
self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  // Disregard non-HTTP/HTTPS schemes (e.g., chrome-extension://)
  if (!url.protocol.startsWith('http')) return

  // Disregard mutations, authenticated requests, API endpoints, and sensitive paths
  if (shouldNeverCache(url.pathname, request.method, request)) {
    return
  }

  // Handle Images (StaleWhileRevalidate)
  const isImage =
    request.destination === 'image' ||
    /\.(png|jpg|jpeg|svg|webp|gif|ico)(\?.*)?$/i.test(url.pathname)

  if (isImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request)

        const fetchPromise = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              await cache.put(request, networkResponse.clone())
              trimCache(IMAGE_CACHE_NAME, MAX_IMAGE_ITEMS)
            }
            return networkResponse
          })
          .catch(() => null)

        return cachedResponse || fetchPromise
      })
    )
    return
  }

  // Handle HTML Page Navigations and public GET Requests: NetworkFirst with safe 4s cache fallback
  const isNavigate = request.mode === 'navigate' || request.destination === 'document'

  event.respondWith(
    new Promise((resolve) => {
      let settled = false
      const settle = (res) => {
        if (settled) return
        settled = true
        clearTimeout(timeoutId)
        resolve(res)
      }

      // 4-second timeout timer: resolve early ONLY if a cached/offline fallback exists
      const timeoutId = setTimeout(async () => {
        try {
          const cached = await caches.match(request)
          if (cached) {
            settle(cached)
            return
          }
          if (isNavigate) {
            const offlinePage = await caches.match('/offline.html')
            if (offlinePage) {
              settle(offlinePage)
            }
          }
        } catch {
          // Ignore cache lookup failures and let network request finish
        }
      }, NETWORK_TIMEOUT_MS)

      fetch(request)
        .then((networkResponse) => {
          const clone = networkResponse && networkResponse.status === 200 ? networkResponse.clone() : null
          settle(networkResponse)
          if (clone) {
            caches
              .open(DYNAMIC_CACHE_NAME)
              .then((cache) => cache.put(request, clone))
              .catch(() => {})
          }
        })
        .catch(async () => {
          try {
            const cached = await caches.match(request)
            if (cached) {
              settle(cached)
              return
            }
            if (isNavigate) {
              const offlinePage = await caches.match('/offline.html')
              if (offlinePage) {
                settle(offlinePage)
                return
              }
            }
          } catch {
            // Ignore cache lookup failures
          }
          settle(new Response('Network error occurred', { status: 503, statusText: 'Offline' }))
        })
    })
  )
})

// 5. Push Notifications Support (preserved for stage 4 web push)
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (e) {
    payload = {}
  }

  const title = payload.title || 'أجي نقصرو'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    dir: payload.dir || 'rtl',
    lang: payload.lang || 'ar',
    data: {
      url: payload.data && payload.data.url ? payload.data.url : '/',
      payload: payload.data ? payload.data : {},
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client && client.url) {
            try {
              await client.navigate(targetUrl)
            } catch (e) {}
          }
          return
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl)
      }
    })()
  )
})
