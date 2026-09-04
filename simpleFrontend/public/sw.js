/* Web Push service worker — FootMANAGER */
const VERSION = 'footmanager-push-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (e) {
    payload = {}
  }

  const title = payload.title || 'FootMANAGER'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logo.jpeg',
    badge: payload.badge || '/logo.jpeg',
    dir: payload.dir || 'rtl',
    lang: payload.lang || 'ar',
    data: {
      url: payload.data && payload.data.url ? payload.data.url : '/',
      // keep any extra data for click routing
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
        // Focus an existing tab that can navigate to the target.
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client && client.url) {
            try {
              await client.navigate(targetUrl)
            } catch (e) {
              /* fall through */
            }
          }
          return
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl)
      }
    })(),
  )
})
