// PWA helper and event management for FootMANAGER / Aji Nqssro

let deferredInstallPrompt = null
let waitingWorkerInstance = null

const DISMISS_KEY = 'aji_pwa_banner_dismissed_until'
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    (typeof document !== 'undefined' && document.referrer.includes('android-app://'))
  )
}

export function isBannerDismissed() {
  if (typeof window === 'undefined') return false
  try {
    const until = localStorage.getItem(DISMISS_KEY)
    if (!until) return false
    return Number(until) > Date.now()
  } catch {
    return false
  }
}

export function dismissBanner() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + FOURTEEN_DAYS_MS))
  } catch (err) {
    console.warn('Could not save dismissal state:', err)
  }
}

export function getInstallPrompt() {
  return deferredInstallPrompt
}

if (typeof window !== 'undefined') {
  // Capture beforeinstallprompt (Android / Chrome / Edge)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredInstallPrompt = e
    window.dispatchEvent(new CustomEvent('aji_pwa_ready'))
  })

  // Capture successful installation
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null
    dismissBanner()
    window.dispatchEvent(new CustomEvent('aji_pwa_installed'))
  })
}

export async function triggerPwaInstall() {
  if (isStandalone()) {
    return true
  }

  if (deferredInstallPrompt) {
    try {
      await deferredInstallPrompt.prompt()
      const choice = await deferredInstallPrompt.userChoice
      if (choice && choice.outcome === 'accepted') {
        deferredInstallPrompt = null
        window.dispatchEvent(new CustomEvent('aji_pwa_installed'))
        return true
      }
    } catch (err) {
      console.warn('PWA install prompt failed', err)
    }
  }

  // Fallback for iOS / Safari or when prompt is not directly available
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aji_show_pwa_modal'))
  }
  return false
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (!registration) return
        // Check if an update is already waiting
        if (registration.waiting) {
          waitingWorkerInstance = registration.waiting
          window.dispatchEvent(
            new CustomEvent('aji_pwa_update_available', {
              detail: { waitingWorker: registration.waiting },
            })
          )
        }

        // Listen for new updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorkerInstance = newWorker
              window.dispatchEvent(
                new CustomEvent('aji_pwa_update_available', {
                  detail: { waitingWorker: newWorker },
                })
              )
            }
          })
        })
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err)
      })
  })

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    const path = window.location.pathname
    // Do not force reload during booking or payment process
    const isBookingActive = /booking|reservation|payment/i.test(path)
    if (!isBookingActive) {
      refreshing = true
      window.location.reload()
    }
  })
}

export function applyPwaUpdate(worker = null) {
  const targetWorker = worker || waitingWorkerInstance
  if (targetWorker) {
    targetWorker.postMessage({ type: 'SKIP_WAITING' })
  }
}
