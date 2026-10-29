import { useState, useEffect } from 'react'
import { Smartphone, Download, X, CheckCircle } from 'lucide-react'
import {
  triggerPwaInstall,
  isStandalone,
  isBannerDismissed,
  dismissBanner,
} from './pwaHelper'

export default function PwaTopBanner({ theme = 'dark', onVisibilityChange }) {
  const [visible, setVisible] = useState(() => {
    try {
      return !isStandalone() && !isBannerDismissed()
    } catch {
      return false
    }
  })
  const [installedSuccess, setInstalledSuccess] = useState(false)

  useEffect(() => {
    // 1. If running in standalone mode (already installed), never show banner
    if (isStandalone()) {
      setVisible(false)
      onVisibilityChange?.(false)
      return
    }

    // 2. If user dismissed it within the last 14 days, do not show
    if (isBannerDismissed()) {
      setVisible(false)
      onVisibilityChange?.(false)
      return
    }

    // Otherwise show banner and notify parent that PWA banner is active
    setVisible(true)
    onVisibilityChange?.(true)

    // Listen for appinstalled event
    const handleInstalled = () => {
      setInstalledSuccess(true)
      setTimeout(() => {
        setVisible(false)
        setInstalledSuccess(false)
        onVisibilityChange?.(false)
      }, 4000)
    }

    window.addEventListener('aji_pwa_installed', handleInstalled)
    return () => {
      window.removeEventListener('aji_pwa_installed', handleInstalled)
    }
  }, [onVisibilityChange])

  const handleDismiss = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dismissBanner()
    setVisible(false)
    onVisibilityChange?.(false)
  }

  const handleInstall = async () => {
    await triggerPwaInstall()
  }

  if (!visible) return null

  // Success state immediately after installation
  if (installedSuccess) {
    return (
      <div
        role="status"
        className="relative z-[var(--z-sticky)] w-full border-b bg-emerald-600 text-white border-emerald-500 py-2 px-4 shadow-md transition-all animate-fade-in"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-xs font-black sm:text-sm">
          <CheckCircle className="size-4 shrink-0 text-white" />
          <span className="whitespace-nowrap">تم تثبيت التطبيق بنجاح! ⚽</span>
        </div>
      </div>
    )
  }

  return (
    <div
      aria-label="تثبيت التطبيق"
      className="relative z-[var(--z-sticky)] w-full border-b transition-colors shadow-xs bg-gradient-to-r from-[#064E3B] via-[#0A161E] to-[#064E3B] text-white border-emerald-500/30"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2 text-xs font-bold sm:px-6">
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Smartphone className="size-4" />
          </span>
          <p className="text-[11px] sm:text-xs font-extrabold text-white whitespace-nowrap">
            ثبّت أجي نقصرو على هاتفك
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3.5 py-1.5 text-[11px] font-black text-white shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Download className="size-3.5" />
            <span>ثبّت الآن</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            title="إغلاق لمدة 14 يوماً"
            aria-label="إغلاق شريط التثبيت لمدة 14 يوماً"
            className="grid size-7 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 cursor-pointer transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
