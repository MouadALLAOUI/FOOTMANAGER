import { useEffect, useState } from 'react'
import api from '../api/client'
import {
  disableNotifications,
  enableNotifications,
  isIOSNeedsHomeScreen,
  permissionState,
  syncSubscription,
} from '../lib/push'

const supported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

/**
 * Manage browser push subscription state for the current device.
 * Role-agnostic: used by any logged-in user (manager, committee, terrain
 * owner, player, admin/sub_admin).
 */
export function useWebPush() {
  const [permission, setPermission] = useState(() => (supported ? permissionState() : false))
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [needsIOSHomeScreen, setNeedsIOSHomeScreen] = useState(() => (supported ? isIOSNeedsHomeScreen() : false))

  // One-time sync on mount (register SW + persist any existing subscription).
  useEffect(() => {
    if (!supported) return
    let cancelled = false

    const bootstrap = async () => {
      try {
        if ('serviceWorker' in navigator) {
          await navigator.serviceWorker.register('/sw.js')
        }
        if (!cancelled) setPermission(permissionState())
        const sub = await syncSubscription()
        if (!cancelled) setSubscribed(Boolean(sub))
      } catch {
        /* ignore */
      }
    }
    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const enable = async () => {
    if (!supported || busy) return { ok: false }
    setBusy(true)
    try {
      const result = await enableNotifications()
      setPermission(permissionState())
      setSubscribed(result.ok)
      if (!result.ok && result.reason === 'ios-home-screen') setNeedsIOSHomeScreen(true)
      return result
    } catch (err) {
      setSubscribed(false)
      return { ok: false, reason: 'error', error: String(err?.message || err) }
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    if (!supported || busy) return
    setBusy(true)
    try {
      await disableNotifications()
      setSubscribed(false)
      setPermission(permissionState())
    } catch (err) {
      return { ok: false, reason: 'error', error: String(err?.message || err) }
    } finally {
      setBusy(false)
    }
  }

  const sendTest = async () => {
    if (!supported || busy || !subscribed) return { ok: false, reason: 'not-subscribed' }
    setBusy(true)
    try {
      const res = await api.post('/push-subscriptions/test')
      return { ok: res.data?.sent === true, ...(res.data || {}) }
    } catch (err) {
      return {
        ok: false,
        reason: 'error',
        message: err?.response?.data?.message || String(err?.message || err),
      }
    } finally {
      setBusy(false)
    }
  }

  return {
    supported,
    permission, // true granted / false denied / null default
    subscribed,
    busy,
    needsIOSHomeScreen,
    enable,
    disable,
    sendTest,
  }
}
