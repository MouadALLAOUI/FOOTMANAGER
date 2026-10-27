import { useState, useEffect } from 'react'

export const DEFAULT_MASCOT_SETTINGS = {
  banner_enabled: true,
  banner_text: 'سجّل ملفك الدائم كلاعب أو فريق مجاناً - مشوارك الكروي كله في مكان واحد ⚽',
  banner_player_btn: 'سجّل كلاعب (برقم الهاتف)',
  banner_manager_btn: 'سجّل كمسير فريق',
  mascot_enabled: true,
  mascot_message: 'سجّل ملفك الدائم كلاعب أو فريق مجاناً - مشوارك الكروي كله في مكان واحد ⚽',
  mascot_subtext: 'مشوارك الكروي، إحصائياتك ومبارياتك كلها في منصة واحدة وبأداء احترافي!',
}

const STORAGE_KEY = 'aji_mascot_banner_settings'

export function getMascotSettings() {
  if (typeof window === 'undefined') return DEFAULT_MASCOT_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_MASCOT_SETTINGS
    return { ...DEFAULT_MASCOT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_MASCOT_SETTINGS
  }
}

export function saveMascotSettings(settings) {
  if (typeof window === 'undefined') return
  try {
    const merged = { ...getMascotSettings(), ...settings }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    window.dispatchEvent(new CustomEvent('mascot_settings_updated', { detail: merged }))
    return merged
  } catch {
    return settings
  }
}

export function useMascotSettings() {
  const [settings, setSettings] = useState(getMascotSettings)

  useEffect(() => {
    const handler = (e) => {
      if (e?.detail) {
        setSettings(e.detail)
      } else {
        setSettings(getMascotSettings())
      }
    }
    window.addEventListener('mascot_settings_updated', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('mascot_settings_updated', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  return settings
}
