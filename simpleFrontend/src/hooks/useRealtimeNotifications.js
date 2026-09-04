import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { connectRealtime, disconnectRealtime } from '../lib/realtime'
import { queryClient } from '../api/queryClient'
import { toast } from '../components/ui/Toast/toastStore'

function invalidateNotifications() {
  queryClient.invalidateQueries({ queryKey: ['notifications'] })
}

function maybeToast(payload) {
  if (!payload || !payload.title) return
  const important = payload.is_important === true
  toast.show({
    type: important ? 'warning' : 'info',
    title: payload.title,
    message: payload.body || '',
    duration: important ? 0 : undefined,
  })
}

/**
 * Mount once (in the app shell) while a user is logged in: opens a Reverb
 * WebSocket channel for the current user and turns incoming notifications
 * into a live toast + a background refresh of the notifications queries.
 * Auto-reconnects (Echo) and re-syncs the list after any reconnect so nothing
 * is missed while the tab was sleeping / the network was down.
 */
export function useRealtimeNotifications() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  useEffect(() => {
    if (userId == null) {
      disconnectRealtime()
      return undefined
    }

    const disposer = connectRealtime({
      onNotification(payload) {
        maybeToast(payload)
        invalidateNotifications()
      },
      onReconnected() {
        invalidateNotifications()
      },
    })

    return () => {
      disposer()
      disconnectRealtime()
    }
  }, [userId])
}