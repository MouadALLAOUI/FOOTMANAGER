const KEY = 'pendingAction'

export function rememberAction(action) {
  sessionStorage.setItem(KEY, JSON.stringify(action))
}

export function consumeAction() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    sessionStorage.removeItem(KEY)
    return JSON.parse(raw)
  } catch {
    sessionStorage.removeItem(KEY)
    return null
  }
}
