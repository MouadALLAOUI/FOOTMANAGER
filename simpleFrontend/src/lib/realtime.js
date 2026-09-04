import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

const cfg = {
  key: import.meta.env.VITE_REVERB_APP_KEY || 'footmanager-key',
  host: import.meta.env.VITE_REVERB_HOST || (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, ''),
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
}

let echo = null
let listeners = new Set()

function notifyKind(kind) {
  for (const fn of listeners) {
    try {
      fn(kind)
    } catch {
      /* ignore */
    }
  }
}

function baseUrl() {
  return (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '')
}

function token() {
  return localStorage.getItem('auth_token') || ''
}

function makeEcho() {
  return new Echo({
    broadcaster: 'pusher',
    key: cfg.key,
    cluster: '',
    wsHost: cfg.host,
    wsPort: cfg.forceTLS ? 443 : 8080,
    wssPort: 443,
    forceTLS: cfg.forceTLS,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${baseUrl()}/broadcasting/auth`,
    auth: {
      headers: {},
    },
    authTransport: 'ajax',
  })
}

function authHeader(echoInstance) {
  echoInstance.connector.pusher.config.auth = {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  }
}

/**
 * Connect Echo to Reverb for the current user's private channel.
 * Returns a dispose function. Only one connection should be active at a time.
 */
export function connectRealtime({ onNotification, onReconnected }) {
  if (echo) {
    // Another instance is active; surface reconnection synchronously.
    notifyKind('reconnected')
    return () => {}
  }

  echo = makeEcho()
  authHeader(echo)

  const userId = (() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || 'null')?.id
    } catch {
      return null
    }
  })()

  if (userId == null) {
    disconnectRealtime()
    return () => {}
  }

  const channel = echo.private(`App.Models.User.${userId}`)

  channel.listen('.notification.created', (payload) => {
    if (onNotification) onNotification(payload)
  })

  channel.subscribed(() => {
    notifyKind('subscribed')
  })

  echo.connector.pusher.connection.bind('connected', () => {
    notifyKind('connected')
  })

  echo.connector.pusher.connection.bind('reconnected', () => {
    notifyKind('reconnected')
    if (onReconnected) onReconnected()
  })

  return () => {
    disconnectRealtime()
  }
}

export function disconnectRealtime() {
  if (echo) {
    try {
      echo.disconnect()
    } catch {
      /* ignore */
    }
  }
  echo = null
}

export function onRealtimeStatus(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}