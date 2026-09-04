import api from '../api/client'

export function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function isStandalonePWA() {
  return window.matchMedia('(display-mode: standalone)').matches
}

/**
 * iOS Safari can only receive web push from a home-screen-installed PWA.
 */
export function isIOSNeedsHomeScreen() {
  return isIOS() && !isStandalonePWA()
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function getVapidPublicKey() {
  // Prefer a build-time public key, fall back to the backend endpoint.
  if (import.meta.env.VITE_VAPID_PUBLIC_KEY) {
    return import.meta.env.VITE_VAPID_PUBLIC_KEY
  }
  const res = await api.get('/push/public-key')
  return res.data.public_key
}

/**
 * true  -> Notification.permission === 'granted'
 * false -> 'denied'
 * null  -> 'default' (not asked yet)
 */
export function permissionState() {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return null
}

async function getPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

/**
 * Subscribe the current browser to web push and persist it on the backend.
 * Returns the stored subscription, or null if not supported / denied / iOS-tab.
 */
export async function enableNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, reason: 'unsupported' }
  }

  if (isIOSNeedsHomeScreen()) {
    return { ok: false, reason: 'ios-home-screen' }
  }

  if (Notification.permission === 'denied') {
    return { ok: false, reason: 'denied' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: permission === 'denied' ? 'denied' : 'default' }
  }

  await navigator.serviceWorker.register('/sw.js')

  const publicKey = await getVapidPublicKey()
  const registration = await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  const body = {
    endpoint: subscription.endpoint,
    keys: subscription.toJSON().keys || {},
    content_encoding: 'aes128gcm',
  }

  const res = await api.post('/push-subscriptions', body)
  return { ok: true, subscription: res.data.subscription }
}

export async function disableNotifications() {
  const subscription = await getPushSubscription()
  if (subscription) {
    try {
      await subscription.unsubscribe()
    } catch {
      /* ignore */
    }
  }
  if (subscription) {
    try {
      await api.delete('/push-subscriptions', { data: { endpoint: subscription.endpoint } })
    } catch {
      /* the backend cleans up stale subs; ignore */
    }
  }
}

/**
 * Best-effort sync on app load: if the browser already has a push subscription
 * that isn't stored on the backend, persist it (e.g. after re-login).
 */
export async function syncSubscription() {
  try {
    const subscription = await getPushSubscription()
    if (!subscription) return null
    await api.post('/push-subscriptions', {
      endpoint: subscription.endpoint,
      keys: subscription.toJSON().keys || {},
      content_encoding: 'aes128gcm',
    })
    return subscription
  } catch {
    return null
  }
}
