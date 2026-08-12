import { useSyncExternalStore } from 'react'
import { LEAVE_DURATION, MAX_VISIBLE_TOASTS, TICK_INTERVAL } from './toastConfig'
import { normalizeToast } from './toastUtils'

let toasts = []
const listeners = new Set()
const leaveTimers = new Map()
let tickId = null

function getSnapshot() {
  return toasts
}

function subscribe(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit() {
  for (const listener of [...listeners]) listener()
}

function replace(next) {
  toasts = next
  emit()
}

function isTickable(t) {
  return !t.persistent && !t.paused && !t.leaving
}

function anyTickable() {
  return toasts.some(isTickable)
}

function ensureTick() {
  if (tickId == null) tickId = setInterval(tick, TICK_INTERVAL)
}

function stopTick() {
  if (tickId != null) {
    clearInterval(tickId)
    tickId = null
  }
}

function clearLeaveTimer(id) {
  const timer = leaveTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    leaveTimers.delete(id)
  }
}

function scheduleLeave(id) {
  if (leaveTimers.has(id)) return
  leaveTimers.set(
    id,
    setTimeout(() => remove(id), LEAVE_DURATION),
  )
}

function tick() {
  const now = Date.now()
  const next = toasts.map((t) => {
    if (!isTickable(t)) return t
    if (t.deadline <= now) {
      scheduleLeave(t.id)
      return { ...t, leaving: true, remaining: 0 }
    }
    return { ...t, remaining: t.deadline - now }
  })
  replace(next)
  if (!anyTickable()) stopTick()
}

function remove(id) {
  clearLeaveTimer(id)
  const index = toasts.findIndex((t) => t.id === id)
  if (index === -1) return
  replace(toasts.filter((t) => t.id !== id))
  if (!anyTickable()) stopTick()
}

function show(type, input, options) {
  const toast = normalizeToast(type, input, options)
  let next
  if (toasts.length >= MAX_VISIBLE_TOASTS) {
    clearLeaveTimer(toasts[0].id)
    next = [...toasts.slice(1), toast]
  } else {
    next = [...toasts, toast]
  }
  replace(next)
  ensureTick()
  return toast.id
}

function dismiss(id) {
  const target = toasts.find((t) => t.id === id)
  if (!target || target.leaving) return
  replace(toasts.map((t) => (t.id === id ? { ...t, leaving: true, paused: true } : t)))
  scheduleLeave(id)
}

function dismissAll() {
  if (!toasts.length) return
  for (const t of toasts) scheduleLeave(t.id)
  replace(toasts.map((t) => ({ ...t, leaving: true, paused: true })))
}

function pause(id) {
  let changed = false
  const next = toasts.map((t) => {
    if (t.id !== id || !isTickable(t)) return t
    changed = true
    return { ...t, paused: true, remaining: Math.max(0, t.deadline - Date.now()) }
  })
  if (!changed) return
  replace(next)
  if (!anyTickable()) stopTick()
}

function resume(id) {
  let changed = false
  const next = toasts.map((t) => {
    if (t.id !== id || !t.paused || t.leaving || t.persistent) return t
    changed = true
    return { ...t, paused: false, deadline: Date.now() + t.remaining }
  })
  if (!changed) return
  replace(next)
  ensureTick()
}

export const toast = {
  success: (message, options) => show('success', message, options),
  error: (message, options) => show('error', message, options),
  warning: (message, options) => show('warning', message, options),
  info: (message, options) => show('info', message, options),
  show: (input) => show(input?.type || 'info', input, undefined),
  dismiss,
  dismissAll,
}

export function dismissToast(id) {
  dismiss(id)
}

export function dismissAllToasts() {
  dismissAll()
}

export function pauseToast(id) {
  pause(id)
}

export function resumeToast(id) {
  resume(id)
}

export function useToasts() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useToast() {
  return { toast }
}
