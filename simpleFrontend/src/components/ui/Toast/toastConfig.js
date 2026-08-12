export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
}

export const DEFAULT_DURATIONS = {
  [TOAST_TYPES.SUCCESS]: 4000,
  [TOAST_TYPES.INFO]: 4000,
  [TOAST_TYPES.WARNING]: 5000,
  [TOAST_TYPES.ERROR]: 6000,
}

export const PERSISTENT_DURATION = 0

export const MAX_VISIBLE_TOASTS = 3

export const TICK_INTERVAL = 100

export const LEAVE_DURATION = 220
