import { DEFAULT_DURATIONS, PERSISTENT_DURATION } from './toastConfig'

let counter = 0

export function createToastId() {
  counter += 1
  return `toast-${Date.now().toString(36)}-${counter}`
}

export function normalizeDuration(type, duration) {
  if (duration === undefined || duration === null) {
    return DEFAULT_DURATIONS[type] ?? DEFAULT_DURATIONS.info
  }
  if (!Number.isFinite(duration) || duration < 0) {
    return DEFAULT_DURATIONS[type] ?? DEFAULT_DURATIONS.info
  }
  return Math.round(duration)
}

export function normalizeToast(type, input, options) {
  const source = typeof input === 'string' ? { message: input } : input || {}
  const merged = { ...source, ...(options || {}) }
  const resolvedType = merged.type || type
  const duration = normalizeDuration(resolvedType, merged.duration)
  const persistent = duration === PERSISTENT_DURATION

  return {
    id: createToastId(),
    type: resolvedType,
    title: merged.title,
    message: merged.message,
    closable: merged.closable !== false,
    duration,
    totalDuration: persistent ? 0 : duration,
    remaining: persistent ? 0 : duration,
    deadline: persistent ? 0 : Date.now() + duration,
    paused: false,
    leaving: false,
    persistent,
  }
}
