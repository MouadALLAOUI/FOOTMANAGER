import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Phone, Shield, Sparkles, X, UserPlus } from 'lucide-react'
import { useMascotSettings, DEFAULT_MASCOT_SETTINGS } from '../../utils/mascotSettings'

export default function TopBanner({ theme = 'dark' }) {
  const settings = useMascotSettings()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem('aji_top_banner_dismissed') === '1') {
        setDismissed(true)
      }
    } catch {}
  }, [])

  const handleDismiss = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDismissed(true)
    try {
      sessionStorage.setItem('aji_top_banner_dismissed', '1')
    } catch {}
  }

  // If dismissed or disabled by Admin in MascotBannerManager
  if (dismissed || settings.banner_enabled === false) return null

  const isDark = theme === 'dark' || document.documentElement.classList.contains('dark')
  const bannerText = settings.banner_text || DEFAULT_MASCOT_SETTINGS.banner_text
  const playerBtnText = settings.banner_player_btn || DEFAULT_MASCOT_SETTINGS.banner_player_btn
  const managerBtnText = settings.banner_manager_btn || DEFAULT_MASCOT_SETTINGS.banner_manager_btn

  return (
    <aside
      aria-label="إعلان الملف الدائم"
      className={`relative z-50 w-full max-w-full overflow-hidden border-b transition-colors ${
        isDark
          ? 'bg-gradient-to-r from-[#064E3B] via-[#0F172A] to-[#064E3B] text-slate-100 border-emerald-500/30 shadow-md'
          : 'bg-gradient-to-r from-emerald-100 via-emerald-50 to-emerald-100 text-slate-900 border-emerald-300 shadow-xs'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2.5 px-3 py-2 text-xs font-bold sm:px-6 sm:py-2.5">
        {/* Right side in RTL: Sparkle Badge + Banner Text */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="hidden sm:grid size-6 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Sparkles className="size-3.5 text-amber-400 animate-pulse" />
          </span>

          <p className="truncate text-[11px] sm:text-xs font-black tracking-tight text-white">
            {bannerText}
          </p>
        </div>

        {/* Center / Action Buttons (Quick Register for Player / Manager) */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Quick Register Player (Phone Only) */}
          <Link
            to="/register?role=player"
            className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-2.5 py-1 text-[10px] sm:text-[11px] font-black text-white shadow-xs transition-all active:scale-95"
            title="تسجيل لاعب جديد برقم الهاتف فقط"
          >
            <Phone className="size-3 shrink-0" />
            <span className="truncate">{playerBtnText}</span>
          </Link>

          {/* Quick Register Manager (Manage Team) */}
          <Link
            to="/register?role=manager"
            className={`hidden xs:inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] sm:text-[11px] font-black transition-all active:scale-95 border ${
              isDark
                ? 'bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border-emerald-500/30'
                : 'bg-white hover:bg-slate-100 text-emerald-800 border-emerald-300'
            }`}
            title="تسجيل مسير لإدارة الفريق والمباريات"
          >
            <Shield className="size-3 shrink-0 text-emerald-400" />
            <span className="truncate">{managerBtnText}</span>
          </Link>
        </div>

        {/* Left side in RTL: Close / Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="إغلاق الإعلان"
          className={`grid size-6 shrink-0 place-items-center rounded-lg transition-colors cursor-pointer ${
            isDark
              ? 'text-slate-400 hover:bg-white/10 hover:text-white'
              : 'text-slate-500 hover:bg-emerald-200/60 hover:text-slate-900'
          }`}
        >
          <X className="size-3.5" />
        </button>
      </div>
    </aside>
  )
}
